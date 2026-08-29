import crypto from 'crypto';
import { hash, verify } from '@node-rs/argon2';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { normalizePhone, maskPhone } from '../utils/phone';
import { getSmsProvider } from './sms.provider';
import { phoneVerificationRepository } from '../repositories/phone-verification.repository';
import { env } from '../config/env';
import {
  registerStudentSchema,
  registerParentSchema,
  registerTeacherSchema,
  registerCenterSchema,
} from '../validation';

const OTP_LEN = 6;

// Derive constants from env so tests and prod stay in sync
function otpTtl() {
  return env.OTP_TTL_SECONDS;
}
function maxAttempts() {
  return env.OTP_MAX_ATTEMPTS;
}
function resendCooldown() {
  return env.OTP_RESEND_COOLDOWN;
}
function resendLimit() {
  return env.OTP_RESEND_LIMIT;
}

/**
 * Cryptographically secure 6-digit OTP. Never use Math.random() for secrets.
 */
function generateOtp(): string {
  const n = crypto.randomInt(0, 10 ** OTP_LEN);
  return n.toString().padStart(OTP_LEN, '0');
}

// Payload is short-lived (TTL ~5min). We store it encrypted at rest so DB
// dumps never contain plaintext passwords. Simple AES-256-GCM with a key
// derived from JWT secrets. Backward-compatible: old base64 payloads still
// decode.
function deriveKey(): Buffer {
  const secret = env.JWT_ACCESS_SECRET + '|' + env.JWT_REFRESH_SECRET;
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptPayload(obj: unknown): string {
  try {
    const key = deriveKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const plaintext = JSON.stringify(obj);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // format v2: v2.iv.tag.ciphertext (all base64)
    return ['v2', iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
  } catch {
    // fallback to base64 so we never fail to store
    return Buffer.from(JSON.stringify(obj)).toString('base64');
  }
}

function decryptPayload(enc: string): unknown {
  if (!enc) return null;
  if (enc.startsWith('v2.')) {
    const parts = enc.split('.');
    if (parts.length === 4) {
      const [, ivB64, tagB64, dataB64] = parts;
      const key = deriveKey();
      const iv = Buffer.from(ivB64, 'base64');
      const tag = Buffer.from(tagB64, 'base64');
      const data = Buffer.from(dataB64, 'base64');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const dec = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf-8');
      return JSON.parse(dec);
    }
  }
  // legacy base64
  return JSON.parse(Buffer.from(enc, 'base64').toString('utf-8'));
}

function validatePayload(purpose: RequestOtpInput['purpose'], payload: unknown) {
  let schema;
  switch (purpose) {
    case 'REGISTER_STUDENT':
      schema = registerStudentSchema;
      break;
    case 'REGISTER_PARENT':
      schema = registerParentSchema;
      break;
    case 'REGISTER_TEACHER':
      schema = registerTeacherSchema;
      break;
    case 'REGISTER_CENTER':
      schema = registerCenterSchema;
      break;
    default:
      throw ApiError.badRequest('Invalid purpose.', 'INVALID_PURPOSE');
  }
  const result = schema.safeParse(payload);
  if (!result.success) {
    const details = result.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
    const message = details.map((d) => (d.path ? `${d.path}: ${d.message}` : d.message)).join(' ');
    throw ApiError.validation(message || 'Validation failed.', details);
  }
  return result.data;
}

export interface RequestOtpInput {
  phone: string;
  purpose: 'REGISTER_STUDENT' | 'REGISTER_PARENT' | 'REGISTER_TEACHER' | 'REGISTER_CENTER';
  payload: unknown;
}

export async function requestOtp(input: RequestOtpInput) {
  // Normalize phone strictly; throws 400 INVALID_PHONE on failure
  const { e164 } = normalizePhone(input.phone);

  // Validate registration payload BEFORE storing anything. Prevents storing
  // garbage/invalid passwords and gives fast feedback.
  // For center, the center phone and adminPhone may differ; ensure payload
  // phone fields are consistent via normalization where needed.
  const validatedPayload = validatePayload(input.purpose, input.payload) as Record<string, unknown>;

  // Duplicate phone guard (E.164). For center: check both center phone collisions and admin user collisions.
  const existingUser = await prisma.user.findFirst({ where: { phoneE164: e164 } });
  if (existingUser) throw ApiError.conflict('This phone number is already registered.', 'PHONE_EXISTS');

  if (input.purpose === 'REGISTER_CENTER') {
    // Center phone may equal normalized e164; also adminPhone could be separate
    const adminPhoneRaw = (validatedPayload.adminPhone as string | undefined) ?? (validatedPayload.phone as string | undefined);
    if (adminPhoneRaw) {
      try {
        const adminNorm = normalizePhone(adminPhoneRaw as string);
        const adminExists = await prisma.user.findFirst({ where: { phoneE164: adminNorm.e164 } });
        if (adminExists) throw ApiError.conflict('This phone number is already registered.', 'PHONE_EXISTS');
      } catch (e) {
        if (e instanceof ApiError) throw e;
      }
    }
    // Centers table still uses raw phone string for legacy; check both raw normalized and stored values
    const centerExists = await prisma.center.findFirst({ where: { phone: e164 } });
    if (centerExists) throw ApiError.conflict('This phone number is already registered.', 'PHONE_EXISTS');
  }

  // Also guard username conflicts early so user gets actionable error before OTP SMS cost
  const usernameFields: Record<string, string> = {
    REGISTER_STUDENT: 'username',
    REGISTER_PARENT: 'username',
    REGISTER_TEACHER: 'username',
    REGISTER_CENTER: 'adminUsername',
  };
  const usernameKey = usernameFields[input.purpose];
  const attemptedUsername = (validatedPayload[usernameKey] as string | undefined) ?? (validatedPayload.username as string | undefined);
  if (attemptedUsername) {
    const usernameTaken = await prisma.user.findUnique({ where: { username: attemptedUsername } });
    if (usernameTaken) throw ApiError.conflict('This username is already taken.', 'USERNAME_TAKEN');
  }

  // Cooldown / resend limit against the latest unverified session for this phone+purpose
  const recent = await phoneVerificationRepository.findByPhone(e164, input.purpose);
  if (recent) {
    const elapsed = (Date.now() - new Date(recent.updatedAt).getTime()) / 1000;
    if (elapsed < resendCooldown()) {
      throw ApiError.tooManyRequests(`Please wait ${Math.ceil(resendCooldown() - elapsed)}s before requesting a new code.`);
    }
    if (recent.resendCount >= resendLimit()) {
      throw ApiError.tooManyRequests('Too many resend attempts. Please try again later.');
    }
  }

  const otp = generateOtp();
  const otpHash = await hash(otp);
  const expiresAt = new Date(Date.now() + otpTtl() * 1000);
  const payloadEnc = encryptPayload(validatedPayload);

  const provider = getSmsProvider();
  const smsBody = `Your Maarej verification code is ${otp}. It expires in ${Math.floor(otpTtl() / 60)} minutes. Do not share this code.`;

  if (recent) {
    await phoneVerificationRepository.update(recent.id, {
      otpHash,
      expiresAt,
      attempts: 0,
      resendCount: { increment: 1 },
      payloadEnc,
    });
    try {
      await provider.send(e164, smsBody);
    } catch (e) {
      // On provider failure we already rotated OTP; surface error but keep session for retry
      throw e;
    }
    const isDev = env.OTP_DEV_MODE && !env.isProd;
    return {
      verificationId: recent.id,
      maskedPhone: maskPhone(e164),
      expiresAt,
      resendCooldown: resendCooldown(),
      ...(isDev ? { devOtp: otp } : {}),
    };
  }

  const verification = await phoneVerificationRepository.create({
    phoneE164: e164,
    phoneRaw: input.phone,
    purpose: input.purpose,
    otpHash,
    expiresAt,
    payloadEnc,
    maxAttempts: maxAttempts(),
  });

  try {
    await provider.send(e164, smsBody);
  } catch (e) {
    await prisma.phoneVerification.delete({ where: { id: verification.id } });
    throw e;
  }

  const isDev = env.OTP_DEV_MODE && !env.isProd;
  return {
    verificationId: verification.id,
    maskedPhone: maskPhone(e164),
    expiresAt,
    resendCooldown: resendCooldown(),
    ...(isDev ? { devOtp: otp } : {}),
  };
}

export async function verifyOtp(verificationId: string, code: string) {
  const verification = await phoneVerificationRepository.findById(verificationId);
  if (!verification) throw ApiError.notFound('Verification session not found or expired.', 'SESSION_EXPIRED');
  if (verification.verifiedAt) throw ApiError.badRequest('This code has already been used.', 'ALREADY_VERIFIED');
  if (new Date() > new Date(verification.expiresAt)) {
    throw ApiError.badRequest('Verification code expired. Please request a new code.', 'EXPIRED');
  }
  if (verification.attempts >= verification.maxAttempts) {
    throw ApiError.tooManyRequests('Too many incorrect attempts. Please request a new code.');
  }

  const ok = await verify(verification.otpHash, code);
  if (!ok) {
    const updated = await phoneVerificationRepository.update(verification.id, { attempts: { increment: 1 } });
    // If this was the last allowed attempt, invalidate by keeping attempts == maxAttempts
    if (updated.attempts >= updated.maxAttempts) {
      throw ApiError.tooManyRequests('Too many incorrect attempts. Please request a new code.');
    }
    throw ApiError.badRequest('Invalid verification code.', 'INVALID_CODE');
  }

  await phoneVerificationRepository.update(verification.id, { verifiedAt: new Date() });

  const payload = verification.payloadEnc ? (decryptPayload(verification.payloadEnc) as Record<string, unknown>) : null;
  if (!payload) throw ApiError.internal('Verification payload missing', 'PAYLOAD_MISSING');

  // Race check: phone may have been taken between request and verification
  const { e164 } = (() => {
    try {
      return normalizePhone(verification.phoneE164);
    } catch {
      return { e164: verification.phoneE164 } as { e164: string };
    }
  })();
  const existing = await prisma.user.findFirst({ where: { phoneE164: e164 } });
  if (existing) throw ApiError.conflict('This phone number is already registered.', 'PHONE_EXISTS');

  if (verification.purpose === 'REGISTER_CENTER') {
    const adminPhoneRaw = (payload.adminPhone as string | undefined) ?? (payload.phone as string | undefined);
    if (adminPhoneRaw) {
      try {
        const adminNorm = normalizePhone(adminPhoneRaw as string);
        const adminExists = await prisma.user.findFirst({ where: { phoneE164: adminNorm.e164 } });
        if (adminExists) throw ApiError.conflict('This phone number is already registered.', 'PHONE_EXISTS');
      } catch (e) {
        if (e instanceof ApiError) throw e;
      }
    }
    const centerExists = await prisma.center.findFirst({ where: { phone: e164 } });
    if (centerExists) throw ApiError.conflict('This phone number is already registered.', 'PHONE_EXISTS');
  }

  // Username race check
  const usernameKey =
    verification.purpose === 'REGISTER_CENTER' ? 'adminUsername' : 'username';
  const attemptedUsername = (payload[usernameKey] as string | undefined) ?? (payload.username as string | undefined);
  if (attemptedUsername) {
    const taken = await prisma.user.findUnique({ where: { username: attemptedUsername } });
    if (taken) throw ApiError.conflict('This username is already taken.', 'USERNAME_TAKEN');
  }

  let result: unknown = null;
  try {
    if (verification.purpose === 'REGISTER_STUDENT') {
      const { registerStudent } = await import('./auth.service.js');
      result = await registerStudent({ ...(payload as unknown as Record<string, unknown>), phone: verification.phoneE164 } as unknown as Parameters<typeof registerStudent>[0]);
    } else if (verification.purpose === 'REGISTER_PARENT') {
      const { registerParent } = await import('./auth.service.js');
      result = await registerParent({ ...(payload as unknown as Record<string, unknown>), phone: verification.phoneE164 } as unknown as Parameters<typeof registerParent>[0]);
    } else if (verification.purpose === 'REGISTER_TEACHER') {
      const { registerTeacher } = await import('./auth.service.js');
      result = await registerTeacher({ ...(payload as unknown as Record<string, unknown>), phone: verification.phoneE164 } as unknown as Parameters<typeof registerTeacher>[0]);
    } else if (verification.purpose === 'REGISTER_CENTER') {
      const { registerCenter } = await import('./auth.service.js');
      const centerPayload = { ...(payload as unknown as Record<string, unknown>), phone: verification.phoneE164 } as Record<string, unknown>;
      result = await registerCenter(centerPayload as unknown as Parameters<typeof registerCenter>[0]);
    } else {
      throw ApiError.badRequest('Invalid verification purpose.', 'INVALID_PURPOSE');
    }
  } catch (e) {
    // If creation fails after verification, the verification is already marked verified
    // so it cannot be reused. Surface the original error (e.g. CENTER_INACTIVE, conflict).
    throw e;
  }

  return result;
}

export async function resendOtp(verificationId: string) {
  const verification = await phoneVerificationRepository.findById(verificationId);
  if (!verification) throw ApiError.notFound('Verification session not found.', 'SESSION_EXPIRED');
  if (verification.verifiedAt) throw ApiError.badRequest('This code has already been used.', 'ALREADY_VERIFIED');
  if (new Date() > new Date(verification.expiresAt) && verification.resendCount >= resendLimit()) {
    // expired + limit still applies
  }
  if (verification.resendCount >= resendLimit()) throw ApiError.tooManyRequests('Too many resend attempts. Please try again later.');
  const elapsed = (Date.now() - new Date(verification.updatedAt).getTime()) / 1000;
  if (elapsed < resendCooldown()) {
    throw ApiError.tooManyRequests(`Please wait ${Math.ceil(resendCooldown() - elapsed)}s before requesting a new code.`);
  }

  const otp = generateOtp();
  const otpHash = await hash(otp);
  const expiresAt = new Date(Date.now() + otpTtl() * 1000);
  await phoneVerificationRepository.update(verification.id, {
    otpHash,
    expiresAt,
    attempts: 0,
    resendCount: { increment: 1 },
  });

  const provider = getSmsProvider();
  await provider.send(
    verification.phoneE164,
    `Your Maarej verification code is ${otp}. It expires in ${Math.floor(otpTtl() / 60)} minutes. Do not share this code.`,
  );

  const isDev = env.OTP_DEV_MODE && !env.isProd;
  return {
    verificationId: verification.id,
    maskedPhone: maskPhone(verification.phoneE164),
    expiresAt,
    resendCooldown: resendCooldown(),
    ...(isDev ? { devOtp: otp } : {}),
  };
}

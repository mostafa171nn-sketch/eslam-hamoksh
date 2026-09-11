import crypto from 'crypto';
import { hash, verify } from '@node-rs/argon2';
import { ApiError } from '../utils/ApiError';
import { normalizePhone, maskPhone } from '../utils/phone';
import { getSmsProvider } from './sms.provider';
import { phoneVerificationRepository } from '../repositories/phone-verification.repository';
import { userRepository } from '../repositories/user.repository';
import { randomToken, hashToken } from '../utils/tokens';
import { env } from '../config/env';

// Shared PhoneVerification purpose value. `purpose` is a plain String in the
// schema, so the phone-OTP password reset flow can reuse the exact same table
// (and its argon2 + AES-256-GCM storage) as the registration OTP flow without
// any migration.
const PURPOSE = 'PASSWORD_RESET';
const OTP_LEN = 6;

function otpTtl() {
  return env.OTP_TTL_SECONDS;
}
function resendCooldown() {
  return env.OTP_RESEND_COOLDOWN;
}
function resendLimit() {
  return env.OTP_RESEND_LIMIT;
}
function isDev() {
  return env.OTP_DEV_MODE && !env.isProd;
}

/** Cryptographically secure 6-digit OTP. Never use Math.random() for secrets. */
function generateOtp(): string {
  const n = crypto.randomInt(0, 10 ** OTP_LEN);
  return n.toString().padStart(OTP_LEN, '0');
}

// Identical storage strategy to otp.service.ts: payloads are encrypted at rest
// with AES-256-GCM using a key derived from the JWT secrets, so DB dumps never
// contain plaintext user identifiers.
function deriveKey(): Buffer {
  const secret = env.JWT_ACCESS_SECRET + '|' + env.JWT_REFRESH_SECRET;
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptPayload(obj: unknown): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify(obj);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

function decryptPayload(enc: string): unknown {
  const parts = enc.split('.');
  if (parts.length === 4) {
    const [, ivB64, tagB64, dataB64] = parts;
    const key = deriveKey();
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const dec = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf-8');
      return JSON.parse(dec);
    } catch {
      return null;
    }
  }
  return null;
}

function smsBody(otp: string): string {
  return `Your Maarej verification code is ${otp}. It expires in ${Math.floor(otpTtl() / 60)} minutes. Do not share this code.`;
}

// Structural dependency surface so the flow can be unit tested hermetically
// without a live database. Controllers use the real repository/provider
// defaults; tests substitute in-memory fakes.
export interface PasswordResetDeps {
  userRepo: {
    findByPhoneE164(phoneE164: string): Promise<{ id: string; phoneE164: string | null; phoneVerified: boolean } | null>;
    findById(id: string): Promise<{ id: string; phoneE164: string | null; phoneVerified: boolean } | null>;
    update(id: string, data: Record<string, unknown>): Promise<unknown>;
    createPasswordResetToken(data: Record<string, unknown>): Promise<unknown>;
  };
  verificationRepo: {
    findByPhone(phoneE164: string, purpose: string): Promise<PhoneVerificationLike | null>;
    findById(id: string): Promise<PhoneVerificationLike | null>;
    create(data: Record<string, unknown>): Promise<PhoneVerificationLike>;
    update(id: string, data: Record<string, unknown>): Promise<PhoneVerificationLike>;
    delete(id: string): Promise<unknown>;
  };
  smsProvider: { send(to: string, body: string): Promise<unknown> };
}

export interface PhoneVerificationLike {
  id: string;
  phoneE164: string;
  purpose: string;
  otpHash: string;
  payloadEnc?: string | null;
  expiresAt: Date;
  verifiedAt?: Date | null;
  attempts: number;
  maxAttempts: number;
  resendCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const defaultDeps: PasswordResetDeps = {
  userRepo: userRepository as unknown as PasswordResetDeps['userRepo'],
  verificationRepo: phoneVerificationRepository as unknown as PasswordResetDeps['verificationRepo'],
  smsProvider: getSmsProvider(),
};

export interface PasswordResetOtpResult {
  verificationId: string;
  maskedPhone: string;
  expiresAt: Date;
  resendCooldown: number;
  devOtp?: string;
}

function buildResult(verificationId: string, e164: string, expiresAt: Date, devOtp?: string): PasswordResetOtpResult {
  return {
    verificationId,
    maskedPhone: maskPhone(e164),
    expiresAt,
    resendCooldown: resendCooldown(),
    ...(isDev() && devOtp ? { devOtp } : {}),
  };
}

function fabricatedResult(e164: string): PasswordResetOtpResult {
  // Anti-enumeration: identical shape whether or not the account exists. A
  // random verificationId that can never be verified; no SMS is sent and no
  // row is written.
  return buildResult(crypto.randomUUID(), e164, new Date(Date.now() + otpTtl() * 1000));
}

/**
 * Sends an OTP by SMS to the owner of the given phone (if an account exists),
 * or returns an identical generic response when it does not. All
 * request/cooldown paths return the same 200 shape so callers cannot tell
 * whether a phone is registered; the middleware rate limiter is the primary
 * abuse control.
 */
export async function requestPasswordResetOtp(phone: string, overrides: Partial<PasswordResetDeps> = {}): Promise<PasswordResetOtpResult> {
  const deps = { ...defaultDeps, ...overrides };
  const { e164 } = normalizePhone(phone);

  const user = await deps.userRepo.findByPhoneE164(e164);
  if (!user) return fabricatedResult(e164);

  const recent = await deps.verificationRepo.findByPhone(e164, PURPOSE);
  if (recent) {
    const elapsed = (Date.now() - new Date(recent.updatedAt).getTime()) / 1000;
    // Inside the cooldown window, or the resend budget is exhausted: reuse the
    // existing active session (the last issued code still verifies) instead of
    // sending another SMS. Response stays identical for enumeration safety.
    if (elapsed < resendCooldown() || recent.resendCount >= resendLimit()) {
      return buildResult(recent.id, e164, recent.expiresAt);
    }
  }

  const otp = generateOtp();
  const otpHash = await hash(otp);
  const expiresAt = new Date(Date.now() + otpTtl() * 1000);
  const payloadEnc = encryptPayload({ userId: user.id });
  const provider = deps.smsProvider;

  if (recent) {
    await deps.verificationRepo.update(recent.id, {
      otpHash,
      expiresAt,
      attempts: 0,
      resendCount: { increment: 1 },
      payloadEnc,
    });
    await provider.send(e164, smsBody(otp));
    return buildResult(recent.id, e164, expiresAt, otp);
  }

  const verification = await deps.verificationRepo.create({
    phoneE164: e164,
    phoneRaw: phone,
    purpose: PURPOSE,
    otpHash,
    expiresAt,
    maxAttempts: env.OTP_MAX_ATTEMPTS,
    payloadEnc,
  });

  try {
    await provider.send(e164, smsBody(otp));
  } catch (e) {
    await deps.verificationRepo.delete(verification.id);
    throw e;
  }

  return buildResult(verification.id, e164, expiresAt, otp);
}

/**
 * Verifies the OTP for a password-reset session. On success it issues a
 * short-lived, single-use reset authorization token (PasswordResetToken hashed
 * with sha256) bound to the exact user that owns the phone. The token is later
 * exchanged by the existing /reset-password endpoint.
 */
export async function verifyPasswordResetOtp(verificationId: string, code: string, overrides: Partial<PasswordResetDeps> = {}) {
  const deps = { ...defaultDeps, ...overrides };
  const verification = await deps.verificationRepo.findById(verificationId);
  if (!verification || verification.purpose !== PURPOSE) {
    throw ApiError.notFound('Verification session not found or expired.', 'SESSION_EXPIRED');
  }
  if (verification.verifiedAt) {
    throw ApiError.badRequest('This code has already been used.', 'ALREADY_VERIFIED');
  }
  if (new Date() > new Date(verification.expiresAt)) {
    throw ApiError.badRequest('Verification code expired. Please request a new code.', 'EXPIRED');
  }
  if (verification.attempts >= verification.maxAttempts) {
    throw ApiError.tooManyRequests('Too many incorrect attempts. Please request a new code.');
  }

  const ok = await verify(verification.otpHash, code);
  if (!ok) {
    const updated = await deps.verificationRepo.update(verification.id, { attempts: { increment: 1 } });
    if (updated.attempts >= updated.maxAttempts) {
      throw ApiError.tooManyRequests('Too many incorrect attempts. Please request a new code.');
    }
    throw ApiError.badRequest('Invalid verification code.', 'INVALID_CODE');
  }

  await deps.verificationRepo.update(verification.id, { verifiedAt: new Date() });

  // The session can only exist for a real account (created in
  // requestPasswordResetOtp), so a fabricated id simply fails the lookup above.
  const payload = verification.payloadEnc ? (decryptPayload(verification.payloadEnc) as Record<string, unknown> | null) : null;
  const userId = typeof payload?.userId === 'string' ? payload.userId : null;
  if (!userId) throw ApiError.internal('Password reset payload missing.', 'PAYLOAD_MISSING');

  // Race guard: the user must still exist and still own this phone.
  const user = await deps.userRepo.findById(userId);
  if (!user || user.phoneE164 !== verification.phoneE164) {
    throw ApiError.notFound('Verification session not found or expired.', 'SESSION_EXPIRED');
  }

  if (!user.phoneVerified) {
    await deps.userRepo.update(user.id, { phoneVerified: true, phoneVerifiedAt: new Date() });
  }

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_AUTH_TTL_SECONDS * 1000);
  await deps.userRepo.createPasswordResetToken({
    user: { connect: { id: user.id } },
    tokenHash: hashToken(token),
    expiresAt,
  });

  return {
    resetToken: token,
    expiresAt,
    maskedPhone: maskPhone(verification.phoneE164),
  };
}

/** Rotates the code of an active password-reset session (one-time use). */
export async function resendPasswordResetOtp(verificationId: string, overrides: Partial<PasswordResetDeps> = {}): Promise<PasswordResetOtpResult> {
  const deps = { ...defaultDeps, ...overrides };
  const verification = await deps.verificationRepo.findById(verificationId);
  if (!verification || verification.purpose !== PURPOSE) {
    throw ApiError.notFound('Verification session not found or expired.', 'SESSION_EXPIRED');
  }
  if (verification.verifiedAt) {
    throw ApiError.badRequest('This code has already been used.', 'ALREADY_VERIFIED');
  }
  if (verification.resendCount >= resendLimit()) {
    throw ApiError.tooManyRequests('Too many resend attempts. Please try again later.');
  }
  const elapsed = (Date.now() - new Date(verification.updatedAt).getTime()) / 1000;
  if (elapsed < resendCooldown()) {
    throw ApiError.tooManyRequests(`Please wait ${Math.ceil(resendCooldown() - elapsed)}s before requesting a new code.`);
  }

  const otp = generateOtp();
  const otpHash = await hash(otp);
  const expiresAt = new Date(Date.now() + otpTtl() * 1000);
  await deps.verificationRepo.update(verification.id, {
    otpHash,
    expiresAt,
    attempts: 0,
    resendCount: { increment: 1 },
  });

  const provider = deps.smsProvider;
  await provider.send(verification.phoneE164, smsBody(otp));

  return buildResult(verification.id, verification.phoneE164, expiresAt, otp);
}
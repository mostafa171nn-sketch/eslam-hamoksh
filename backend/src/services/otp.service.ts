
import crypto from 'crypto';
import { hash, verify } from '@node-rs/argon2';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { normalizePhone, maskPhone } from '../utils/phone';
import { getSmsProvider } from './sms.provider';
import { phoneVerificationRepository } from '../repositories/phone-verification.repository';

const OTP_TTL = Number(process.env.OTP_TTL_SECONDS || 300);
const OTP_LEN = 6;
const MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const RESEND_COOLDOWN = Number(process.env.OTP_RESEND_COOLDOWN || 45);
const RESEND_LIMIT = Number(process.env.OTP_RESEND_LIMIT || 5);

function generateOtp(): string {
  const n = crypto.randomInt(0, Math.pow(10, OTP_LEN));
  return n.toString().padStart(OTP_LEN, '0');
}
function encryptPayload(obj: any): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}
function decryptPayload(enc: string): any {
  return JSON.parse(Buffer.from(enc, 'base64').toString('utf-8'));
}
export interface RequestOtpInput {
  phone: string;
  purpose: 'REGISTER_STUDENT' | 'REGISTER_PARENT' | 'REGISTER_TEACHER' | 'REGISTER_CENTER';
  payload: any;
}
export async function requestOtp(input: RequestOtpInput) {
  const { e164 } = normalizePhone(input.phone);
  const existing = await prisma.user.findFirst({ where: { phoneE164: e164 } });
  if (existing) throw ApiError.conflict('This phone number is already registered.', 'PHONE_EXISTS');
  if (input.purpose === 'REGISTER_CENTER' && input.payload?.phone) {
    const centerExists = await prisma.center.findFirst({ where: { phone: e164 } });
    if (centerExists) throw ApiError.conflict('This phone number is already registered.', 'PHONE_EXISTS');
  }
  const recent = await phoneVerificationRepository.findByPhone(e164, input.purpose);
  if (recent) {
    const elapsed = (Date.now() - new Date(recent.updatedAt).getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN) throw ApiError.tooManyRequests('Please wait ' + Math.ceil(RESEND_COOLDOWN - elapsed) + 's before requesting a new code.');
    if (recent.resendCount >= RESEND_LIMIT) throw ApiError.tooManyRequests('Too many resend attempts. Please try later.');
  }
  const otp = generateOtp();
  const otpHash = await hash(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL * 1000);
  const payloadEnc = encryptPayload(input.payload);
  if (recent) {
    await phoneVerificationRepository.update(recent.id, { otpHash, expiresAt, attempts: 0, resendCount: { increment: 1 }, payloadEnc });
    const provider = getSmsProvider();
    await provider.send(e164, 'Your Maarech verification code is ' + otp + '. It expires in ' + Math.floor(OTP_TTL/60) + ' minutes.');
    const isDev = process.env.OTP_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production';
    return { verificationId: recent.id, maskedPhone: maskPhone(e164), expiresAt, ...(isDev ? { devOtp: otp } : {}) };
  }
  const verification = await phoneVerificationRepository.create({ phoneE164: e164, phoneRaw: input.phone, purpose: input.purpose, otpHash, expiresAt, payloadEnc, maxAttempts: MAX_ATTEMPTS });
  const provider = getSmsProvider();
  try {
    await provider.send(e164, 'Your Maarech verification code is ' + otp + '. It expires in ' + Math.floor(OTP_TTL/60) + ' minutes.');
  } catch (e) {
    await prisma.phoneVerification.delete({ where: { id: verification.id } });
    throw e;
  }
  const isDev = process.env.OTP_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production';
  return { verificationId: verification.id, maskedPhone: maskPhone(e164), expiresAt, ...(isDev ? { devOtp: otp } : {}) };
}
export async function verifyOtp(verificationId: string, code: string) {
  const verification = await phoneVerificationRepository.findById(verificationId);
  if (!verification) throw ApiError.notFound('Verification session not found or expired.', 'SESSION_EXPIRED');
  if (verification.verifiedAt) throw ApiError.badRequest('This code has already been used.', 'ALREADY_VERIFIED');
  if (new Date() > new Date(verification.expiresAt)) throw ApiError.badRequest('This verification code has expired. Please request a new code.', 'EXPIRED');
  if (verification.attempts >= verification.maxAttempts) throw ApiError.tooManyRequests('Too many incorrect attempts. Please request a new code.');
  const ok = await verify(verification.otpHash, code);
  if (!ok) {
    await phoneVerificationRepository.update(verification.id, { attempts: { increment: 1 } });
    throw ApiError.badRequest('Invalid verification code. Please try again.', 'INVALID_CODE');
  }
  await phoneVerificationRepository.update(verification.id, { verifiedAt: new Date() });
  const payload = verification.payloadEnc ? decryptPayload(verification.payloadEnc) : null;
  if (!payload) throw ApiError.internal('Verification payload missing');
  let result: any = null;
  try {
    if (verification.purpose === 'REGISTER_STUDENT') {
      const { registerStudent } = await import('./auth.service.js');
      result = await registerStudent({ ...payload, phone: verification.phoneE164 });
    } else if (verification.purpose === 'REGISTER_PARENT') {
      const { registerParent } = await import('./auth.service.js');
      result = await registerParent({ ...payload, phone: verification.phoneE164 });
    } else if (verification.purpose === 'REGISTER_TEACHER') {
      const { registerTeacher } = await import('./auth.service.js');
      result = await registerTeacher({ ...payload, phone: verification.phoneE164 });
    } else if (verification.purpose === 'REGISTER_CENTER') {
      const { registerCenter } = await import('./auth.service.js');
      result = await registerCenter({ ...payload, phone: verification.phoneE164 });
    }
  } catch (e:any) { throw e; }
  return result;
}
export async function resendOtp(verificationId: string) {
  const verification = await phoneVerificationRepository.findById(verificationId);
  if (!verification) throw ApiError.notFound('Verification session not found.', 'SESSION_EXPIRED');
  if (verification.verifiedAt) throw ApiError.badRequest('Already verified.', 'ALREADY_VERIFIED');
  if (verification.resendCount >= RESEND_LIMIT) throw ApiError.tooManyRequests('Too many resend attempts.');
  const elapsed = (Date.now() - new Date(verification.updatedAt).getTime()) / 1000;
  if (elapsed < RESEND_COOLDOWN) throw ApiError.tooManyRequests('Please wait ' + Math.ceil(RESEND_COOLDOWN - elapsed) + 's.');
  const otp = generateOtp();
  const otpHash = await hash(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL * 1000);
  await phoneVerificationRepository.update(verification.id, { otpHash, expiresAt, attempts: 0, resendCount: { increment: 1 } });
  const provider = getSmsProvider();
  await provider.send(verification.phoneE164, 'Your Maarech verification code is ' + otp + '. It expires in ' + Math.floor(OTP_TTL/60) + ' minutes.');
  const isDev = process.env.OTP_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production';
  return { verificationId: verification.id, maskedPhone: maskPhone(verification.phoneE164), expiresAt, ...(isDev ? { devOtp: otp } : {}) };
}

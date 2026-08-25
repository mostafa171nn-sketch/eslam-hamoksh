import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import * as otpService from '../services/otp.service';

export const requestOtpHandler = asyncHandler(async (req: Request, res: Response) => {
  const { phone, purpose, payload } = (req as Request & { validatedBody: { phone: string; purpose: 'REGISTER_STUDENT' | 'REGISTER_PARENT' | 'REGISTER_TEACHER' | 'REGISTER_CENTER'; payload: unknown } }).validatedBody;
  const result = await otpService.requestOtp({ phone, purpose, payload });
  return ok(res, result, 'Verification code sent.');
});

export const verifyOtpHandler = asyncHandler(async (req: Request, res: Response) => {
  const { verificationId, code } = (req as Request & { validatedBody: { verificationId: string; code: string } }).validatedBody;
  const result = await otpService.verifyOtp(verificationId, code);
  return ok(res, result, 'Phone verified. Registration completed.');
});

export const resendOtpHandler = asyncHandler(async (req: Request, res: Response) => {
  const { verificationId } = (req as Request & { validatedBody: { verificationId: string } }).validatedBody;
  const result = await otpService.resendOtp(verificationId);
  return ok(res, result, 'Verification code resent.');
});

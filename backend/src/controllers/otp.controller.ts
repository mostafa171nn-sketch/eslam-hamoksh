
import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import * as otpService from '../services/otp.service';
export const requestOtpHandler = asyncHandler(async (req: Request, res: Response) => {
  const { phone, purpose, payload } = req.body;
  if (!phone || !purpose || !payload) return res.status(400).json({ success: false, message: 'phone, purpose and payload are required' });
  const result = await otpService.requestOtp({ phone, purpose, payload });
  return ok(res, result, 'OTP sent.');
});
export const verifyOtpHandler = asyncHandler(async (req: Request, res:Response) => {
  const { verificationId, code } = req.body;
  if (!verificationId || !code) return res.status(400).json({ success:false, message:'verificationId and code are required' });
  const result = await otpService.verifyOtp(verificationId, code);
  return ok(res, result, 'Phone verified. Registration completed.');
});
export const resendOtpHandler = asyncHandler(async (req:Request,res:Response)=>{
  const { verificationId } = req.body;
  if (!verificationId) return res.status(400).json({success:false,message:'verificationId required'});
  const result = await otpService.resendOtp(verificationId);
  return ok(res, result, 'OTP resent.');
});

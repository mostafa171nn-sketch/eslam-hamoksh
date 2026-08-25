import { z } from 'zod';
export const requestOtpSchema = z.object({ phone: z.string().min(8), purpose: z.enum(['REGISTER_STUDENT','REGISTER_PARENT','REGISTER_TEACHER','REGISTER_CENTER']), payload: z.any() });
export const verifyOtpSchema = z.object({ verificationId: z.string().uuid(), code: z.string().length(6) });
export const resendOtpSchema = z.object({ verificationId: z.string().uuid() });
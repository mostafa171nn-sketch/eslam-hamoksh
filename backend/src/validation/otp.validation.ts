import { z } from 'zod';

export const requestOtpSchema = z.object({
  phone: z.string().min(8, 'Phone number is required.').max(20),
  purpose: z.enum(['REGISTER_STUDENT', 'REGISTER_PARENT', 'REGISTER_TEACHER', 'REGISTER_CENTER']),
  payload: z.record(z.unknown()),
});

export const verifyOtpSchema = z.object({
  verificationId: z.string().uuid('Invalid verification id.'),
  code: z
    .string()
    .length(6, 'Code must be 6 digits.')
    .regex(/^\d{6}$/, 'Code must be 6 digits.'),
});

export const resendOtpSchema = z.object({
  verificationId: z.string().uuid('Invalid verification id.'),
});
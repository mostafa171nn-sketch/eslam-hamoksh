import { Router } from 'express';
import type { ZodSchema } from 'zod';
import rateLimit from 'express-rate-limit';
import {
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  register,
  requestPasswordResetOtpHandler,
  resendPasswordResetOtpHandler,
  resetPasswordHandler,
  verifyPasswordResetOtpHandler,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validate, validateByParam } from '../middleware/validate';
import {
  forgotPasswordPhoneSchema,
  forgotPasswordResendSchema,
  forgotPasswordSchema,
  forgotPasswordVerifySchema,
  loginSchema,
  registerParentSchema,
  registerStudentSchema,
  registerTeacherSchema,
  resetPasswordSchema,
} from '../validation';

const router = Router();

/** Abuse guard for the phone-OTP password reset endpoints (SMS + brute force). */
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try later.',
    data: null,
    error: { code: 'RATE_LIMITED' },
  },
});

const REGISTER_SCHEMAS: Record<string, ZodSchema> = {
  teacher: registerTeacherSchema,
  student: registerStudentSchema,
  parent: registerParentSchema,
};

router.post(
  '/register/:role',
  authRateLimiter,
  validateByParam(REGISTER_SCHEMAS, 'role'),
  register,
);

router.post('/login', authRateLimiter, validate(loginSchema), loginHandler);
router.post('/logout', logoutHandler);
router.post('/refresh', refreshHandler);

router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), forgotPasswordHandler);
router.post('/forgot-password/phone', passwordResetLimiter, validate(forgotPasswordPhoneSchema), requestPasswordResetOtpHandler);
router.post('/forgot-password/verify', passwordResetLimiter, validate(forgotPasswordVerifySchema), verifyPasswordResetOtpHandler);
router.post('/forgot-password/resend', passwordResetLimiter, validate(forgotPasswordResendSchema), resendPasswordResetOtpHandler);
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), resetPasswordHandler);

router.get('/me', authenticate, meHandler);

export default router;

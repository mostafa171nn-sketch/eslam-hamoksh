import { Router } from 'express';
import type { ZodSchema } from 'zod';
import {
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  register,
  resetPasswordHandler,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validate, validateByParam } from '../middleware/validate';
import {
  forgotPasswordSchema,
  loginSchema,
  registerParentSchema,
  registerStudentSchema,
  registerTeacherSchema,
  resetPasswordSchema,
} from '../validation';

const router = Router();

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
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), resetPasswordHandler);

router.get('/me', authenticate, meHandler);

export default router;

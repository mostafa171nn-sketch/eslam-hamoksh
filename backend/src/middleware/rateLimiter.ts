import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/** General API rate limit. */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    data: null,
    error: { code: 'RATE_LIMITED' },
  },
});

/** Stricter limit for authentication endpoints (brute force protection). */
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
    data: null,
    error: { code: 'RATE_LIMITED' },
  },
});

/** Moderate limit for exam answer autosaves to keep the DB safe under load. */
export const examSaveRateLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many save requests. Slow down a bit.',
    data: null,
    error: { code: 'RATE_LIMITED' },
  },
});

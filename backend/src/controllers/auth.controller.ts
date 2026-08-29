import type { Request, Response } from 'express';
import {
  forgotPassword,
  login,
  refreshSession,
  registerCenter,
  registerParent,
  registerStudent,
  registerTeacher,
  resetPassword,
} from '../services/auth.service';
import { revokeRefreshToken } from '../services/token.service';
import { getUserProfile } from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';
import { hashToken } from '../utils/tokens';
import { userRepository } from '../repositories/user.repository';
import { centerRepository } from '../repositories/center.repository';

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.isProd,
  path: '/',
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string, refreshExpiresAt: Date) {
  res.cookie('accessToken', accessToken, {
    ...COOKIE_OPTS,
    maxAge: 30 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTS,
    maxAge: refreshExpiresAt.getTime() - Date.now(),
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie('accessToken', COOKIE_OPTS);
  res.clearCookie('refreshToken', COOKIE_OPTS);
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const role = (req.params.role as string).toUpperCase();
  const body = req.validatedBody as any;

  if (role === 'TEACHER') {
    const result = await registerTeacher(body);
    return created(res, { userId: result.user.id, teacherId: result.teacherId, role: 'TEACHER' }, 'Account created successfully.');
  }
  if (role === 'STUDENT') {
    const result = await registerStudent(body);
    return created(
      res,
      {
        userId: result.user.id,
        studentId: result.studentId,
        studentNumber: result.studentNumber,
        role: 'STUDENT',
      },
      'Account created successfully.',
    );
  }
  if (role === 'PARENT') {
    const result = await registerParent(body);
    return created(res, { userId: result.user.id, parentId: result.parentId, role: 'PARENT' }, 'Account created successfully.');
  }
  throw ApiError.badRequest('Account type not allowed.', 'INVALID_ROLE');
});

export const registerCenterHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody as any;
  const result = await registerCenter(body);
  return created(
    res,
    {
      centerId: result.center.id,
      centerName: result.center.name,
      status: result.center.status,
      subscriptionStatus: result.center.subscriptionStatus,
      requiresApproval: result.center.requiresApproval,
      latitude: result.latitude ?? null,
      longitude: result.longitude ?? null,
      locationStatus: result.locationStatus,
    },
    'Your center has been registered and is awaiting approval from the platform administrator.',
  );
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.validatedBody as {
    username?: string;
    password: string;
  };
  const result = await login(username || '', password);
  setAuthCookies(res, result.accessToken, result.refreshToken, result.refreshExpiresAt);
  const user = await userRepository.findById(result.userId);
  const profile = await getUserProfile(user!.id);

  // Surface center/subscription state so the frontend can enforce gating.
  const center = user?.centerId
    ? (await centerRepository.findMany({
        where: { id: user.centerId },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          subscriptionStatus: true,
          requiresApproval: true,
        },
      }))[0] ?? null
    : null;

  return ok(
    res,
    { role: profile?.role, user: profile, center },
    'Logged in successfully.',
  );
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
    if (req.user) {
      await recordActivity({
        userId: req.user.id,
        role: req.user.role,
        action: 'logged_out',
        entity: 'User',
      });
    }
  }
  clearAuthCookies(res);
  return ok(res, null, 'Logged out successfully.');
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    throw ApiError.unauthorized('No refresh token provided.');
  }
  const record = await userRepository.findRefreshTokenByHash(hashToken(refreshToken));
  if (!record) throw ApiError.unauthorized('Invalid session. Please log in again.');

  const user = await userRepository.findById(record.userId);
  if (!user || user.status !== 'ACTIVE') {
    throw ApiError.unauthorized('Your account is not active.');
  }

  const result = await refreshSession(user.id, user.role, refreshToken);
  setAuthCookies(res, result.accessToken, result.refreshToken, result.refreshExpiresAt);
  return ok(res, { role: user.role }, 'Session refreshed.');
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  const profile = await getUserProfile(req.user!.id);
  if (!profile) throw ApiError.notFound('User not found.');
  return ok(res, profile, 'Profile loaded.');
});

export const forgotPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const { usernameOrEmail } = req.validatedBody as { usernameOrEmail: string };
  const result = await forgotPassword(usernameOrEmail);
  // Generic response regardless of whether the account exists.
  if (env.isDev && result) {
    return ok(res, { devResetUrl: result.resetUrl }, 'If an account exists with this username, a password reset link has been sent.');
  }
  return ok(res, null, 'If an account exists with this username, a password reset link has been sent.');
});

export const resetPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.validatedBody as { token: string; newPassword: string };
  await resetPassword(token, newPassword);
  return ok(res, null, 'Your password has been reset. You can now log in.');
});

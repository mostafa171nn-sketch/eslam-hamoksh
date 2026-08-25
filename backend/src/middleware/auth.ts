import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { verifyAccessToken } from '../services/token.service';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { runWithTenant, type TenantContext } from '../lib/tenant';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        centerId?: string | null;
      };
      validatedBody?: any;
      validatedQuery?: any;
      validatedParams?: any;
    }
  }
}

/**
 * Resolves the tenant (center) context for the authenticated user.
 * - SUPER_ADMIN: platform scope by default, or a single center when an explicit
 *   centerId is supplied (via query/body) for targeted cross-tenant operations.
 * - Everyone else: strictly scoped to the center stored on their user record.
 */
function buildTenantContext(user: {
  id: string;
  role: Role;
  centerId?: string | null;
  status: string;
}, req: Request): TenantContext {
  if (user.role === 'SUPER_ADMIN') {
    const explicit =
      (req.query?.centerId as string) ||
      req.validatedQuery?.centerId ||
      req.validatedBody?.centerId ||
      req.body?.centerId;
    if (explicit) {
      return { centerId: explicit, scope: 'center' };
    }
    return { centerId: null, scope: 'platform' };
  }

  if (user.centerId) {
    return { centerId: user.centerId, scope: 'center' };
  }
  // Users without a center (e.g. pre-assignment) cannot access tenant data.
  return { centerId: null, scope: 'platform' };
}

/**
 * Authenticates the request using the access token cookie. Attaches the
 * authenticated user's id, role and center to req.user and runs the rest of the
 * request inside a tenant-scoped context so all database access is isolated.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token =
      req.cookies?.accessToken ??
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) {
      throw ApiError.unauthorized();
    }

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true, centerId: true },
    });

    if (!user) {
      throw ApiError.unauthorized();
    }
    if (user.status !== 'ACTIVE') {
      throw ApiError.forbidden('Your account is not active. Please contact the administration.');
    }

    req.user = { id: user.id, role: user.role, centerId: user.centerId };

    const ctx = buildTenantContext(user, req);
    runWithTenant(ctx, () => next());
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(ApiError.unauthorized());
  }
}

/**
 * Optionally attaches the authenticated user to req.user when a valid access
 * token is present, but never rejects the request. Use this on public routes
 * (e.g. teacher profiles) that behave differently for logged-in users.
 */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const token =
      req.cookies?.accessToken ??
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);
    if (!token) return next();
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true, centerId: true },
    });
    if (user && user.status === 'ACTIVE') {
      req.user = { id: user.id, role: user.role, centerId: user.centerId };
      const ctx = buildTenantContext(user, req);
      runWithTenant(ctx, () => next());
      return;
    }
  } catch {
    // Ignore invalid/absent tokens; the route stays public.
  }
  next();
}

/** True for any role that acts as a center administrator. */
export function isCenterAdmin(role: Role | undefined): boolean {
  return role === 'CENTER_ADMIN' || role === 'ADMIN';
}

/** True for the platform super administrator. */
export function isSuperAdmin(role: Role | undefined): boolean {
  return role === 'SUPER_ADMIN';
}

/** Restricts the route to the given roles. Must run after `authenticate`.
 *  `ADMIN` also matches `CENTER_ADMIN` for backwards compatibility. */
export function requireRole(...roles: Role[]) {
  const expanded = new Set(roles);
  if (expanded.has('ADMIN')) expanded.add('CENTER_ADMIN');
  if (expanded.has('CENTER_ADMIN')) expanded.add('ADMIN');
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!expanded.has(req.user.role)) {
      return next(ApiError.forbidden());
    }
    next();
  };
}

/** Restricts the route to center administrators (CENTER_ADMIN or legacy ADMIN). */
export function requireCenterAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(ApiError.unauthorized());
  if (!isCenterAdmin(req.user.role)) return next(ApiError.forbidden());
  next();
}

/** Restricts the route to the platform super administrator. */
export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(ApiError.unauthorized());
  if (!isSuperAdmin(req.user.role)) return next(ApiError.forbidden());
  next();
}

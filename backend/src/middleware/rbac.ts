import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

// In-memory permission cache keyed by role string.  Entries are lazily populated
// and invalidated every 5 minutes so newly inserted RolePermission rows are
// picked up without a restart.
const CACHE_TTL_MS = 5 * 60 * 1000;
const permissionCache = new Map<string, { permissions: Set<string>; expiresAt: number }>();

async function getPermissionsForRole(role: string): Promise<Set<string>> {
  const cached = permissionCache.get(role);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions;
  }

  const rows = await prisma.rolePermission.findMany({
    where: { role: role as Role },
    select: { permission: { select: { name: true } } },
  });

  const permissions = new Set(rows.map((r) => r.permission.name));
  permissionCache.set(role, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });
  return permissions;
}

/**
 * Clears the in-memory permission cache for a specific role or all roles.
 * Call this after modifying RolePermission rows (e.g. admin updates a role).
 */
export function invalidatePermissionCache(role?: string) {
  if (role) {
    permissionCache.delete(role);
  } else {
    permissionCache.clear();
  }
}

/**
 * Middleware factory that checks whether the authenticated user's role includes
 * the given permission (looked up from the RolePermission table).
 *
 * MUST run after `authenticate` so that `req.user` is populated.
 *
 * Usage:
 *   router.get('/students', authenticate, requirePermission('students.view'), handler)
 */
export function requirePermission(permissionName: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(ApiError.unauthorized());
      }

      const role = req.user.role;

      // SUPER_ADMIN bypasses all permission checks — they have full access.
      if (role === 'SUPER_ADMIN') {
        return next();
      }

      const permissions = await getPermissionsForRole(role);
      if (!permissions.has(permissionName)) {
        return next(
          ApiError.forbidden(
            'You do not have permission to perform this action.',
            'INSUFFICIENT_PERMISSION',
          ),
        );
      }

      next();
    } catch (err) {
      if (err instanceof ApiError) return next(err);
      next(ApiError.forbidden('Permission check failed.', 'INSUFFICIENT_PERMISSION'));
    }
  };
}

/**
 * Middleware factory that checks whether the authenticated user's role includes
 * ANY of the given permissions (OR logic).
 *
 * Usage:
 *   router.post('/payments/:id/approve',
 *     authenticate,
 *     requireAnyPermission('payments.approve', 'payments.reject'),
 *     handler,
 *   )
 */
export function requireAnyPermission(...permissionNames: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(ApiError.unauthorized());
      }

      const role = req.user.role;

      if (role === 'SUPER_ADMIN') {
        return next();
      }

      const permissions = await getPermissionsForRole(role);
      const hasAny = permissionNames.some((p) => permissions.has(p));
      if (!hasAny) {
        return next(
          ApiError.forbidden(
            'You do not have permission to perform this action.',
            'INSUFFICIENT_PERMISSION',
          ),
        );
      }

      next();
    } catch (err) {
      if (err instanceof ApiError) return next(err);
      next(ApiError.forbidden('Permission check failed.', 'INSUFFICIENT_PERMISSION'));
    }
  };
}

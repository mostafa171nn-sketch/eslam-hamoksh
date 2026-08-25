import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { currentCenterId } from '../lib/tenant';
import { isFeatureEnabled, type CenterFeature } from '../services/subscription.service';

/**
 * Route guard that blocks access when the caller's center plan does not include
 * the requested feature. Produces a user-friendly "feature not included" error
 * instead of a raw 403. Returns 402 (Payment Required) so the frontend can show
 * a professional "upgrade your plan" state.
 */
export function requireFeature(feature: CenterFeature) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const centerId = currentCenterId();
      if (!centerId) {
        // Platform-scope callers (SUPER_ADMIN) are never gated.
        return next();
      }
      const center = await prisma.center.findUnique({
        where: { id: centerId },
        select: { plan: true, subscriptionStatus: true, status: true },
      });
      if (!center) return next(ApiError.notFound('Center not found.'));
      if (center.status !== 'ACTIVE') {
        return next(
          ApiError.forbidden('Your center account is not active. Please contact support.'),
        );
      }
      if (center.subscriptionStatus === 'SUSPENDED' || center.subscriptionStatus === 'EXPIRED' || center.subscriptionStatus === 'CANCELLED') {
        return next(
          ApiError.paymentRequired(
            'Your subscription is not active. Please renew to continue.',
            'SUBSCRIPTION_INACTIVE',
          ),
        );
      }
      if (!isFeatureEnabled(center.plan, feature)) {
        return next(
          ApiError.paymentRequired(
            'This feature is not included in your current plan. Please upgrade to access it.',
            'FEATURE_LOCKED',
          ),
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

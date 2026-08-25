import type { Request, Response } from 'express';
import {
  listPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  assignPlanToCenter,
  getCenterSubscription,
  changeCenterPlan,
  cancelCenterSubscription,
  reactivateCenterSubscription,
  getCenterSubscriptionHistory,
} from '../services/subscription.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';
import { currentCenterId } from '../lib/tenant';
import { ApiError } from '../utils/ApiError';

// ---------------------------------------------------------------------------
// Platform Plan Management (SUPER_ADMIN only)
// ---------------------------------------------------------------------------

export const listPlansHandler = asyncHandler(async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const plans = await listPlans(type as any);
  return ok(res, plans, 'Subscription plans loaded.');
});

/**
 * PUBLIC: active CENTER packages. Used by the public packages page so no
 * authentication is required to browse pricing; only safe, non-sensitive
 * plan fields are exposed.
 */
export const listPublicCenterPlansHandler = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await listPlans('CENTER');
  const data = (plans as any[])
    .filter((p) => p.isActive)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      billingPeriod: p.billingPeriod,
      priceMonthly: p.priceMonthly,
      currency: p.currency,
      maxTeachers: p.maxTeachers,
      maxStudents: p.maxStudents,
      maxEmployees: p.maxEmployees,
      maxAssistants: p.maxAssistants,
      maxRooms: p.maxRooms,
      commissionRate: p.commissionRate,
      includesChat: p.includesChat,
      includesExams: p.includesExams,
      includesAssignments: p.includesAssignments,
      includesAttendance: p.includesAttendance,
      includesPayments: p.includesPayments,
      includesAnalytics: p.includesAnalytics,
      includesMultiBranch: p.includesMultiBranch,
    }));
  return ok(res, data, 'Center packages loaded.');
});

export const getPlanHandler = asyncHandler(async (req: Request, res: Response) => {
  const plan = await getPlanById(req.params.id);
  return ok(res, plan, 'Subscription plan loaded.');
});

export const createPlanHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody ?? req.body;
  const plan = await createPlan(body);
  return created(res, plan, 'Subscription plan created.');
});

export const updatePlanHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody ?? req.body;
  const plan = await updatePlan(req.params.id, body);
  return ok(res, plan, 'Subscription plan updated.');
});

export const deletePlanHandler = asyncHandler(async (req: Request, res: Response) => {
  await deletePlan(req.params.id);
  return ok(res, null, 'Subscription plan deleted.');
});

// ---------------------------------------------------------------------------
// Platform Center Subscription Management (SUPER_ADMIN assigns plans)
// ---------------------------------------------------------------------------

export const assignPlanHandler = asyncHandler(async (req: Request, res: Response) => {
  const { centerId, planId } = req.validatedBody ?? req.body;
  const center = await assignPlanToCenter(centerId, planId);
  return ok(res, center, 'Plan assigned to center.');
});

export const platformChangePlanHandler = asyncHandler(async (req: Request, res: Response) => {
  const { centerId } = req.params;
  const { planId, billingPeriod, startDate } = req.validatedBody ?? req.body;
  const center = await changeCenterPlan(centerId, planId, billingPeriod, startDate);
  return ok(res, center, 'Center plan changed.');
});

export const platformCancelSubscriptionHandler = asyncHandler(async (req: Request, res: Response) => {
  const { centerId } = req.params;
  const { reason } = req.validatedBody ?? req.body;
  const center = await cancelCenterSubscription(centerId, reason);
  return ok(res, center, 'Center subscription cancelled.');
});

export const platformReactivateSubscriptionHandler = asyncHandler(async (req: Request, res: Response) => {
  const { centerId } = req.params;
  const center = await reactivateCenterSubscription(centerId);
  return ok(res, center, 'Center subscription reactivated.');
});

// ---------------------------------------------------------------------------
// Center Subscription Management (CENTER_ADMIN views own subscription)
// ---------------------------------------------------------------------------

export const getMySubscriptionHandler = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.badRequest('No center context.');
  const subscription = await getCenterSubscription(centerId);
  return ok(res, subscription, 'Center subscription loaded.');
});

export const getMySubscriptionHistoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.badRequest('No center context.');
  const history = await getCenterSubscriptionHistory(centerId);
  return ok(res, history, 'Subscription history loaded.');
});

import { centerRepository } from '../repositories/center.repository';
import { subscriptionPlanRepository } from '../repositories/subscription-plan.repository';
import { billingSubscriptionRepository } from '../repositories/billing-subscription.repository';
import { teacherRepository } from '../repositories/teacher.repository';
import { studentRepository } from '../repositories/student.repository';
import { userRepository } from '../repositories/user.repository';
import { ApiError } from '../utils/ApiError';
import type { Center, SubscriptionPlan } from '@prisma/client';

export type CenterFeature =
  | 'chat'
  | 'exams'
  | 'assignments'
  | 'attendance'
  | 'payments'
  | 'analytics'
  | 'multiBranch';

export type PlanLimitResource = 'teachers' | 'students' | 'employees' | 'assistants' | 'rooms';

/**
 * Loads a center by id for platform-scope (SUPER_ADMIN) operations. Does not
 * apply tenant scoping because super admins intentionally operate cross-tenant.
 */
export async function getCenterById(id: string): Promise<Center | null> {
  return centerRepository.findById(id);
}

export async function getCenterBySlug(slug: string): Promise<Center | null> {
  return centerRepository.findBySlug(slug);
}

/** Throws when the center is not in a usable (approved + active) state. */
export function assertCenterUsable(center: Center | null): asserts center is Center {
  if (!center) throw ApiError.notFound('Center not found.');
  if (center.status !== 'ACTIVE') {
    throw ApiError.forbidden(
      'This center is not active. Please contact the platform administrator.',
      'CENTER_INACTIVE',
    );
  }
  if (center.requiresApproval) {
    throw ApiError.forbidden(
      'This center is awaiting approval from the platform administrator.',
      'CENTER_PENDING',
    );
  }
  if (center.subscriptionStatus !== 'ACTIVE') {
    throw ApiError.forbidden(
      'Your subscription is not active. Contact the administrator to reactivate access.',
      'SUBSCRIPTION_INACTIVE',
    );
  }
}

export function isFeatureEnabled(
  plan: SubscriptionPlan | null,
  feature: CenterFeature,
): boolean {
  if (!plan) return false;
  switch (feature) {
    case 'chat':
      return plan.includesChat;
    case 'exams':
      return plan.includesExams;
    case 'assignments':
      return plan.includesAssignments;
    case 'attendance':
      return plan.includesAttendance;
    case 'payments':
      return plan.includesPayments;
    case 'analytics':
      return plan.includesAnalytics;
    case 'multiBranch':
      return plan.includesMultiBranch;
    default:
      return false;
  }
}

/**
 * Resolves the plan for a center and returns whether the given feature is
 * enabled. Used by feature-lock guards across the API.
 */
export async function centerFeatureEnabled(
  centerId: string,
  feature: CenterFeature,
): Promise<boolean> {
  const center = await centerRepository.findByIdWithPlan(centerId);
  if (!center) return false;
  return isFeatureEnabled(center.plan, feature);
}

// ---------------------------------------------------------------------------
// SubscriptionPlan CRUD (for SUPER_ADMIN managing platform plans)
// ---------------------------------------------------------------------------

export async function listPlans(type?: 'CENTER' | 'TEACHER' | 'STUDENT' | 'PARENT') {
  if (type) {
    return subscriptionPlanRepository.findActiveByType(type);
  }
  return subscriptionPlanRepository.findMany({ where: { isActive: true }, orderBy: { priceMonthly: 'asc' } });
}

export async function getPlanById(id: string) {
  const plan = await subscriptionPlanRepository.findById(id);
  if (!plan) throw ApiError.notFound('Subscription plan not found.');
  return plan;
}

export async function createPlan(data: {
  name: string;
  description?: string;
  type: 'CENTER' | 'TEACHER' | 'STUDENT' | 'PARENT';
  billingPeriod?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  priceMonthly: number;
  currency?: string;
  maxTeachers?: number;
  maxStudents?: number;
  maxEmployees?: number;
  maxAssistants?: number;
  maxRooms?: number;
  commissionRate?: number;
  includesChat?: boolean;
  includesExams?: boolean;
  includesAssignments?: boolean;
  includesAttendance?: boolean;
  includesPayments?: boolean;
  includesAnalytics?: boolean;
  includesMultiBranch?: boolean;
}) {
  const existing = await subscriptionPlanRepository.findByName(data.name);
  if (existing) throw ApiError.badRequest('A plan with this name already exists.', 'PLAN_EXISTS');

  return subscriptionPlanRepository.create({
    name: data.name,
    description: data.description,
    type: data.type,
    billingPeriod: data.billingPeriod ?? 'MONTHLY',
    priceMonthly: data.priceMonthly,
    currency: data.currency ?? 'EGP',
    maxTeachers: data.maxTeachers,
    maxStudents: data.maxStudents,
    maxEmployees: data.maxEmployees,
    maxAssistants: data.maxAssistants,
    maxRooms: data.maxRooms,
    commissionRate: data.commissionRate ?? 0,
    includesChat: data.includesChat ?? true,
    includesExams: data.includesExams ?? true,
    includesAssignments: data.includesAssignments ?? true,
    includesAttendance: data.includesAttendance ?? true,
    includesPayments: data.includesPayments ?? true,
    includesAnalytics: data.includesAnalytics ?? true,
    includesMultiBranch: data.includesMultiBranch ?? false,
    isActive: true,
  });
}

export async function updatePlan(id: string, data: Partial<{
  name: string;
  description: string;
  priceMonthly: number;
  maxTeachers: number;
  maxStudents: number;
  maxEmployees: number;
  maxAssistants: number;
  maxRooms: number;
  commissionRate: number;
  includesChat: boolean;
  includesExams: boolean;
  includesAssignments: boolean;
  includesAttendance: boolean;
  includesPayments: boolean;
  includesAnalytics: boolean;
  includesMultiBranch: boolean;
  isActive: boolean;
}>) {
  const plan = await subscriptionPlanRepository.findById(id);
  if (!plan) throw ApiError.notFound('Subscription plan not found.');

  if (data.name && data.name !== plan.name) {
    const existing = await subscriptionPlanRepository.findByName(data.name);
    if (existing) throw ApiError.badRequest('A plan with this name already exists.', 'PLAN_EXISTS');
  }

  return subscriptionPlanRepository.update(id, data);
}

export async function deletePlan(id: string) {
  const plan = await subscriptionPlanRepository.findById(id);
  if (!plan) throw ApiError.notFound('Subscription plan not found.');

  // Check if any centers are using this plan
  const centersUsingPlan = await centerRepository.count({ planId: id });
  if (centersUsingPlan > 0) {
    throw ApiError.badRequest('Cannot delete a plan that is being used by centers.', 'PLAN_IN_USE');
  }

  return subscriptionPlanRepository.delete(id);
}

export async function assignPlanToCenter(centerId: string, planId: string) {
  const center = await centerRepository.findById(centerId);
  if (!center) throw ApiError.notFound('Center not found.');

  const plan = await subscriptionPlanRepository.findById(planId);
  if (!plan) throw ApiError.notFound('Subscription plan not found.');
  if (!plan.isActive) throw ApiError.badRequest('Cannot assign an inactive plan.', 'PLAN_INACTIVE');

  return centerRepository.update(centerId, {
    plan: { connect: { id: plan.id } },
    subscriptionStatus: 'ACTIVE',
    subscriptionStartsAt: new Date(),
  });
}

/**
 * Counts the current usage of a resource for a given center.
 */
async function countResource(centerId: string, resource: PlanLimitResource): Promise<number> {
  switch (resource) {
    case 'teachers':
      return teacherRepository.count({ centerId });
    case 'students':
      return studentRepository.count({ centerId });
    case 'employees':
      return userRepository.count({
        centerId,
        role: { in: ['CENTER_EMPLOYEE', 'RECEPTIONIST'] },
      } as any);
    case 'assistants':
      return userRepository.count({
        centerId,
        role: 'TEACHER_ASSISTANT',
      } as any);
    case 'rooms':
      return centerRepository.countLocations({ centerId });
    default:
      return 0;
  }
}

/**
 * Asserts that the center has not exceeded the plan limit for the given resource.
 * If the plan has no limit (null), the check passes.
 * Throws a 402 Payment Required error when the limit is reached.
 */
export async function assertWithinPlanLimit(
  centerId: string,
  resource: PlanLimitResource,
): Promise<void> {
  const center = await centerRepository.findByIdWithPlan(centerId);
  if (!center || !center.plan) return;

  const limitField = `max${resource.charAt(0).toUpperCase()}${resource.slice(1)}` as keyof SubscriptionPlan;
  const limit = center.plan[limitField];
  if (limit === null || limit === undefined) return;

  const current = await countResource(centerId, resource);
  if (current >= (limit as number)) {
    throw ApiError.paymentRequired(
      `Your plan allows a maximum of ${limit} ${resource}. Please upgrade your plan to add more.`,
      'PLAN_LIMIT_REACHED',
    );
  }
}

// ---------------------------------------------------------------------------
// Center Subscription Management
// ---------------------------------------------------------------------------

/**
 * Get the current subscription state for a center (plan, status, dates).
 */
export async function getCenterSubscription(centerId: string) {
  const center = await centerRepository.findByIdWithPlan(centerId);
  if (!center) throw ApiError.notFound('Center not found.');

  return {
    centerId: center.id,
    centerName: center.name,
    subscriptionStatus: center.subscriptionStatus,
    plan: center.plan
      ? {
          id: center.plan.id,
          name: center.plan.name,
          type: center.plan.type,
          priceMonthly: center.plan.priceMonthly,
          currency: center.plan.currency,
          commissionRate: center.plan.commissionRate,
          billingPeriod: center.plan.billingPeriod,
        }
      : null,
    startedAt: center.subscriptionStartsAt,
    expiresAt: center.subscriptionExpiresAt,
    cancelledAt: center.cancelledAt,
    cancelledReason: center.cancelledReason,
  };
}

/**
 * Change the center's subscription plan (SUPER_ADMIN only).
 * Sets the subscription to ACTIVE with a new start date.
 */
export async function changeCenterPlan(
  centerId: string,
  planId: string,
  billingPeriod?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
  startDate?: Date,
) {
  const center = await centerRepository.findById(centerId);
  if (!center) throw ApiError.notFound('Center not found.');

  const plan = await subscriptionPlanRepository.findById(planId);
  if (!plan) throw ApiError.notFound('Subscription plan not found.');
  if (!plan.isActive) throw ApiError.badRequest('Cannot assign an inactive plan.', 'PLAN_INACTIVE');
  if (plan.type !== 'CENTER') throw ApiError.badRequest('The selected plan is not a center plan.');

  const start = startDate ?? new Date();
  const period = billingPeriod ?? plan.billingPeriod;
  const end = new Date(start);
  if (period === 'QUARTERLY') end.setMonth(end.getMonth() + 3);
  else if (period === 'YEARLY') end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);

  return centerRepository.update(centerId, {
    plan: { connect: { id: plan.id } },
    subscriptionStatus: 'ACTIVE',
    subscriptionStartsAt: start,
    subscriptionExpiresAt: end,
    cancelledAt: null,
    cancelledReason: null,
  });
}

/**
 * Cancel the center's subscription (SUPER_ADMIN only).
 */
export async function cancelCenterSubscription(centerId: string, reason: string) {
  const center = await centerRepository.findById(centerId);
  if (!center) throw ApiError.notFound('Center not found.');
  if (center.subscriptionStatus === 'CANCELLED') {
    throw ApiError.badRequest('Subscription is already cancelled.');
  }

  return centerRepository.update(centerId, {
    subscriptionStatus: 'CANCELLED',
    cancelledAt: new Date(),
    cancelledReason: reason,
  });
}

/**
 * Reactivate a cancelled or expired center subscription (SUPER_ADMIN only).
 */
export async function reactivateCenterSubscription(centerId: string) {
  const center = await centerRepository.findById(centerId);
  if (!center) throw ApiError.notFound('Center not found.');
  if (center.subscriptionStatus === 'ACTIVE') {
    throw ApiError.badRequest('Subscription is already active.');
  }
  if (!center.planId) {
    throw ApiError.badRequest('Cannot reactivate without an assigned plan. Assign a plan first.');
  }

  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);

  return centerRepository.update(centerId, {
    subscriptionStatus: 'ACTIVE',
    subscriptionStartsAt: now,
    subscriptionExpiresAt: end,
    cancelledAt: null,
    cancelledReason: null,
  });
}

/**
 * Get subscription history for a center (past billing subscriptions).
 */
export async function getCenterSubscriptionHistory(centerId: string) {
  const center = await centerRepository.findById(centerId);
  if (!center) throw ApiError.notFound('Center not found.');

  const subscriptions = await billingSubscriptionRepository.findMany({
    where: { centerId },
    orderBy: { createdAt: 'desc' },
    include: {
      student: { include: { user: { select: { fullName: true } } } },
      teacher: { include: { user: { select: { fullName: true } } } },
      payments: { select: { id: true, status: true, amount: true } },
    },
  } as any) as any[];

  return subscriptions.map((s) => ({
    id: s.id,
    student: s.student ? { id: s.student.id, fullName: s.student.user.fullName } : null,
    teacher: s.teacher ? { id: s.teacher.id, fullName: s.teacher.user.fullName } : null,
    monthlyPrice: s.monthlyPrice,
    paymentMethod: s.paymentMethod,
    startDate: s.startDate,
    endDate: s.endDate,
    status: s.status,
    createdAt: s.createdAt,
    payments: s.payments,
  }));
}

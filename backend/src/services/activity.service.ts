import { activityRepository } from '../repositories/activity.repository';
import { currentCenterId } from '../lib/tenant';

export type ActivityCategory =
  | 'SECURITY'
  | 'FINANCE'
  | 'OPERATIONS'
  | 'SETTINGS'
  | 'COMMUNICATION';

export type ActivityResult = 'SUCCESS' | 'DENIED' | 'WARNING';

export interface ActivityLogInput {
  userId?: string | null;
  role?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  category?: ActivityCategory;
  result?: ActivityResult;
}

/** Best-effort category derived from the action/entity when none is provided. */
export function inferActivityCategory(
  action: string,
  entity: string,
  fallback: ActivityCategory = 'OPERATIONS',
): ActivityCategory {
  const text = `${action} ${entity}`.toLowerCase();
  if (/finance|payment|expense|invoice|settlement|wallet|subscription/.test(text)) return 'FINANCE';
  if (/security|permission|role|auth|login|password|access|otp/.test(text)) return 'SECURITY';
  if (/communication|message|broadcast|complaint|notification/.test(text)) return 'COMMUNICATION';
  if (/settings|config|escalation|comparison|navigation/.test(text)) return 'SETTINGS';
  return fallback;
}

/** Records an important action for monitoring and auditing purposes. */
export async function recordActivity(input: ActivityLogInput): Promise<void> {
  try {
    await activityRepository.create({
      userId: input.userId ?? null,
      centerId: currentCenterId() ?? null,
      role: input.role ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      details: input.details ?? null,
      category: input.category ?? inferActivityCategory(input.action, input.entity),
      result: input.result ?? 'SUCCESS',
    });
  } catch {
    // Auditing must never break the main request flow.
  }
}

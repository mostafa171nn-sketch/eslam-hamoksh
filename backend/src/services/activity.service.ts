import { activityRepository } from '../repositories/activity.repository';
import { currentCenterId } from '../lib/tenant';

export interface ActivityLogInput {
  userId?: string | null;
  role?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
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
    });
  } catch {
    // Auditing must never break the main request flow.
  }
}

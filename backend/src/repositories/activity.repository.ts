import { prisma } from '../lib/prisma';

interface ActivityLogCreateData {
  userId?: string | null;
  centerId?: string | null;
  role?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
}

export const activityRepository = {
  create(data: ActivityLogCreateData) {
    return prisma.activityLog.create({ data });
  },
};

import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const centerRepository = {
  findById(id: string) {
    return prisma.center.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return prisma.center.findUnique({ where: { slug } });
  },

  findByIdWithPlan(id: string) {
    return prisma.center.findUnique({ where: { id }, include: { plan: true } });
  },

  findMany(args: Prisma.CenterFindManyArgs) {
    return prisma.center.findMany(args);
  },

  create(data: Prisma.CenterCreateInput) {
    return prisma.center.create({ data });
  },

  update(id: string, data: Prisma.CenterUpdateInput, tx?: any) {
    const client = tx || prisma;
    return client.center.update({ where: { id }, data });
  },

  count(where: Prisma.CenterWhereInput) {
    return prisma.center.count({ where });
  },

  groupBy(args: any) {
    return prisma.center.groupBy(args);
  },

  // ── Transaction: approve center + activate admin ────────────────────

  approveWithAdmin(
    centerId: string,
    centerData: Prisma.CenterUpdateInput,
    adminWhere: Prisma.UserWhereInput,
    adminData: Prisma.UserUpdateInput,
  ) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.center.update({
        where: { id: centerId },
        data: centerData,
      });
      await tx.user.updateMany({
        where: adminWhere,
        data: adminData,
      });
      return updated;
    });
  },

  // ── Center settings ─────────────────────────────────────────────────

  findSettings(centerId: string) {
    return prisma.centerSettings.findUnique({ where: { centerId } });
  },

  upsertSettings(centerId: string, create: any, update: any) {
    return prisma.centerSettings.upsert({
      where: { centerId },
      create: { centerId, ...create },
      update,
    });
  },

  // ── Subscription plans ──────────────────────────────────────────────

  findActivePlan() {
    return prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
  },

  findPlanById(id: string) {
    return prisma.subscriptionPlan.findUnique({ where: { id } });
  },

  countLocations(where: Prisma.LocationWhereInput) {
    return prisma.location.count({ where });
  },
};

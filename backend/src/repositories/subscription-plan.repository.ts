import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const subscriptionPlanRepository = {
  findById(id: string) {
    return prisma.subscriptionPlan.findUnique({ where: { id } });
  },

  findByName(name: string) {
    return prisma.subscriptionPlan.findUnique({ where: { name } });
  },

  findMany(args: Prisma.SubscriptionPlanFindManyArgs) {
    return prisma.subscriptionPlan.findMany(args);
  },

  findActiveByType(type: 'CENTER' | 'TEACHER' | 'STUDENT' | 'PARENT') {
    return prisma.subscriptionPlan.findMany({
      where: { type, isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
  },

  create(data: Prisma.SubscriptionPlanCreateInput) {
    return prisma.subscriptionPlan.create({ data });
  },

  update(id: string, data: Prisma.SubscriptionPlanUpdateInput) {
    return prisma.subscriptionPlan.update({ where: { id }, data });
  },

  upsertByName(name: string, create: Prisma.SubscriptionPlanCreateInput, update: Prisma.SubscriptionPlanUpdateInput) {
    return prisma.subscriptionPlan.upsert({
      where: { name },
      create,
      update,
    });
  },

  delete(id: string) {
    return prisma.subscriptionPlan.delete({ where: { id } });
  },

  count(where?: Prisma.SubscriptionPlanWhereInput) {
    return prisma.subscriptionPlan.count({ where });
  },
};

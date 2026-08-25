import { prisma } from '../lib/prisma';
import { Prisma, SubscriptionStatus } from '@prisma/client';

export const billingSubscriptionRepository = {
  findById(id: string) {
    return prisma.billingSubscription.findUnique({
      where: { id },
      include: {
        student: { include: { user: { select: { fullName: true, photo: true } } } },
        teacher: { include: { user: { select: { fullName: true } } } },
        parent: { include: { user: { select: { fullName: true } } } },
        payments: { select: { id: true, status: true, amount: true } },
      },
    });
  },

  findMany(args: Prisma.BillingSubscriptionFindManyArgs) {
    return prisma.billingSubscription.findMany(args);
  },

  create(data: Prisma.BillingSubscriptionCreateInput) {
    return prisma.billingSubscription.create({ data });
  },

  update(id: string, data: Prisma.BillingSubscriptionUpdateInput) {
    return prisma.billingSubscription.update({ where: { id }, data });
  },

  count(where: Prisma.BillingSubscriptionWhereInput) {
    return prisma.billingSubscription.count({ where });
  },

  activate(id: string) {
    return prisma.billingSubscription.update({
      where: { id },
      data: { status: SubscriptionStatus.ACTIVE },
    });
  },

  cancel(id: string) {
    return prisma.billingSubscription.update({
      where: { id },
      data: { status: SubscriptionStatus.CANCELLED },
    });
  },

  expireMany(ids: string[]) {
    return prisma.billingSubscription.updateMany({
      where: { id: { in: ids } },
      data: { status: SubscriptionStatus.EXPIRED },
    });
  },

  findExpired(now: Date) {
    return prisma.billingSubscription.findMany({
      where: { status: 'ACTIVE', endDate: { lt: now } },
      select: { id: true },
    });
  },

  findByStudentAndTeacher(studentId: string, teacherId: string) {
    return prisma.billingSubscription.findFirst({
      where: { studentId, teacherId, status: { not: 'CANCELLED' } },
      orderBy: { createdAt: 'desc' },
    });
  },

  findActiveByStudent(studentId: string) {
    return prisma.billingSubscription.findMany({
      where: { studentId, status: 'ACTIVE' },
      include: {
        teacher: { include: { user: { select: { fullName: true } } } },
      },
    });
  },

  findActiveByTeacher(teacherId: string) {
    return prisma.billingSubscription.findMany({
      where: { teacherId, status: 'ACTIVE' },
      include: {
        student: { include: { user: { select: { fullName: true, photo: true } } } },
      },
    });
  },

  findActiveByCenter(centerId: string) {
    return prisma.billingSubscription.findMany({
      where: { centerId, status: 'ACTIVE' },
      include: {
        student: { include: { user: { select: { fullName: true, photo: true } } } },
        teacher: { include: { user: { select: { fullName: true } } } },
      },
    });
  },
};

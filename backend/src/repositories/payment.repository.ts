import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const paymentRepository = {
  findById(id: string) {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        student: { include: { user: { select: { fullName: true, photo: true } } } },
        teacher: { include: { user: { select: { fullName: true } } } },
        parent: { include: { user: { select: { fullName: true } } } },
        lesson: { include: { subject: true } },
        billingSubscription: true,
        history: { orderBy: { createdAt: 'asc' as const } },
      },
    });
  },

  findUnique(args: Prisma.PaymentFindUniqueArgs) {
    return prisma.payment.findUnique(args);
  },

  findMany(args: Prisma.PaymentFindManyArgs) {
    return prisma.payment.findMany(args);
  },

  count(where: Prisma.PaymentWhereInput) {
    return prisma.payment.count({ where });
  },

  aggregate(args: Prisma.PaymentAggregateArgs) {
    return prisma.payment.aggregate(args);
  },

  groupBy(args: any) {
    return prisma.payment.groupBy(args);
  },

  createWithHistory(paymentData: Prisma.PaymentCreateInput, historyData: any, tx?: any) {
    const client = tx || prisma;
    return client.payment.create({
      data: {
        ...paymentData,
        history: {
          create: historyData,
        },
      },
    });
  },

  updateStatus(id: string, data: Prisma.PaymentUpdateInput, tx?: any) {
    const client = tx || prisma;
    return client.payment.update({ where: { id }, data });
  },

  createStatusHistory(data: Prisma.PaymentStatusHistoryCreateInput, tx?: any) {
    const client = tx || prisma;
    return client.paymentStatusHistory.create({ data });
  },

  findMaxPaymentNumber(tx?: any) {
    const client = tx || prisma;
    return client.payment.findFirst({
      orderBy: { paymentNumber: 'desc' },
      select: { paymentNumber: true },
    });
  },

  findManyForExport(args: Prisma.PaymentFindManyArgs) {
    return prisma.payment.findMany({ ...args, take: 100000 });
  },
};

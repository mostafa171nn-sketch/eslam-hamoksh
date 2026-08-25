import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const settlementRepository = {
  findById(id: string) {
    return prisma.settlement.findUnique({
      where: { id },
      include: {
        center: { select: { id: true, name: true } },
        teacher: { include: { user: { select: { fullName: true, username: true } } } },
      },
    });
  },

  findMany(args: Prisma.SettlementFindManyArgs) {
    return prisma.settlement.findMany(args);
  },

  count(where: Prisma.SettlementWhereInput) {
    return prisma.settlement.count({ where });
  },

  create(data: Prisma.SettlementCreateInput, tx?: any) {
    const client = tx || prisma;
    return client.settlement.create({ data });
  },

  update(id: string, data: Prisma.SettlementUpdateInput, tx?: any) {
    const client = tx || prisma;
    return client.settlement.update({ where: { id }, data });
  },

  findByPeriod(centerId: string, teacherId: string, period: string) {
    return prisma.settlement.findFirst({
      where: { centerId, teacherId, period },
    });
  },

  findPendingByCenter(centerId: string) {
    return prisma.settlement.findMany({
      where: { centerId, status: 'PENDING' },
      include: {
        teacher: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  findMaxSettlementNumber(tx?: any) {
    const client = tx || prisma;
    return client.settlement.findFirst({
      orderBy: { settlementNumber: 'desc' },
      select: { settlementNumber: true },
    });
  },

  aggregate(where: Prisma.SettlementWhereInput) {
    return prisma.settlement.aggregate({
      where,
      _sum: { grossAmount: true, platformCommission: true, teacherShare: true, centerShare: true, netAmount: true },
      _count: true,
    });
  },

  findManyForExport(args: Prisma.SettlementFindManyArgs) {
    return prisma.settlement.findMany({ ...args, take: 100000 });
  },
};

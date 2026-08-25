import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const walletTransactionRepository = {
  findById(id: string) {
    return prisma.walletTransaction.findUnique({ where: { id } });
  },

  findMany(args: Prisma.WalletTransactionFindManyArgs) {
    return prisma.walletTransaction.findMany(args);
  },

  findByWalletId(walletId: string, page = 1, limit = 20) {
    return prisma.walletTransaction.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  },

  countByWalletId(walletId: string) {
    return prisma.walletTransaction.count({ where: { walletId } });
  },

  create(data: Prisma.WalletTransactionCreateInput, tx?: any) {
    const client = tx || prisma;
    return client.walletTransaction.create({ data });
  },

  findByReferenceType(referenceType: string, referenceId: string) {
    return prisma.walletTransaction.findMany({
      where: { referenceType, referenceId },
      orderBy: { createdAt: 'desc' },
    });
  },

  findByUserId(userId: string, page = 1, limit = 20) {
    return prisma.walletTransaction.findMany({
      where: { wallet: { userId } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { wallet: { select: { id: true, userId: true } } },
    });
  },

  countByUserId(userId: string) {
    return prisma.walletTransaction.count({
      where: { wallet: { userId } },
    });
  },

  aggregateByWalletId(walletId: string) {
    return prisma.walletTransaction.aggregate({
      where: { walletId },
      _sum: { amount: true },
      _count: true,
    });
  },

  findManyForExport(args: Prisma.WalletTransactionFindManyArgs) {
    return prisma.walletTransaction.findMany({ ...args, take: 100000 });
  },
};

import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const walletRepository = {
  findById(id: string) {
    return prisma.wallet.findUnique({
      where: { id },
      include: { user: { select: { id: true, fullName: true, username: true } } },
    });
  },

  findByUserId(userId: string) {
    return prisma.wallet.findUnique({
      where: { userId },
      include: { user: { select: { id: true, fullName: true, username: true } } },
    });
  },

  findMany(args: Prisma.WalletFindManyArgs) {
    return prisma.wallet.findMany(args);
  },

  count(where: Prisma.WalletWhereInput) {
    return prisma.wallet.count({ where });
  },

  create(data: Prisma.WalletCreateInput, tx?: any) {
    const client = tx || prisma;
    return client.wallet.create({ data });
  },

  update(id: string, data: Prisma.WalletUpdateInput, tx?: any) {
    const client = tx || prisma;
    return client.wallet.update({ where: { id }, data });
  },

  incrementBalance(id: string, amount: number, tx?: any) {
    const client = tx || prisma;
    return client.wallet.update({
      where: { id },
      data: { balance: { increment: amount } },
    });
  },

  decrementBalance(id: string, amount: number, tx?: any) {
    const client = tx || prisma;
    return client.wallet.update({
      where: { id },
      data: { balance: { decrement: amount } },
    });
  },

  findByCenterId(centerId: string) {
    return prisma.wallet.findMany({
      where: { centerId },
      include: { user: { select: { id: true, fullName: true, username: true } } },
    });
  },

  upsertByUserId(userId: string, create: Prisma.WalletCreateInput, update: Prisma.WalletUpdateInput, tx?: any) {
    const client = tx || prisma;
    return client.wallet.upsert({
      where: { userId },
      create,
      update,
    });
  },
};

import { prisma } from '../lib/prisma';
import { Prisma, NotificationType } from '@prisma/client';

export const notificationRepository = {
  async createMany(items: { userId: string; type?: NotificationType; title: string; message: string }[]) {
    return prisma.notification.createMany({
      data: items.map(n => ({ ...n, type: n.type ?? 'GENERAL' })),
    });
  },

  async findMany(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [notifications, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return { notifications, total, unread };
  },

  count(where: Prisma.NotificationWhereInput) {
    return prisma.notification.count({ where });
  },

  markRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  },

  markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  },
};

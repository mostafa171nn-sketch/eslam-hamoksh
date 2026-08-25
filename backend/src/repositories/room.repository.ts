import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const roomRepository = {
  findById(id: string) {
    return prisma.room.findUnique({
      where: { id },
      include: {
        location: true,
        center: { select: { id: true, name: true } },
      },
    });
  },

  findMany(args: Prisma.RoomFindManyArgs) {
    return prisma.room.findMany(args);
  },

  create(data: Prisma.RoomCreateInput) {
    return prisma.room.create({ data });
  },

  update(id: string, data: Prisma.RoomUpdateInput) {
    return prisma.room.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.room.delete({ where: { id } });
  },

  count(where: Prisma.RoomWhereInput) {
    return prisma.room.count({ where });
  },

  findByName(centerId: string, name: string) {
    return prisma.room.findFirst({
      where: { centerId, name },
    });
  },

  findActiveByCenter(centerId: string) {
    return prisma.room.findMany({
      where: { centerId, status: 'ACTIVE' },
      include: { location: true },
      orderBy: { name: 'asc' },
    });
  },

  findAvailableForLesson(centerId: string, date: Date, startTime: string, endTime: string, excludeLessonId?: string) {
    return prisma.room.findMany({
      where: {
        centerId,
        status: 'ACTIVE',
        lessons: {
          some: {
            date,
            startTime: { lt: endTime },
            endTime: { gt: startTime },
            status: { not: 'CANCELLED' },
            ...(excludeLessonId ? { id: { not: excludeLessonId } } : {}),
          },
        },
      },
    });
  },
};

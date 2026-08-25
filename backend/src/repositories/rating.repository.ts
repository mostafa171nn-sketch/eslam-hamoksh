import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const ratingRepository = {
  findById(id: string) {
    return prisma.rating.findUnique({ where: { id } });
  },

  upsertByStudent(teacherId: string, studentId: string, stars: number, comment?: string) {
    return prisma.rating.upsert({
      where: { teacherId_studentId: { teacherId, studentId } },
      create: { teacherId, studentId, stars, comment },
      update: { stars, comment },
    });
  },

  upsertByParent(teacherId: string, parentId: string, stars: number, comment?: string) {
    return prisma.rating.upsert({
      where: { teacherId_parentId: { teacherId, parentId } },
      create: { teacherId, parentId, stars, comment },
      update: { stars, comment },
    });
  },

  findMany<T extends Prisma.RatingFindManyArgs>(args: T) {
    return prisma.rating.findMany(args);
  },

  count(where: Prisma.RatingWhereInput) {
    return prisma.rating.count({ where });
  },

  aggregate(where: Prisma.RatingWhereInput) {
    return prisma.rating.aggregate({
      where,
      _avg: { stars: true },
      _count: true,
    });
  },

  findRecentReviews(teacherId: string, limit: number) {
    return prisma.rating.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' as const },
      take: limit,
      include: {
        student: { include: { user: { select: { fullName: true, photo: true } } } },
        parent: { include: { user: { select: { fullName: true, photo: true } } } },
      },
    });
  },
};

import { prisma } from '../lib/prisma';
import { Prisma, LessonStatus } from '@prisma/client';

export const lessonRepository = {
  findById(id: string) {
    return prisma.lesson.findUnique({ where: { id } });
  },

  findUnique(where: Prisma.LessonWhereUniqueInput, include?: Prisma.LessonInclude) {
    return prisma.lesson.findUnique({ where: where as any, include });
  },

  findMany(args: Prisma.LessonFindManyArgs) {
    return prisma.lesson.findMany(args);
  },

  create(data: Prisma.LessonCreateInput) {
    return prisma.lesson.create({ data });
  },

  update(id: string, data: Prisma.LessonUpdateInput) {
    return prisma.lesson.update({ where: { id }, data });
  },

  count(where: Prisma.LessonWhereInput) {
    return prisma.lesson.count({ where });
  },

  groupBy(args: any) {
    return prisma.lesson.groupBy(args);
  },

  findConflicting(teacherId: string, studentId: string, date: Date, excludeId?: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.lesson.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        status: { in: [LessonStatus.SCHEDULED, LessonStatus.RESCHEDULED] },
        OR: [{ teacherId }, { studentId }],
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  },

  findScheduledByTeacherAndDateRange(teacherId: string, from: Date, to: Date) {
    return prisma.lesson.findMany({
      where: {
        teacherId,
        date: { gte: from, lt: to },
        status: { in: [LessonStatus.SCHEDULED, LessonStatus.RESCHEDULED] },
      },
      select: { date: true, startTime: true, endTime: true, studentId: true },
    });
  },

  findForPayment(id: string) {
    return prisma.lesson.findUnique({
      where: { id },
      select: { teacherId: true, studentId: true, status: true },
    });
  },
};

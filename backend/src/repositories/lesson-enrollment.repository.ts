import { prisma } from '../lib/prisma';
import { Prisma, LessonEnrollmentStatus } from '@prisma/client';

export const lessonEnrollmentRepository = {
  findById(id: string) {
    return prisma.lessonEnrollment.findUnique({
      where: { id },
      include: {
        lesson: true,
        student: { include: { user: { select: { fullName: true, photo: true } } } },
      },
    });
  },

  findMany(args: Prisma.LessonEnrollmentFindManyArgs) {
    return prisma.lessonEnrollment.findMany(args);
  },

  create(data: Prisma.LessonEnrollmentCreateInput) {
    return prisma.lessonEnrollment.create({ data });
  },

  update(id: string, data: Prisma.LessonEnrollmentUpdateInput) {
    return prisma.lessonEnrollment.update({ where: { id }, data });
  },

  count(where: Prisma.LessonEnrollmentWhereInput) {
    return prisma.lessonEnrollment.count({ where });
  },

  findByLessonAndStudent(lessonId: string, studentId: string) {
    return prisma.lessonEnrollment.findUnique({
      where: { lessonId_studentId: { lessonId, studentId } },
    });
  },

  findActiveByLesson(lessonId: string) {
    return prisma.lessonEnrollment.findMany({
      where: { lessonId, status: 'ENROLLED' },
      include: {
        student: { include: { user: { select: { fullName: true, photo: true } } } },
      },
      orderBy: { enrolledAt: 'asc' },
    });
  },

  findActiveByStudent(studentId: string) {
    return prisma.lessonEnrollment.findMany({
      where: { studentId, status: 'ENROLLED' },
      include: {
        lesson: {
          include: {
            teacher: { include: { user: { select: { fullName: true } } } },
            subject: true,
            room: true,
          },
        },
      },
      orderBy: { lesson: { date: 'asc' } },
    });
  },

  countActiveByLesson(lessonId: string) {
    return prisma.lessonEnrollment.count({
      where: { lessonId, status: 'ENROLLED' },
    });
  },

  cancelEnrollment(id: string) {
    return prisma.lessonEnrollment.update({
      where: { id },
      data: { status: LessonEnrollmentStatus.CANCELLED },
    });
  },

  complete(id: string) {
    return prisma.lessonEnrollment.update({
      where: { id },
      data: { status: LessonEnrollmentStatus.COMPLETED },
    });
  },

  findStudentConflict(studentId: string, date: Date, startTime: string, endTime: string, excludeLessonId?: string) {
    return prisma.lessonEnrollment.findFirst({
      where: {
        studentId,
        status: 'ENROLLED',
        lesson: {
          date,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          status: { not: 'CANCELLED' },
          ...(excludeLessonId ? { id: { not: excludeLessonId } } : {}),
        },
      },
      include: { lesson: { select: { id: true, startTime: true, endTime: true } } },
    });
  },
};

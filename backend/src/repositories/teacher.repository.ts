import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const teacherRepository = {
  findById(id: string) {
    return prisma.teacher.findUnique({ where: { id } });
  },

  findByUserId(userId: string) {
    return prisma.teacher.findUnique({ where: { userId } });
  },

  findUnique(where: Prisma.TeacherWhereUniqueInput, include?: Prisma.TeacherInclude) {
    return prisma.teacher.findUnique({ where: where as any, include });
  },

  findMany(args: Prisma.TeacherFindManyArgs) {
    return prisma.teacher.findMany(args);
  },

  create(data: Prisma.TeacherCreateInput) {
    return prisma.teacher.create({ data });
  },

  update(id: string, data: Prisma.TeacherUpdateInput) {
    return prisma.teacher.update({ where: { id }, data });
  },

  count(where: Prisma.TeacherWhereInput) {
    return prisma.teacher.count({ where });
  },

  deleteTeacherSubjects(teacherId: string) {
    return prisma.teacherSubject.deleteMany({ where: { teacherId } });
  },

  createTeacherSubjects(data: { teacherId: string; subjectId: string }[]) {
    return prisma.teacherSubject.createMany({ data });
  },

  deleteTeacherGrades(teacherId: string) {
    return prisma.teacherGrade.deleteMany({ where: { teacherId } });
  },

  createTeacherGrades(data: { teacherId: string; gradeId: string }[]) {
    return prisma.teacherGrade.createMany({ data });
  },

  deleteAvailability(teacherId: string) {
    return prisma.teacherAvailability.deleteMany({ where: { teacherId } });
  },

  createAvailability(
    data: {
      teacherId: string;
      day: number;
      startTime: string;
      endTime: string;
      locationId?: string | null;
    }[]
  ) {
    return prisma.teacherAvailability.createMany({ data });
  },

  findAvailability(teacherId: string) {
    return prisma.teacherAvailability.findMany({
      where: { teacherId },
      include: { location: true },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });
  },

  findAvailabilityByDay(teacherId: string, day: number) {
    return prisma.teacherAvailability.findMany({
      where: { teacherId, day },
      orderBy: { startTime: 'asc' },
    });
  },

  findPaymentSettings(teacherId: string) {
    return prisma.teacherPaymentSettings.findUnique({ where: { teacherId } });
  },

  upsertPaymentSettings(teacherId: string, create: any, update: any) {
    return prisma.teacherPaymentSettings.upsert({
      where: { teacherId },
      create: { teacherId, ...create },
      update,
    });
  },

  findTeacherStudent(teacherId: string, studentId: string) {
    return prisma.teacherStudent.findUnique({
      where: { teacherId_studentId: { teacherId, studentId } },
    });
  },

  findTeacherStudentsByTeacher(teacherId: string) {
    return prisma.teacherStudent.findMany({
      where: { teacherId },
      select: { studentId: true },
    });
  },

  findTeacherStudentsByStudent(studentId: string) {
    return prisma.teacherStudent.findMany({
      where: { studentId },
      include: {
        teacher: {
          include: {
            user: { select: { id: true, fullName: true, photo: true } },
            subjects: {
              select: { subject: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
  },

  countTeacherStudents(teacherId: string) {
    return prisma.teacherStudent.count({ where: { teacherId } });
  },

  findFirstTeacherStudent(where: Prisma.TeacherStudentWhereInput) {
    return prisma.teacherStudent.findFirst({ where });
  },

  findManyTeacherStudents(args: Prisma.TeacherStudentFindManyArgs) {
    return prisma.teacherStudent.findMany(args);
  },

  aggregateRating(teacherId: string) {
    return prisma.rating.aggregate({
      where: { teacherId },
      _avg: { stars: true },
      _count: { stars: true },
    });
  },

  groupByRating(teacherIds: string[]) {
    return prisma.rating.groupBy({
      by: ['teacherId'],
      where: { teacherId: { in: teacherIds } },
      _avg: { stars: true },
      _count: { stars: true },
    });
  },
};

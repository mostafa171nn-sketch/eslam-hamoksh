import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const teacherAssistantRepository = {
  findUnique(args: Prisma.TeacherAssistantFindUniqueArgs) {
    return prisma.teacherAssistant.findUnique(args);
  },

  findMany(args: Prisma.TeacherAssistantFindManyArgs) {
    return prisma.teacherAssistant.findMany(args);
  },

  findFirst(args: Prisma.TeacherAssistantFindFirstArgs) {
    return prisma.teacherAssistant.findFirst(args);
  },

  create(data: Prisma.TeacherAssistantCreateInput) {
    return prisma.teacherAssistant.create({ data });
  },

  createMany(data: { assistantId: string; teacherId: string; centerId?: string }[]) {
    return prisma.teacherAssistant.createMany({ data });
  },

  delete(args: Prisma.TeacherAssistantDeleteArgs) {
    return prisma.teacherAssistant.delete(args);
  },

  deleteMany(args: Prisma.TeacherAssistantDeleteManyArgs) {
    return prisma.teacherAssistant.deleteMany(args);
  },

  count(args: Prisma.TeacherAssistantCountArgs) {
    return prisma.teacherAssistant.count(args);
  },

  findByAssistantAndTeacher(assistantId: string, teacherId: string) {
    return prisma.teacherAssistant.findUnique({
      where: { assistantId_teacherId: { assistantId, teacherId } },
    });
  },

  findTeacherIdsForAssistant(assistantId: string): Promise<string[]> {
    return prisma.teacherAssistant
      .findMany({ where: { assistantId }, select: { teacherId: true } })
      .then((rows) => rows.map((r) => r.teacherId));
  },

  findAssistantIdsForTeacher(teacherId: string): Promise<string[]> {
    return prisma.teacherAssistant
      .findMany({ where: { teacherId }, select: { assistantId: true } })
      .then((rows) => rows.map((r) => r.assistantId));
  },

  findTeachersForAssistant(assistantId: string) {
    return prisma.teacherAssistant.findMany({
      where: { assistantId },
      include: {
        teacher: {
          include: {
            user: { select: { id: true, fullName: true, photo: true } },
          },
        },
      },
    });
  },

  upsert(assistantId: string, teacherId: string, centerId?: string) {
    return prisma.teacherAssistant.upsert({
      where: { assistantId_teacherId: { assistantId, teacherId } },
      create: { assistantId, teacherId, centerId: centerId ?? null },
      update: {},
    });
  },
};

import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const studentRepository = {
  findById(id: string) {
    return prisma.student.findUnique({ where: { id } });
  },

  findByUserId(userId: string) {
    return prisma.student.findUnique({ where: { userId } });
  },

  findByStudentNumber(studentNumber: string) {
    return prisma.student.findUnique({ where: { studentNumber } });
  },

  findUnique<T extends Prisma.StudentFindUniqueArgs>(args: T) {
    return prisma.student.findUnique(args);
  },

  findMany(args: Prisma.StudentFindManyArgs) {
    return prisma.student.findMany(args);
  },

  create(data: Prisma.StudentCreateInput) {
    return prisma.student.create({ data });
  },

  update(id: string, data: Prisma.StudentUpdateInput) {
    return prisma.student.update({ where: { id }, data });
  },

  count(where: Prisma.StudentWhereInput) {
    return prisma.student.count({ where });
  },

  deleteStudentSubjects(studentId: string) {
    return prisma.studentSubject.deleteMany({ where: { studentId } });
  },

  createStudentSubjects(data: { studentId: string; subjectId: string }[]) {
    return prisma.studentSubject.createMany({ data });
  },

  findParentStudent(parentId: string, studentId: string) {
    return prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
    });
  },

  upsertParentStudent(parentId: string, studentId: string) {
    return prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      create: { parentId, studentId },
      update: {},
    });
  },

  deleteParentStudent(parentId: string, studentId: string) {
    return prisma.parentStudent.delete({
      where: { parentId_studentId: { parentId, studentId } },
    });
  },

  findParentStudents(parentId: string) {
    return prisma.parentStudent.findMany({ where: { parentId } });
  },
};

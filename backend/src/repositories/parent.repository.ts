import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const parentRepository = {
  findById(id: string) {
    return prisma.parent.findUnique({ where: { id } });
  },

  findByUserId(userId: string) {
    return prisma.parent.findUnique({ where: { userId } });
  },

  findUnique<T extends Prisma.ParentFindUniqueArgs>(args: T) {
    return prisma.parent.findUnique(args);
  },

  create(data: Prisma.ParentCreateInput) {
    return prisma.parent.create({ data });
  },

  count(where: Prisma.ParentWhereInput) {
    return prisma.parent.count({ where });
  },

  findParentStudent(parentId: string, studentId: string) {
    return prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
    });
  },

  findParentStudents(parentId: string) {
    return prisma.parentStudent.findMany({
      where: { parentId },
      select: { studentId: true },
    });
  },

  countParentStudents(parentId: string) {
    return prisma.parentStudent.count({ where: { parentId } });
  },

  findParentStudentsWithUser(parentId: string) {
    return prisma.parentStudent.findMany({
      where: { parentId },
      include: { student: { include: { user: { select: { fullName: true, photo: true } } } } },
    });
  },
};

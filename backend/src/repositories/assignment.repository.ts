import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const assignmentRepository = {
  findById(id: string) {
    return prisma.assignment.findUnique({ where: { id } });
  },

  findUnique(where: Prisma.AssignmentWhereUniqueInput, include?: Prisma.AssignmentInclude) {
    return prisma.assignment.findUnique({ where: where as any, include });
  },

  findMany(args: Prisma.AssignmentFindManyArgs) {
    return prisma.assignment.findMany(args);
  },

  create(data: Prisma.AssignmentCreateInput) {
    return prisma.assignment.create({ data });
  },

  update(id: string, data: Prisma.AssignmentUpdateInput) {
    return prisma.assignment.update({ where: { id }, data });
  },

  count(where: Prisma.AssignmentWhereInput) {
    return prisma.assignment.count({ where });
  },

  findSubmission(id: string) {
    return prisma.assignmentSubmission.findUnique({ where: { id } });
  },

  findSubmissionByAssignmentAndStudent(assignmentId: string, studentId: string) {
    return prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });
  },

  createSubmission(data: Prisma.AssignmentSubmissionCreateInput) {
    return prisma.assignmentSubmission.create({ data });
  },

  updateSubmission(id: string, data: Prisma.AssignmentSubmissionUpdateInput) {
    return prisma.assignmentSubmission.update({ where: { id }, data });
  },

  findSubmissions(assignmentId: string, page: number, limit: number) {
    return prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: { student: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  },

  countSubmissions(assignmentId: string) {
    return prisma.assignmentSubmission.count({ where: { assignmentId } });
  },
};

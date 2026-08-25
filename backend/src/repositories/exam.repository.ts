import { prisma } from '../lib/prisma';
import { Prisma, AttemptStatus } from '@prisma/client';

export const examRepository = {
  findById(id: string) {
    return prisma.exam.findUnique({ where: { id } });
  },

  findUnique(where: Prisma.ExamWhereUniqueInput, include?: Prisma.ExamInclude) {
    return prisma.exam.findUnique({ where: where as any, include });
  },

  findMany(args: Prisma.ExamFindManyArgs) {
    return prisma.exam.findMany(args);
  },

  create(data: Prisma.ExamCreateInput) {
    return prisma.exam.create({ data });
  },

  count(where: Prisma.ExamWhereInput) {
    return prisma.exam.count({ where });
  },

  findAttempt(id: string) {
    return prisma.examAttempt.findUnique({ where: { id } });
  },

  findAttemptByExamAndStudent(examId: string, studentId: string) {
    return prisma.examAttempt.findUnique({
      where: { examId_studentId: { examId, studentId } },
      include: { answers: true },
    });
  },

  createAttempt(data: Prisma.ExamAttemptCreateInput) {
    return prisma.examAttempt.create({ data });
  },

  updateAttempt(id: string, data: Prisma.ExamAttemptUpdateInput) {
    return prisma.examAttempt.update({ where: { id }, data });
  },

  findAttemptsByStudent(studentId: string, statuses?: AttemptStatus[]) {
    return prisma.examAttempt.findMany({
      where: {
        studentId,
        ...(statuses ? { status: { in: statuses } } : {}),
      },
    });
  },

  upsertAnswer(data: { attemptId: string; questionId: string; answer: string }) {
    return prisma.examAnswer.upsert({
      where: { attemptId_questionId: { attemptId: data.attemptId, questionId: data.questionId } },
      create: data,
      update: { answer: data.answer },
    });
  },

  updateManyAnswers(attemptId: string, updates: { questionId: string; points: number | null; isCorrect: boolean | null }[]) {
    return Promise.all(
      updates.map((u) =>
        prisma.examAnswer.updateMany({
          where: { attemptId, questionId: u.questionId },
          data: { points: u.points as any, isCorrect: u.isCorrect },
        })
      )
    );
  },

  findAttemptsByExam(examId: string) {
    return prisma.examAttempt.findMany({
      where: { examId },
      include: { student: { include: { user: { select: { fullName: true } } } } },
    });
  },
};

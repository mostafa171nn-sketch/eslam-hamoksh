import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const attendanceRepository = {
  findById(id: string) {
    return prisma.attendance.findUnique({ where: { id } });
  },

  findUnique(where: Prisma.AttendanceWhereUniqueInput, include?: Prisma.AttendanceInclude) {
    return prisma.attendance.findUnique({ where: where as any, include });
  },

  findMany(args: Prisma.AttendanceFindManyArgs) {
    return prisma.attendance.findMany(args);
  },

  create(data: Prisma.AttendanceCreateInput) {
    return prisma.attendance.create({ data });
  },

  update(id: string, data: Prisma.AttendanceUpdateInput) {
    return prisma.attendance.update({ where: { id }, data });
  },

  upsert(
    where: Prisma.AttendanceWhereUniqueInput,
    create: Prisma.AttendanceCreateInput,
    update: Prisma.AttendanceUpdateInput
  ) {
    return prisma.attendance.upsert({ where, create, update });
  },

  count(where: Prisma.AttendanceWhereInput) {
    return prisma.attendance.count({ where });
  },

  groupBy(args: any) {
    return prisma.attendance.groupBy(args);
  },

  createMany(data: Prisma.AttendanceCreateManyInput[]) {
    return prisma.attendance.createMany({ data });
  },

  findQrSession(tokenHash: string) {
    return prisma.attendanceQrSession.findFirst({
      where: { tokenHash, usedAt: null, revokedAt: null },
    });
  },

  createQrSession(data: Prisma.AttendanceQrSessionCreateInput) {
    return prisma.attendanceQrSession.create({ data });
  },

  markQrSessionUsed(id: string) {
    return prisma.attendanceQrSession.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },

  revokeQrSessions(studentId: string, lessonId: string) {
    return prisma.attendanceQrSession.updateMany({
      where: { studentId, lessonId, usedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};

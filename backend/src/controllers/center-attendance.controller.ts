import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { fileUrl } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

export const getCenterAttendance = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const { date } = req.query as any;
  const dateFilter = date ? new Date(date as string) : new Date();
  dateFilter.setHours(0, 0, 0, 0);
  const nextDay = new Date(dateFilter);
  nextDay.setDate(nextDay.getDate() + 1);

  const attendance = await prisma.attendance.findMany({
    where: {
      centerId,
      markedAt: { gte: dateFilter, lt: nextDay },
    },
    include: {
      student: {
        include: { user: { select: { id: true, fullName: true, photo: true } } },
      },
      lesson: {
        include: { subject: { select: { name: true } } },
      },
    },
    orderBy: { markedAt: 'desc' },
  });

  const records = attendance.map(a => ({
    id: a.id,
    studentId: a.studentId,
    studentName: a.student.user.fullName,
    studentPhoto: fileUrl(a.student.user.photo),
    lessonId: a.lessonId,
    lessonName: a.lesson?.subject?.name || 'General',
    status: a.status,
    markedAt: a.markedAt.toISOString(),
    notes: a.note,
  }));

  return ok(res, records);
});

export const getCenterAttendanceStats = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const { date } = req.query as any;
  const dateFilter = date ? new Date(date as string) : new Date();
  dateFilter.setHours(0, 0, 0, 0);
  const nextDay = new Date(dateFilter);
  nextDay.setDate(nextDay.getDate() + 1);

  const stats = await prisma.attendance.groupBy({
    by: ['status'],
    where: {
      centerId,
      markedAt: { gte: dateFilter, lt: nextDay },
    },
    _count: true,
  });

  const result = {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  };

  for (const s of stats) {
    result.total += s._count;
    if (s.status === 'PRESENT') result.present = s._count;
    if (s.status === 'ABSENT') result.absent = s._count;
    if (s.status === 'LATE') result.late = s._count;
    if (s.status === 'EXCUSED') result.excused = s._count;
  }

  return ok(res, result);
});

export const updateCenterAttendance = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const { id } = req.params;
  const { status, notes } = req.body;

  const attendance = await prisma.attendance.findUnique({ where: { id } });
  if (!attendance || attendance.centerId !== centerId) {
    throw ApiError.notFound('Attendance record not found');
  }

  const updateData: any = {};
  if (status) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  const updated = await prisma.attendance.update({
    where: { id },
    data: updateData,
  });

  await recordActivity({
    userId: req.user!.id,
    action: 'updated_attendance',
    entity: 'Attendance',
    entityId: id,
    details: JSON.stringify({ status }),
  });

  return ok(res, updated, 'Attendance updated');
});

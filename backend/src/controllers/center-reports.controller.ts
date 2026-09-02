import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

export const listCenterReports = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  // Get recent activity related to reports
  const activities = await prisma.activityLog.findMany({
    where: {
      centerId,
      entity: { in: ['Payment', 'Attendance', 'Student', 'Teacher', 'Lesson', 'Report'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const reports = activities
    .filter(a => a.action.includes('report') || a.action.includes('export'))
    .map(a => ({
      id: a.id,
      name: a.action,
      type: a.entity,
      generatedAt: a.createdAt.toISOString(),
      status: 'COMPLETED',
    }));

  return ok(res, reports);
});

export const generateCenterReport = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const { type, dateFrom, dateTo } = req.body;
  if (!type) {
    throw ApiError.badRequest('Report type required');
  }

  // Get data based on type
  let data: any = {};
  const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = dateTo ? new Date(dateTo) : new Date();

  switch (type) {
    case 'attendance':
      data = await prisma.attendance.groupBy({
        by: ['status'],
        where: { centerId, markedAt: { gte: from, lte: to } },
        _count: true,
      });
      break;
    case 'payments':
      data = await prisma.payment.groupBy({
        by: ['status'],
        where: { centerId, createdAt: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: true,
      });
      break;
    case 'students':
      data = { count: await prisma.student.count({ where: { centerId } }) };
      break;
    case 'teachers':
      data = { count: await prisma.teacher.count({ where: { centerId } }) };
      break;
    case 'lessons':
      data = { count: await prisma.lesson.count({ where: { centerId, date: { gte: from, lte: to } } }) };
      break;
    case 'revenue':
      data = await prisma.payment.aggregate({
        where: { centerId, status: 'PAID', paidAt: { gte: from, lte: to } },
        _sum: { amount: true },
      });
      break;
  }

  await recordActivity({
    userId: req.user!.id,
    action: `generated_report_${type}`,
    entity: 'Report',
    entityId: type,
    details: JSON.stringify({ dateFrom: from, dateTo: to, data }),
  });

  return ok(res, { type, data, dateFrom: from, dateTo: to }, 'Report generated');
});

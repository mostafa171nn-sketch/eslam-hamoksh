import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';

export const getCenterAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const { period = 'month' } = req.query as any;

  const now = new Date();
  let startDate = new Date();
  if (period === 'week') {
    startDate.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    startDate.setMonth(now.getMonth() - 1);
  } else if (period === 'year') {
    startDate.setFullYear(now.getFullYear() - 1);
  }

  const [
    currentStudents,
    previousStudents,
    currentTeachers,
    previousTeachers,
    currentRevenue,
    previousRevenue,
    currentLessons,
    previousLessons,
    topSubjects,
  ] = await Promise.all([
    prisma.student.count({ where: { centerId, createdAt: { gte: startDate } } }),
    prisma.student.count({ where: { centerId, createdAt: { lt: startDate } } }),
    prisma.teacher.count({ where: { centerId, createdAt: { gte: startDate } } }),
    prisma.teacher.count({ where: { centerId, createdAt: { lt: startDate } } }),
    prisma.payment.aggregate({ where: { centerId, status: 'PAID', paidAt: { gte: startDate } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { centerId, status: 'PAID', paidAt: { lt: startDate, gte: new Date(startDate.getTime() - (now.getTime() - startDate.getTime())) } }, _sum: { amount: true } }),
    prisma.lesson.count({ where: { centerId, date: { gte: startDate } } }),
    prisma.lesson.count({ where: { centerId, date: { lt: startDate } } }),
    prisma.lesson.findMany({
      where: { centerId, date: { gte: startDate } },
      include: { subject: { select: { name: true } } },
      take: 100,
    }),
  ]);

  // Calculate trends
  const calcTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Top subjects
  const subjectMap = new Map<string, number>();
  for (const l of topSubjects) {
    const name = l.subject?.name || 'Other';
    subjectMap.set(name, (subjectMap.get(name) || 0) + 1);
  }
  const topSubjectsList = Array.from(subjectMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return ok(res, {
    studentsTrend: calcTrend(currentStudents, previousStudents),
    teachersTrend: calcTrend(currentTeachers, previousTeachers),
    revenueTrend: calcTrend(currentRevenue._sum.amount || 0, previousRevenue._sum.amount || 0),
    lessonsTrend: calcTrend(currentLessons, previousLessons),
    topSubjects: topSubjectsList,
  });
});

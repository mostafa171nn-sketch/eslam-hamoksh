import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { getCenterCommissionRate } from '../services/commission.service';

// Operating window used by the center dashboard (07:00 - 22:00). Availability
// is derived from the same convention so the reports tell a single story.
const OPERATING_START_MIN = 7 * 60;
const OPERATING_END_MIN = 22 * 60;
const OPERATING_DAY_MINUTES = OPERATING_END_MIN - OPERATING_START_MIN;

const PERIODS = ['today', 'week', 'month', 'quarter', 'year'] as const;
const COMPARES = ['lastMonth', 'sameMonthLastYear', 'target'] as const;

type Period = (typeof PERIODS)[number];
type Compare = (typeof COMPARES)[number];

// Reference SLA target per complaint severity. The labels are rendered on the
// frontend; the backend only answers the numbers (target in minutes).
const SLA_TARGET_MINUTES: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 2 * 60,
  MEDIUM: 8 * 60,
  LOW: 24 * 60,
};

function toMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  if ([h, m].some((n) => Number.isNaN(n))) return NaN;
  return h * 60 + (m || 0);
}

/** Clamp a lesson's duration to the operating window (07:00-22:00). */
function boundedMinutes(start: string, end: string): number {
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  if (Number.isNaN(startMin) || Number.isNaN(endMin)) return 0;
  return Math.max(0, Math.min(endMin, OPERATING_END_MIN) - Math.max(startMin, OPERATING_START_MIN));
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** [from, to) window plus calendar-day count for a given period. */
function periodWindow(period: Period, now: Date): { from: Date; to: Date; days: number } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case 'today':
      return { from: today, to: new Date(today.getTime() + 86400000), days: 1 };
    case 'week': {
      const dow = (today.getDay() + 6) % 7; // 0 = Monday
      const from = new Date(today);
      from.setDate(today.getDate() - dow);
      const to = new Date(from);
      to.setDate(from.getDate() + 7);
      return { from, to, days: 7 };
    }
    case 'month':
      return { from: startOfMonth(now), to: addMonths(now, 1), days: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() };
    case 'quarter': {
      const from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      const to = new Date(today);
      to.setDate(today.getDate() + 1);
      const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
      return { from, to, days };
    }
    case 'year':
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: new Date(today.getTime() + 86400000),
        days: Math.max(1, Math.round((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1),
      };
  }
}

export const getCenterReportsOverview = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { period: periodRaw, compare: compareRaw, branchId } = req.query as {
    period?: string;
    compare?: string;
    branchId?: string;
  };

  const period: Period = PERIODS.includes(periodRaw as Period) ? (periodRaw as Period) : 'month';
  const compare: Compare = COMPARES.includes(compareRaw as Compare) ? (compareRaw as Compare) : 'lastMonth';
  const branch: string | null = branchId && branchId.trim() !== '' ? branchId : null;

  const now = new Date();
  const { from, to, days } = periodWindow(period, now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const commissionRate = await getCenterCommissionRate(centerId);

  const branchFilter = branch ? { locationId: branch } : {};
  const financialBranchLessons = branch ? { teacher: { locationId: branch } } : {};

  // ----- main window queries ----------------------------------------------
  const [rooms, lessons, pendingBookings, collectedAgg, expensesAgg, openComplaintsSummary, openComplaints, teacherGroups, enrollments] =
    await Promise.all([
      prisma.room.findMany({
        where: { centerId, status: 'ACTIVE', ...(branch ? { locationId: branch } : {}) },
        select: { id: true },
      }),
      prisma.lesson.findMany({
        where: { centerId, ...branchFilter, date: { gte: from, lt: to }, status: { not: 'CANCELLED' } },
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true,
          teacherId: true,
          subjectId: true,
          teacher: { select: { user: { select: { fullName: true } } } },
          subject: { select: { name: true } },
        },
      }),
      prisma.roomBooking.count({
        where: {
          centerId,
          status: 'PENDING',
          createdAt: { gte: from, lt: to },
          ...(branch ? { room: { locationId: branch } } : {}),
        },
      }),
      prisma.payment.aggregate({
        where: { centerId, ...financialBranchLessons, status: { in: ['PAID', 'COMPLETED'] }, paidAt: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { centerId, date: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
      prisma.complaint.groupBy({
        by: ['severity'],
        where: { centerId, status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] } },
        _count: true,
      }),
      prisma.complaint.findMany({
        where: { centerId, status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] } },
        orderBy: { createdAt: 'asc' },
        take: 30,
        select: { id: true, subject: true, severity: true, createdAt: true },
      }),
      branch
        ? prisma.group.groupBy({ by: ['teacherId'], where: { centerId, branchId: branch }, _count: true })
        : prisma.group.groupBy({ by: ['teacherId'], where: { centerId }, _count: true }),
      prisma.groupEnrollment.findMany({
        where: { group: { centerId, ...(branch ? { branchId: branch } : {}) } },
        select: {
          studentId: true,
          groupId: true,
          status: true,
          student: { select: { studentNumber: true, user: { select: { fullName: true } } } },
        },
      }),
    ]);

  // ----- stats: occupancy --------------------------------------------------
  const availableMinutes = rooms.length * OPERATING_DAY_MINUTES * days;
  const bookedMinutes = lessons.reduce((sum, l) => sum + boundedMinutes(l.startTime, l.endTime), 0);
  const occupancyRate = availableMinutes > 0 ? Math.round((bookedMinutes / availableMinutes) * 100) : 0;

  // ----- financial ---------------------------------------------------------
  const collectedEgp = (collectedAgg._sum.amount ?? 0) / 100;
  const centerShareEgp = Math.round(collectedEgp * commissionRate);
  const directIncomeEgp = 0; // No separate direct-income source in the model; row stays visible and honest.
  const expensesEgp = (expensesAgg._sum.amount ?? 0) / 100;
  const netIncomeEgp = Math.round(centerShareEgp + directIncomeEgp - expensesEgp);

  // ----- complaints --------------------------------------------------------
  const severityMap: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  openComplaintsSummary.forEach((row) => {
    severityMap[row.severity] = row._count;
  });
  const openComplaintsTotal = Object.values(severityMap).reduce((a, b) => a + b, 0);

  // ----- bookings breakdown -------------------------------------------------
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isFinished = (l: { date: Date; startTime: string; endTime: string; status: string }) =>
    l.status === 'COMPLETED' ||
    l.date.getTime() < todayStart.getTime() ||
    (isSameDay(l.date, now) && toMinutes(l.endTime) <= nowMinutes);
  const isOngoing = (l: { date: Date; startTime: string; endTime: string }) =>
    isSameDay(l.date, now) && toMinutes(l.startTime) <= nowMinutes && toMinutes(l.endTime) > nowMinutes;

  const completedCount = lessons.filter(isFinished).length;
  const ongoingCount = lessons.filter((l) => !isFinished(l) && isOngoing(l)).length;
  const upcomingCount = lessons.length - completedCount - ongoingCount;
  const bookingsTotal = lessons.length + pendingBookings;
  const pct = (count: number) => (bookingsTotal > 0 ? Math.round((count / bookingsTotal) * 100) : 0);

  // ----- monthly trends (last 6 months incl. current) ----------------------
  const months = Array.from({ length: 6 }, (_, i) => {
    const base = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`, from: base, to: addMonths(base, 1) };
  });

  const monthQueries = await Promise.all(
    months.map(async (m) => {
      const [monthLessons, pay, exp] = await Promise.all([
        prisma.lesson.findMany({
          where: { centerId, ...branchFilter, date: { gte: m.from, lt: m.to }, status: { not: 'CANCELLED' } },
          select: { startTime: true, endTime: true },
        }),
        prisma.payment.aggregate({
          where: { centerId, ...financialBranchLessons, status: { in: ['PAID', 'COMPLETED'] }, paidAt: { gte: m.from, lt: m.to } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { centerId, date: { gte: m.from, lt: m.to } },
          _sum: { amount: true },
        }),
      ]);
      const monthMinutes = monthLessons.reduce((sum, l) => sum + boundedMinutes(l.startTime, l.endTime), 0);
      const monthAvailable = rooms.length * OPERATING_DAY_MINUTES * m.to.getDate();
      const collected = (pay._sum.amount ?? 0) / 100;
      const net = Math.round(Math.round(collected * commissionRate) - (exp._sum.amount ?? 0) / 100);
      return {
        key: m.key,
        rate: monthAvailable > 0 ? Math.round((monthMinutes / monthAvailable) * 100) : 0,
        net,
      };
    }),
  );

  const monthlyOccupancy = months.map((m, i) => ({ key: m.key, rate: monthQueries[i].rate }));
  const monthlyIncome = months.map((m, i) => ({ key: m.key, net: monthQueries[i].net }));

  // ----- teachers with bookings ---------------------------------------------
  const lessonCountByTeacher = new Map<string, number>();
  const subjectByTeacher = new Map<string, string>();
  const teacherNameById = new Map<string, string>();
  for (const l of lessons) {
    if (!l.teacherId) continue;
    lessonCountByTeacher.set(l.teacherId, (lessonCountByTeacher.get(l.teacherId) ?? 0) + 1);
    teacherNameById.set(l.teacherId, l.teacher?.user?.fullName ?? '');
    if (!subjectByTeacher.has(l.teacherId) && l.subject?.name) subjectByTeacher.set(l.teacherId, l.subject.name);
  }
  const teacherGroupCount = new Map<string, number>();
  teacherGroups.forEach((g) => {
    if (g.teacherId) teacherGroupCount.set(g.teacherId, g._count);
  });
  const teachers = Array.from(lessonCountByTeacher.entries())
    .map(([teacherId, bookings]) => ({
      id: teacherId,
      name: teacherNameById.get(teacherId) || '—',
      subject: subjectByTeacher.get(teacherId) || '—',
      groups: teacherGroupCount.get(teacherId) ?? 0,
      bookings,
    }))
    .sort((a, b) => b.bookings - a.bookings || a.name.localeCompare(b.name, 'ar'))
    .slice(0, 8);

  // ----- students ------------------------------------------------------------
  const studentMap = new Map<string, { name: string; code: string; active: boolean; groups: number }>();
  for (const e of enrollments) {
    const row = studentMap.get(e.studentId) ?? {
      name: e.student?.user?.fullName ?? '—',
      code: e.student?.studentNumber ?? '',
      active: false,
      groups: 0,
    };
    if (e.status === 'ACTIVE') row.active = true;
    row.groups += 1;
    studentMap.set(e.studentId, row);
  }
  const students = Array.from(studentMap.entries())
    .map(([id, s]) => ({
      id,
      name: s.name,
      code: s.code,
      groups: s.groups,
      status: s.active ? 'ACTIVE' : 'FROZEN',
    }))
    .sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name, 'ar') : a.status === 'ACTIVE' ? -1 : 1));

  // ----- SLA ------------------------------------------------------------------
  const sla = openComplaints.map((c) => {
    const elapsed = Math.max(0, Math.floor((now.getTime() - c.createdAt.getTime()) / 60000));
    const target = SLA_TARGET_MINUTES[c.severity] ?? 24 * 60;
    return {
      id: c.id,
      subject: c.subject,
      severity: c.severity,
      elapsedMinutes: elapsed,
      targetMinutes: target,
      within: elapsed <= target,
    };
  });

  return ok(res, {
    period,
    compare,
    branchId: branch,
    stats: {
      occupancyRate,
      netIncome: netIncomeEgp,
      collected: collectedEgp,
      openComplaints: openComplaintsTotal,
      highCriticalComplaints: severityMap.HIGH + severityMap.CRITICAL,
    },
    operations: {
      monthly: monthlyOccupancy,
      bookings: [
        { key: 'completed', count: completedCount, pct: pct(completedCount) },
        { key: 'ongoing', count: ongoingCount, pct: pct(ongoingCount) },
        { key: 'upcoming', count: upcomingCount, pct: pct(upcomingCount) },
        { key: 'pending', count: pendingBookings, pct: pct(pendingBookings) },
      ],
    },
    financial: {
      monthly: monthlyIncome,
      composition: [
        { key: 'collected', value: collectedEgp },
        { key: 'centerShare', value: centerShareEgp },
        { key: 'direct', value: directIncomeEgp },
        { key: 'expenses', value: expensesEgp },
        { key: 'net', value: netIncomeEgp },
      ],
    },
    people: { teachers, students },
    complaints: {
      bySeverity: [
        { key: 'CRITICAL', count: severityMap.CRITICAL },
        { key: 'HIGH', count: severityMap.HIGH },
        { key: 'MEDIUM', count: severityMap.MEDIUM },
        { key: 'LOW', count: severityMap.LOW },
      ],
      sla,
    },
  });
});
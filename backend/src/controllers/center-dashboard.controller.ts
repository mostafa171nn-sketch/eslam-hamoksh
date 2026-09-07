import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';

const OPERATING_START_MIN = 7 * 60; // 07:00
const OPERATING_END_MIN = 22 * 60; // 22:00

/** Clamp a lesson's duration to the operating window (07:00-22:00). */
function boundedMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const s = Math.max(startMin, OPERATING_START_MIN);
  const e = Math.min(endMin, OPERATING_END_MIN);
  return Math.max(0, e - s);
}

function toMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + (m || 0);
}

export const getCenterDashboardOverview = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { branchId } = req.query as { branchId?: string };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const baseWhere: any = { centerId };
  if (branchId) baseWhere.locationId = branchId;

  // ----- week bounds (Monday first) ---------------------------------------
  const dow = (todayStart.getDay() + 6) % 7; // 0=Monday
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - dow);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // ----- reference months for comparisons --------------------------------
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevYearStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const prevYearWholeEnd = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    rooms,
    lessonsToday,
    weekLessons,
    groupEnrollments,
    recentMessages,
    complaints,
    messagesSummary,
    messagesUnread,
    complaintsSummary,
    todayPayments,
    allPayments,
    prevMonthPayments,
    prevYearPayments,
    pendingBookings,
    pendingSettlements,
    pendingComplaints,
  ] = await Promise.all([
    prisma.room.findMany({
      where: { centerId, status: 'ACTIVE', ...(branchId ? { locationId: branchId } : {}) },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.lesson.findMany({
      where: { ...baseWhere, date: { gte: todayStart, lt: todayEnd }, status: { not: 'CANCELLED' } },
      include: {
        subject: { select: { name: true } },
        teacher: { include: { user: { select: { fullName: true } } } },
        room: { select: { id: true, name: true } },
      },
    }),
    prisma.lesson.findMany({
      where: { ...baseWhere, date: { gte: weekStart, lt: weekEnd }, status: { not: 'CANCELLED' } },
      select: { teacherId: true },
      distinct: ['teacherId'],
    }),
    prisma.groupEnrollment.findMany({
      where: { status: 'ACTIVE', group: { centerId } },
      select: { studentId: true },
      distinct: ['studentId'],
    }),
    prisma.centerMessage.findMany({
      where: { centerId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { sender: { select: { fullName: true } } },
    }),
    prisma.complaint.findMany({
      where: { centerId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { assignee: { select: { fullName: true } } },
    }),
    prisma.centerMessage.count({ where: { centerId } }),
    prisma.centerMessage.count({ where: { centerId, read: false } }),
    prisma.complaint.groupBy({
      by: ['severity'],
      where: { centerId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { ...baseWhere, status: { in: ['PAID', 'COMPLETED'] }, paidAt: { gte: todayStart, lt: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { centerId, status: { in: ['PAID', 'COMPLETED'] } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { centerId, status: { in: ['PAID', 'COMPLETED'] }, paidAt: { gte: prevMonthStart, lt: prevMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        centerId,
        status: { in: ['PAID', 'COMPLETED'] },
        paidAt: { gte: prevYearStart, lt: prevYearWholeEnd },
      },
      _sum: { amount: true },
    }),
    prisma.roomBooking.findMany({
      where: { centerId, status: 'PENDING' },
      take: 5,
      include: {
        room: { select: { name: true } },
        teacher: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.settlement.count({
      where: {
        centerId,
        status: { in: ['CALCULATED', 'APPROVED'] },
        ...(branchId ? { teacher: { locationId: branchId } } : {}),
      },
    }),
    prisma.complaint.count({ where: { centerId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
  ]);

  // ----- metrics ----------------------------------------------------------
  const completedLessonsToday = lessonsToday.filter((l) => l.status === 'COMPLETED').length;
  const todayLessons = lessonsToday.length;
  const bookedMinutes = lessonsToday.reduce((sum, l) => sum + boundedMinutes(l.startTime, l.endTime), 0);
  const availableMinutes = rooms.length * (OPERATING_END_MIN - OPERATING_START_MIN);
  const occupancyRate = availableMinutes > 0 ? Math.round((bookedMinutes / availableMinutes) * 100) : 0;

  const severityMap: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  complaintsSummary.forEach((row) => {
    severityMap[row.severity] = row._count;
  });

  const prevMonthDays = Math.round((prevMonthEnd.getTime() - prevMonthStart.getTime()) / 86400000);
  const lastMessageAt = recentMessages.length > 0 ? recentMessages[0].createdAt.toISOString() : null;

  // ----- per-room timeline -------------------------------------------------
  const roomsData = rooms.map((room) => {
    const roomLessons = lessonsToday
      .filter((l) => l.roomId === room.id)
      .map((l) => {
        const startMin = toMinutes(l.startTime);
        const endMin = toMinutes(l.endTime);
        let status: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING' = 'UPCOMING';
        if (l.status === 'COMPLETED' || endMin <= currentMinutes) status = 'COMPLETED';
        else if (startMin <= currentMinutes && endMin > currentMinutes) status = 'IN_PROGRESS';
        return {
          id: l.id,
          teacher: l.teacher?.user?.fullName || '—',
          subject: l.subject?.name || 'General',
          grade: 'General',
          startTime: l.startTime,
          endTime: l.endTime,
          status,
        };
      });

    const hasLive = roomLessons.some((l) => l.status === 'IN_PROGRESS');
    const hasPending = pendingBookings.some((b) => b.roomId === room.id);
    const status = hasLive ? 'IN_PROGRESS' : hasPending ? 'PENDING_CONFIRM' : 'AVAILABLE';

    return {
      id: room.id,
      name: room.name,
      status,
      lessons: roomLessons,
    };
  });

  // ----- escalated alerts --------------------------------------------------
  const escalations: any[] = [];
  const pending = pendingBookings[0];
  if (pending) {
    escalations.push({
      id: `booking-${pending.id}`,
      kind: 'booking',
      actionUrl: '/center/classrooms',
      room: pending.room?.name || '—',
      teacher: pending.teacher?.user?.fullName || '—',
      startTime: pending.startTime,
      endTime: pending.endTime,
      createdAt: pending.createdAt,
    });
  }
  const escalatableComplaint = complaints.find((c) => c.severity === 'CRITICAL' || c.severity === 'HIGH');
  if (escalatableComplaint) {
    escalations.push({
      id: `complaint-${escalatableComplaint.id}`,
      kind: 'complaint',
      actionUrl: '/center/communications?view=complaints',
      subject: escalatableComplaint.subject,
      severity: escalatableComplaint.severity,
      assignee: escalatableComplaint.assignee?.fullName || null,
      createdAt: escalatableComplaint.createdAt,
    });
  }
  if (pendingSettlements > 0) {
    escalations.push({
      id: 'settlements-due',
      kind: 'settlement',
      actionUrl: '/center/finance',
      count: pendingSettlements,
    });
  }

  const prevMonthDaysNum = Math.max(1, Math.min(31, prevMonthDays));
  const todayIncomeEgp = (todayPayments._sum.amount ?? 0) / 100;
  const totalCollectedEgp = (allPayments._sum.amount ?? 0) / 100;
  const prevMonthIncomeEgp = (prevMonthPayments._sum.amount ?? 0) / 100;
  const prevYearTotalEgp = (prevYearPayments._sum.amount ?? 0) / 100;

  return ok(res, {
    metrics: {
      occupancyRate,
      todayIncome: todayIncomeEgp,
      totalCollected: totalCollectedEgp,
      completedLessonsToday,
      todayLessons,
      todayBookings: todayLessons,
      teachersThisWeek: weekLessons.length,
      activeStudents: groupEnrollments.length,
      messages: {
        total: messagesSummary,
        unread: messagesUnread,
        lastAt: lastMessageAt,
      },
      complaints: {
        total: pendingComplaints,
        open: pendingComplaints,
        critical: severityMap.CRITICAL,
        high: severityMap.HIGH,
        medium: severityMap.MEDIUM,
        low: severityMap.LOW,
      },
      comparison: {
        prevMonthIncome: prevMonthIncomeEgp,
        prevMonthCollected: (prevMonthPayments._sum.amount ?? 0) / 100,
        prevMonthAvgDaily: prevMonthIncomeEgp / prevMonthDaysNum,
        prevYearAvgDaily: prevYearTotalEgp / 30,
      },
    },
    rooms: roomsData,
    escalations,
    recentMessages: recentMessages.map((m) => ({
      id: m.id,
      sender: m.sender?.fullName || '—',
      message: m.message,
      read: m.read,
      createdAt: m.createdAt,
    })),
    recentComplaints: complaints.slice(0, 3).map((c) => ({
      id: c.id,
      severity: c.severity,
      subject: c.subject,
      status: c.status,
      createdAt: c.createdAt,
    })),
  });
});
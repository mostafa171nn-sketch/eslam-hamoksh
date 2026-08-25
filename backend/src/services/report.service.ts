import { Role } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../lib/prisma';
import { reportRepository } from '../repositories/report.repository';
import { teacherRepository } from '../repositories/teacher.repository';
import { studentRepository } from '../repositories/student.repository';
import { parentRepository } from '../repositories/parent.repository';
import { userRepository } from '../repositories/user.repository';
import { lessonRepository } from '../repositories/lesson.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { attendanceRepository } from '../repositories/attendance.repository';
import { computeAttendanceStats } from './attendance.service';

export interface Actor {
  userId: string;
  role: Role;
  centerId?: string | null;
}

export interface DateRange {
  from?: string;
  to?: string;
}

export interface ReportFilters extends DateRange {
  teacherId?: string;
  studentId?: string;
  gradeId?: string;
  subjectId?: string;
  centerId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function parseRange(q: DateRange) {
  const from = q.from ? new Date(q.from) : new Date('1970-01-01');
  const to = q.to ? new Date(q.to + 'T23:59:59.999Z') : new Date('2999-12-31T23:59:59.999Z');
  return { from, to };
}

function paginationMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

// =========================================================================
// 1. CENTER DASHBOARD
// =========================================================================

export async function getCenterDashboard(actor: Actor) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalStudents, activeStudents, totalTeachers, activeTeachers,
    totalEmployees, totalAssistants, totalParents, totalLessons,
    completedLessons, scheduledLessons, todayLessons, totalExams,
    totalAssignments, avgRating, newUsersThisMonth, pendingPayments,
    paidPaymentsThisMonth, totalRevenue, activeSubscriptions,
    cancelledSubscriptions, expiredSubscriptions, totalRooms,
  ] = await Promise.all([
    studentRepository.count({}),
    userRepository.count({ role: 'STUDENT', status: 'ACTIVE' }),
    teacherRepository.count({}),
    userRepository.count({ role: 'TEACHER', status: 'ACTIVE' }),
    userRepository.count({ role: 'CENTER_EMPLOYEE' }),
    prisma.teacherAssistant.count(),
    parentRepository.count({}),
    lessonRepository.count({}),
    lessonRepository.count({ status: 'COMPLETED' }),
    lessonRepository.count({ status: { in: ['SCHEDULED', 'RESCHEDULED'] } }),
    lessonRepository.count({ date: { gte: todayStart, lt: todayEnd } }),
    prisma.exam.count(),
    prisma.assignment.count(),
    prisma.rating.aggregate({ _avg: { stars: true } }),
    userRepository.count({ role: { notIn: ['CENTER_ADMIN', 'SUPER_ADMIN'] }, createdAt: { gte: monthStart } }),
    paymentRepository.count({ status: 'PENDING' }),
    paymentRepository.aggregate({ where: { status: 'PAID', createdAt: { gte: monthStart } }, _sum: { amount: true }, _count: true }),
    paymentRepository.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    prisma.billingSubscription.count({ where: { status: 'ACTIVE' } }),
    prisma.billingSubscription.count({ where: { status: 'CANCELLED' } }),
    prisma.billingSubscription.count({ where: { status: 'EXPIRED' } }),
    prisma.room.count({ where: { status: 'ACTIVE' } }),
  ]);

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const growthRaw = await reportRepository.studentGrowthByMonth(sixMonthsAgo, now);
  const growthMap = new Map<string, number>();
  for (const row of growthRaw) {
    const key = row.createdAt.toISOString().slice(0, 7);
    growthMap.set(key, (growthMap.get(key) ?? 0) + row._count._all);
  }
  const growthTrends = [...growthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));

  const center = actor.centerId
    ? await prisma.center.findUnique({ where: { id: actor.centerId }, include: { plan: true } })
    : null;

  return {
    overview: {
      totalStudents, activeStudents, inactiveStudents: totalStudents - activeStudents,
      totalTeachers, activeTeachers, totalEmployees, totalAssistants, totalParents, totalRooms,
    },
    lessons: {
      total: totalLessons, completed: completedLessons, scheduled: scheduledLessons,
      today: todayLessons,
      completionRate: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    },
    financial: {
      pendingPayments,
      revenueThisMonth: (paidPaymentsThisMonth._sum as any)?.amount ?? 0,
      totalRevenue: (totalRevenue._sum as any)?.amount ?? 0,
    },
    subscriptions: { active: activeSubscriptions, cancelled: cancelledSubscriptions, expired: expiredSubscriptions },
    academics: {
      totalExams, totalAssignments,
      averageTeacherRating: Number((avgRating._avg.stars ?? 0).toFixed(1)),
    },
    growth: { newUsersThisMonth, trends: growthTrends },
    plan: center?.plan ? {
      name: center.plan.name, commissionRate: center.plan.commissionRate,
      maxTeachers: center.plan.maxTeachers, maxStudents: center.plan.maxStudents,
      includesAnalytics: center.plan.includesAnalytics,
    } : null,
  };
}

// =========================================================================
// 2. STUDENT REPORTS
// =========================================================================

export async function getStudentReport(actor: Actor, studentId: string, filters: DateRange) {
  const { from, to } = parseRange(filters);

  const student = await studentRepository.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found.');

  if (actor.role === 'STUDENT') {
    const me = await studentRepository.findByUserId(actor.userId);
    if (!me || me.id !== studentId) throw ApiError.forbidden('Access denied.');
  }
  if (actor.role === 'PARENT') {
    const parent = await parentRepository.findByUserId(actor.userId);
    if (!parent) throw ApiError.notFound('Parent profile not found.');
    const owns = await parentRepository.findParentStudent(parent.id, studentId);
    if (!owns) throw ApiError.forbidden("You can only view reports for your children.");
  }

  const [attendanceRecords, totalLessons, completedLessons, cancelledLessons, examAttempts, assignmentSubmissions, payments, paymentAgg, subscription] = await Promise.all([
    attendanceRepository.findMany({ where: { studentId, markedAt: { gte: from, lte: to } }, select: { status: true } }),
    lessonRepository.count({ studentId, date: { gte: from, lte: to } }),
    lessonRepository.count({ studentId, date: { gte: from, lte: to }, status: 'COMPLETED' }),
    lessonRepository.count({ studentId, date: { gte: from, lte: to }, status: 'CANCELLED' }),
    prisma.examAttempt.findMany({
      where: { studentId, submittedAt: { gte: from, lte: to }, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] } },
      select: { percentage: true },
    }),
    prisma.assignmentSubmission.findMany({
      where: { studentId, submittedAt: { gte: from, lte: to } },
      select: { grade: true, status: true },
    }),
    paymentRepository.findMany({
      where: { studentId, createdAt: { gte: from, lte: to } },
      select: { id: true, amount: true, status: true, method: true, createdAt: true },
      orderBy: { createdAt: 'desc' }, take: 20,
    }),
    paymentRepository.aggregate({ where: { studentId, status: 'PAID' }, _sum: { amount: true }, _count: true }),
    prisma.billingSubscription.findFirst({
      where: { studentId }, orderBy: { createdAt: 'desc' },
      select: { status: true, startDate: true, endDate: true },
    }),
  ]);

  const attendance = computeAttendanceStats(attendanceRecords);
  const examStats = examAttempts.length > 0 ? {
    total: examAttempts.length,
    average: Math.round(examAttempts.reduce((s, a) => s + (a.percentage ?? 0), 0) / examAttempts.length),
    highest: Math.round(Math.max(...examAttempts.map((a) => a.percentage ?? 0))),
    lowest: Math.round(Math.min(...examAttempts.map((a) => a.percentage ?? 0))),
    passRate: Math.round((examAttempts.filter((a) => (a.percentage ?? 0) >= 50).length / examAttempts.length) * 100),
  } : { total: 0, average: 0, highest: 0, lowest: 0, passRate: 0 };

  const graded = assignmentSubmissions.filter((s) => s.status === 'GRADED' && s.grade != null);
  const assignmentStats = {
    total: assignmentSubmissions.length,
    submitted: assignmentSubmissions.filter((s) => ['SUBMITTED', 'GRADED'].includes(s.status)).length,
    graded: graded.length,
    late: assignmentSubmissions.filter((s) => s.status === 'LATE').length,
    averageGrade: graded.length > 0 ? Math.round(graded.reduce((s, g) => s + (g.grade ?? 0), 0) / graded.length) : 0,
  };

  const studentUser = await userRepository.findById(student.userId);
  return {
    student: { id: student.id, fullName: studentUser?.fullName },
    attendance, lessons: { total: totalLessons, completed: completedLessons, cancelled: cancelledLessons },
    exams: examStats, assignments: assignmentStats,
    payments: { total: paymentAgg._count, totalPaid: (paymentAgg._sum as any)?.amount ?? 0, recent: payments },
    subscription,
  };
}

// =========================================================================
// 3. TEACHER REPORTS
// =========================================================================

export async function getTeacherReport(actor: Actor, teacherId: string, filters: DateRange) {
  const { from, to } = parseRange(filters);

  const teacher = await teacherRepository.findById(teacherId);
  if (!teacher) throw ApiError.notFound('Teacher not found.');

  if (actor.role === 'TEACHER') {
    const me = await teacherRepository.findByUserId(actor.userId);
    if (!me || me.id !== teacherId) throw ApiError.forbidden('Access denied.');
  }

  const teacherUser = await userRepository.findById(teacher.userId);
  const [totalStudents, totalLessons, completedLessons, cancelledLessons, scheduledLessons, attendanceRecords, revenue, pendingSettlements, rating, totalAssignments, totalExams] = await Promise.all([
    prisma.teacherStudent.count({ where: { teacherId } }),
    lessonRepository.count({ teacherId, date: { gte: from, lte: to } }),
    lessonRepository.count({ teacherId, date: { gte: from, lte: to }, status: 'COMPLETED' }),
    lessonRepository.count({ teacherId, date: { gte: from, lte: to }, status: 'CANCELLED' }),
    lessonRepository.count({ teacherId, date: { gte: from, lte: to }, status: { in: ['SCHEDULED', 'RESCHEDULED'] } }),
    reportRepository.attendanceByTeacher(teacherId, from, to),
    paymentRepository.aggregate({ where: { teacherId, status: 'PAID', createdAt: { gte: from, lte: to } }, _sum: { amount: true }, _count: true }),
    prisma.settlement.count({ where: { teacherId, status: { in: ['CALCULATED', 'APPROVED'] } } }),
    teacherRepository.aggregateRating(teacherId),
    prisma.assignment.count({ where: { teacherId, createdAt: { gte: from, lte: to } } }),
    prisma.exam.count({ where: { teacherId, createdAt: { gte: from, lte: to } } }),
  ]);

  const attendanceStats = computeAttendanceStats(attendanceRecords);
  return {
    teacher: { id: teacher.id, fullName: teacherUser?.fullName, totalStudents },
    lessons: {
      total: totalLessons, completed: completedLessons, cancelled: cancelledLessons, scheduled: scheduledLessons,
      completionRate: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    },
    attendance: attendanceStats,
    financial: { totalRevenue: (revenue._sum as any)?.amount ?? 0, totalPayments: revenue._count, pendingSettlements },
    academics: { totalAssignments, totalExams, averageRating: Number((rating._avg.stars ?? 0).toFixed(1)), totalRatings: rating._count.stars },
  };
}

// =========================================================================
// 4. ATTENDANCE REPORTS
// =========================================================================

export async function getAttendanceReport(actor: Actor, filters: ReportFilters) {
  const { from, to } = parseRange(filters);
  const { studentId, teacherId, subjectId, page = 1, limit = 50 } = filters;

  const where: any = { markedAt: { gte: from, lte: to } };
  if (studentId) where.studentId = studentId;
  if (teacherId || subjectId) {
    where.lesson = {};
    if (teacherId) where.lesson.teacherId = teacherId;
    if (subjectId) where.lesson.subjectId = subjectId;
  }

  const [total, records, allStatusRecords] = await Promise.all([
    attendanceRepository.count(where),
    attendanceRepository.findMany({
      where,
      include: {
        lesson: { select: { id: true, date: true, startTime: true, endTime: true, status: true, teacher: { include: { user: { select: { fullName: true } } } }, subject: { select: { id: true, name: true } } } },
        student: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { markedAt: 'desc' }, skip: (page - 1) * limit, take: limit,
    }),
    attendanceRepository.findMany({ where, select: { status: true } }),
  ]);

  const stats = computeAttendanceStats(allStatusRecords);

  const dateGroup = await prisma.attendance.groupBy({
    by: ['markedAt'], _count: { _all: true }, where,
  });
  const dailyMap = new Map<string, number>();
  for (const row of dateGroup) {
    const key = row.markedAt.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + row._count._all);
  }

  return {
    stats,
    dailyTrend: [...dailyMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count })),
    records: records.map((r: any) => ({
      id: r.id, status: r.status, markedAt: r.markedAt,
      student: r.student?.user?.fullName ?? 'Unknown',
      lesson: { date: r.lesson.date, startTime: r.lesson.startTime, subject: r.lesson.subject?.name ?? null, teacher: r.lesson.teacher?.user?.fullName ?? null },
    })),
    pagination: paginationMeta(page, limit, total),
  };
}

export async function getStudentAttendanceDetail(actor: Actor, studentId: string, filters: DateRange) {
  const { from, to } = parseRange(filters);

  if (actor.role === 'STUDENT') {
    const me = await studentRepository.findByUserId(actor.userId);
    if (!me || me.id !== studentId) throw ApiError.forbidden('Access denied.');
  }
  if (actor.role === 'PARENT') {
    const parent = await parentRepository.findByUserId(actor.userId);
    if (!parent) throw ApiError.notFound('Parent profile not found.');
    const owns = await parentRepository.findParentStudent(parent.id, studentId);
    if (!owns) throw ApiError.forbidden("You can only view reports for your children.");
  }

  const records = await attendanceRepository.findMany({
    where: { studentId, markedAt: { gte: from, lte: to } },
    include: { lesson: { select: { date: true, startTime: true, endTime: true, status: true, subject: { select: { id: true, name: true } }, teacher: { include: { user: { select: { fullName: true } } } } } } },
    orderBy: { markedAt: 'desc' },
  }) as any[];

  const stats = computeAttendanceStats(records.map((r) => ({ status: r.status })));
  const bySubjectMap = new Map<string, { name: string; statuses: any[] }>();
  for (const r of records) {
    const subName = (r.lesson as any)?.subject?.name ?? 'General';
    const subId = (r.lesson as any)?.subject?.id ?? 'general';
    if (!bySubjectMap.has(subId)) bySubjectMap.set(subId, { name: subName, statuses: [] });
    bySubjectMap.get(subId)!.statuses.push({ status: r.status });
  }
  const bySubject = [...bySubjectMap.entries()].map(([id, data]) => ({
    subjectId: id, subject: data.name, ...computeAttendanceStats(data.statuses),
  }));

  return { stats, bySubject, totalRecords: records.length };
}

// =========================================================================
// 5. FINANCIAL REPORTS
// =========================================================================

export async function getFinancialReport(actor: Actor, filters: DateRange) {
  const { from, to } = parseRange(filters);

  const [paymentsByStatus, paymentsByMethod, revenue, settlements, invoices, walletTxns] = await Promise.all([
    reportRepository.paymentsByStatus({ createdAt: { gte: from, lte: to } }),
    reportRepository.paymentsByMethod({ createdAt: { gte: from, lte: to } }),
    reportRepository.totalRevenue({ createdAt: { gte: from, lte: to } }),
    reportRepository.settlementsByStatus({ createdAt: { gte: from, lte: to } }),
    reportRepository.invoicesByStatus({ createdAt: { gte: from, lte: to } }),
    reportRepository.walletTransactionSummary({ createdAt: { gte: from, lte: to } }),
  ]);

  const revenueTrendRaw = await reportRepository.revenueByMonth(from, to);
  const revenueMap = new Map<string, { total: number; count: number }>();
  for (const row of revenueTrendRaw) {
    const key = row.createdAt.toISOString().slice(0, 7);
    const existing = revenueMap.get(key) ?? { total: 0, count: 0 };
    existing.total += ((row._sum as any)?.amount ?? 0);
    existing.count += row._count._all;
    revenueMap.set(key, existing);
  }

  const commissionAgg = settlements.reduce(
    (acc: any, s: any) => {
      acc.gross += s._sum.grossAmount ?? 0;
      acc.commission += s._sum.platformCommission ?? 0;
      acc.teacherShare += s._sum.teacherShare ?? 0;
      acc.centerShare += s._sum.centerShare ?? 0;
      return acc;
    },
    { gross: 0, commission: 0, teacherShare: 0, centerShare: 0 },
  );

  const refunds = await paymentRepository.aggregate({
    where: { status: 'REFUNDED', createdAt: { gte: from, lte: to } },
    _sum: { amount: true }, _count: true,
  });

  return {
    summary: {
      totalRevenue: (revenue._sum as any)?.amount ?? 0,
      totalPayments: revenue._count,
      totalRefunds: (refunds._sum as any)?.amount ?? 0,
      refundCount: refunds._count,
    },
    revenueTrend: [...revenueMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, data]) => ({ month, ...data })),
    payments: {
      byStatus: paymentsByStatus.map((s: any) => ({ status: s.status, count: s._count._all, total: s._sum.amount ?? 0 })),
      byMethod: paymentsByMethod.map((m: any) => ({ method: m.method, count: m._count._all, total: m._sum.amount ?? 0 })),
    },
    settlements: {
      byStatus: settlements.map((s: any) => ({
        status: s.status, count: s._count._all,
        gross: s._sum.grossAmount ?? 0, commission: s._sum.platformCommission ?? 0,
        teacherShare: s._sum.teacherShare ?? 0, centerShare: s._sum.centerShare ?? 0,
      })),
      totals: commissionAgg,
    },
    invoices: {
      byStatus: invoices.map((i: any) => ({ status: i.status, count: i._count._all, total: i._sum.amount ?? 0 })),
    },
    wallets: {
      byType: walletTxns.map((w: any) => ({ type: w.type, count: w._count._all, total: w._sum.amount ?? 0 })),
    },
  };
}

// =========================================================================
// 6. SUBSCRIPTION REPORTS
// =========================================================================

export async function getSubscriptionReport(actor: Actor, filters: DateRange) {
  const { from, to } = parseRange(filters);

  const [byStatus, totalSubscriptions, planRevenue] = await Promise.all([
    reportRepository.subscriptionsByStatus({ createdAt: { gte: from, lte: to } }),
    prisma.billingSubscription.count(),
    prisma.billingSubscription.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { monthlyPrice: true },
    }),
  ]);

  const plans = await prisma.subscriptionPlan.findMany({
    select: { id: true, name: true, type: true, priceMonthly: true, maxTeachers: true, maxStudents: true, isActive: true },
    orderBy: { priceMonthly: 'asc' },
  });

  const centersWithPlans = await prisma.center.groupBy({
    by: ['planId'], _count: { _all: true },
    where: { planId: { not: null } },
  });

  const planMap = new Map(plans.map((p) => [p.id, p]));
  const planUsage = centersWithPlans.map((c: any) => ({
    plan: planMap.get(c.planId),
    centerCount: c._count._all,
  }));

  return {
    summary: {
      total: totalSubscriptions,
      active: byStatus.find((s: any) => s.status === 'ACTIVE')?._count._all ?? 0,
      expired: byStatus.find((s: any) => s.status === 'EXPIRED')?._count._all ?? 0,
      cancelled: byStatus.find((s: any) => s.status === 'CANCELLED')?._count._all ?? 0,
      totalRevenue: (planRevenue._sum as any)?.monthlyPrice ?? 0,
    },
    byStatus: byStatus.map((s: any) => ({ status: s.status, count: s._count._all })),
    planUsage,
    plans: plans.map((p) => ({
      id: p.id, name: p.name, type: p.type, priceMonthly: p.priceMonthly,
      maxTeachers: p.maxTeachers, maxStudents: p.maxStudents, isActive: p.isActive,
    })),
  };
}

// =========================================================================
// CSV EXPORTS
// =========================================================================

const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export async function exportAttendanceCsv(filters: ReportFilters): Promise<string> {
  const { from, to } = parseRange(filters);
  const where: any = { markedAt: { gte: from, lte: to } };
  if (filters.studentId) where.studentId = filters.studentId;
  if (filters.teacherId) where.lesson = { teacherId: filters.teacherId };
  if (filters.subjectId) where.lesson = { ...(where.lesson || {}), subjectId: filters.subjectId };

  const records = await attendanceRepository.findMany({
    where, take: 100000, orderBy: { markedAt: 'desc' },
    include: {
      lesson: { select: { date: true, startTime: true, subject: { select: { name: true } }, teacher: { include: { user: { select: { fullName: true } } } } } },
      student: { include: { user: { select: { fullName: true } } } },
    },
  });

  const header = ['Student', 'Date', 'Time', 'Subject', 'Teacher', 'Status', 'Marked At'];
  const rows = records.map((r: any) => [
    r.student?.user?.fullName ?? '',
    r.lesson?.date?.toISOString().slice(0, 10) ?? '',
    r.lesson?.startTime ?? '',
    r.lesson?.subject?.name ?? 'General',
    r.lesson?.teacher?.user?.fullName ?? '',
    r.status,
    r.markedAt?.toISOString() ?? '',
  ]);
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}

export async function exportStudentsCsv(filters: ReportFilters): Promise<string> {
  const where: any = {};
  if (filters.gradeId) where.gradeId = filters.gradeId;
  if (filters.search) {
    where.user = { fullName: { contains: filters.search, mode: 'insensitive' } };
  }

  const students = await studentRepository.findMany({
    where, take: 100000,
    include: { user: { select: { fullName: true, username: true, phone: true, email: true, status: true, createdAt: true } }, grade: { select: { name: true } } },
  }) as any;

  const header = ['ID', 'Student Number', 'Full Name', 'Username', 'Phone', 'Email', 'Grade', 'Status', 'Joined'];
  const rows = students.map((s: any) => [
    s.id, s.studentNumber ?? '', s.user.fullName, s.user.username, s.user.phone, s.user.email ?? '',
    s.grade?.name ?? '', s.user.status, s.user.createdAt?.toISOString().slice(0, 10) ?? '',
  ]);
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}

export async function exportSettlementsCsv(filters: DateRange): Promise<string> {
  const { from, to } = parseRange(filters);
  const settlements = await prisma.settlement.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: { teacher: { include: { user: { select: { fullName: true } } } }, center: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }, take: 100000,
  });

  const header = ['Settlement #', 'Period', 'Teacher', 'Center', 'Gross', 'Commission', 'Teacher Share', 'Center Share', 'Net', 'Status', 'Settled At'];
  const rows = settlements.map((s) => [
    s.settlementNumber, s.period, s.teacher.user.fullName, s.center.name,
    s.grossAmount, s.platformCommission, s.teacherShare, s.centerShare, s.netAmount,
    s.status, s.settledAt?.toISOString().slice(0, 10) ?? '',
  ]);
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}

export async function exportInvoicesCsv(filters: DateRange): Promise<string> {
  const { from, to } = parseRange(filters);
  const invoices = await prisma.invoice.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: { center: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }, take: 100000,
  });

  const header = ['Invoice #', 'Payer', 'Amount', 'Currency', 'Status', 'Issued', 'Due', 'Paid'];
  const rows = invoices.map((i) => [
    i.invoiceNumber, i.payerName ?? '', i.amount, i.currency, i.status,
    i.issuedAt?.toISOString().slice(0, 10) ?? '', i.dueAt?.toISOString().slice(0, 10) ?? '', i.paidAt?.toISOString().slice(0, 10) ?? '',
  ]);
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}

export async function exportTeachersCsv(): Promise<string> {
  const teachers = await prisma.teacher.findMany({
    include: {
      user: { select: { fullName: true, username: true, phone: true, email: true, status: true, createdAt: true } },
      subjects: { include: { subject: { select: { name: true } } } },
      _count: { select: { students: true, lessons: true } },
    },
    take: 100000,
  }) as any;

  const header = ['ID', 'Full Name', 'Username', 'Phone', 'Subjects', 'Students', 'Lessons', 'Status', 'Joined'];
  const rows = teachers.map((t: any) => [
    t.id, t.user.fullName, t.user.username, t.user.phone,
    t.subjects.map((s: any) => s.subject.name).join('; '),
    t._count.students, t._count.lessons, t.user.status, t.user.createdAt?.toISOString().slice(0, 10) ?? '',
  ]);
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}

import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Report repository — optimized aggregation queries for reporting.
// All queries respect tenant isolation via the Prisma middleware.
// ---------------------------------------------------------------------------

export const reportRepository = {
  // ---- Generic helpers ----

  count(model: string, where?: any) {
    return (prisma as any)[model].count({ where });
  },

  groupBy(model: string, args: any) {
    return (prisma as any)[model].groupBy(args);
  },

  aggregate(model: string, args: any) {
    return (prisma as any)[model].aggregate(args);
  },

  findMany(model: string, args: any) {
    return (prisma as any)[model].findMany(args);
  },

  // ---- User / People counts ----

  countUsersByRole(where?: Prisma.UserWhereInput) {
    return prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
      where,
    });
  },

  countUsers(where: Prisma.UserWhereInput) {
    return prisma.user.count({ where });
  },

  // ---- Student analytics ----

  countStudentsByGrade() {
    return prisma.student.groupBy({
      by: ['gradeId'],
      _count: { _all: true },
      where: { gradeId: { not: null } },
    });
  },

  studentGrowthByMonth(from: Date, to: Date) {
    return prisma.user.groupBy({
      by: ['createdAt'],
      _count: { _all: true },
      where: { createdAt: { gte: from, lte: to }, role: 'STUDENT' },
    });
  },

  // ---- Teacher analytics ----

  teacherStudentCounts() {
    return prisma.teacherStudent.groupBy({
      by: ['teacherId'],
      _count: { _all: true },
    });
  },

  teacherRatings() {
    return prisma.rating.groupBy({
      by: ['teacherId'],
      _avg: { stars: true },
      _count: { _all: true },
    });
  },

  // ---- Lesson analytics ----

  lessonsByStatus(where?: Prisma.LessonWhereInput) {
    return prisma.lesson.groupBy({
      by: ['status'],
      _count: { _all: true },
      where,
    });
  },

  lessonsPerMonth(from: Date, to: Date) {
    return prisma.lesson.groupBy({
      by: ['date'],
      _count: { _all: true },
      where: { date: { gte: from, lte: to } },
    });
  },

  lessonsByTeacher(teacherId: string, from: Date, to: Date) {
    return prisma.lesson.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: { teacherId, date: { gte: from, lte: to } },
    });
  },

  lessonsByStudent(studentId: string, from: Date, to: Date) {
    return prisma.lesson.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: { studentId, date: { gte: from, lte: to } },
    });
  },

  lessonsBySubject(from: Date, to: Date) {
    return prisma.lesson.groupBy({
      by: ['subjectId'],
      _count: { _all: true },
      where: { subjectId: { not: null }, date: { gte: from, lte: to } },
    });
  },

  // ---- Attendance analytics ----

  attendanceByStatus(where?: Prisma.AttendanceWhereInput) {
    return prisma.attendance.groupBy({
      by: ['status'],
      _count: { _all: true },
      where,
    });
  },

  attendanceByStudent(studentId: string) {
    return prisma.attendance.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: { studentId },
    });
  },

  attendanceByTeacher(teacherId: string, from: Date, to: Date) {
    return prisma.attendance.findMany({
      where: {
        lesson: { teacherId, date: { gte: from, lte: to } },
      },
      select: { status: true },
    });
  },

  attendanceBySubject(from: Date, to: Date) {
    return prisma.attendance.findMany({
      where: { lesson: { subjectId: { not: null }, date: { gte: from, lte: to } } },
      select: {
        status: true,
        lesson: { select: { subjectId: true, subject: { select: { name: true } } } },
      },
    });
  },

  attendanceByDateRange(from: Date, to: Date) {
    return prisma.attendance.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: {
        markedAt: { gte: from, lte: to },
      },
    });
  },

  // ---- Payment / Financial analytics ----

  paymentsByStatus(where?: Prisma.PaymentWhereInput) {
    return prisma.payment.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { amount: true },
      where,
    });
  },

  paymentsByMethod(where?: Prisma.PaymentWhereInput) {
    return prisma.payment.groupBy({
      by: ['method'],
      _count: { _all: true },
      _sum: { amount: true },
      where,
    });
  },

  revenueByMonth(from: Date, to: Date) {
    return prisma.payment.groupBy({
      by: ['createdAt'],
      _sum: { amount: true },
      _count: { _all: true },
      where: { status: 'PAID', createdAt: { gte: from, lte: to } },
    });
  },

  totalRevenue(where?: Prisma.PaymentWhereInput) {
    return prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
      where: { ...where, status: 'PAID' },
    });
  },

  // ---- Wallet analytics ----

  walletTransactionSummary(where?: Prisma.WalletTransactionWhereInput) {
    return prisma.walletTransaction.groupBy({
      by: ['type'],
      _sum: { amount: true },
      _count: { _all: true },
      where,
    });
  },

  // ---- Invoice analytics ----

  invoicesByStatus(where?: Prisma.InvoiceWhereInput) {
    return prisma.invoice.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { amount: true },
      where,
    });
  },

  // ---- Settlement analytics ----

  settlementsByStatus(where?: Prisma.SettlementWhereInput) {
    return prisma.settlement.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: {
        grossAmount: true,
        platformCommission: true,
        teacherShare: true,
        centerShare: true,
        netAmount: true,
      },
      where,
    });
  },

  // ---- Subscription analytics ----

  subscriptionsByStatus(where?: Prisma.BillingSubscriptionWhereInput) {
    return prisma.billingSubscription.groupBy({
      by: ['status'],
      _count: { _all: true },
      where,
    });
  },

  // ---- Exam analytics ----

  examAttemptsAggregate(where?: Prisma.ExamAttemptWhereInput) {
    return prisma.examAttempt.aggregate({
      _avg: { percentage: true },
      _max: { percentage: true },
      _min: { percentage: true },
      _count: { _all: true },
      where,
    });
  },

  // ---- Assignment analytics ----

  assignmentSubmissionsAggregate(where?: Prisma.AssignmentSubmissionWhereInput) {
    return prisma.assignmentSubmission.aggregate({
      _avg: { grade: true },
      _count: { _all: true },
      where,
    });
  },

  // ---- Activity logs ----

  activityLogs(page: number, limit: number) {
    return prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { fullName: true, username: true } } },
    });
  },

  countActivityLogs() {
    return prisma.activityLog.count();
  },
};

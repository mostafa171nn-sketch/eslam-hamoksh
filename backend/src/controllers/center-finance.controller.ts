import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';
import * as settlementService from '../services/settlement.service';
import { getCenterCommissionRate } from '../services/commission.service';

export const getFinanceOverview = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const commissionRate = await getCenterCommissionRate(centerId);

  const [todayPayments, totalCollectedResult, teacherDues, todayExpenses, pendingPayments] =
    await Promise.all([
      prisma.payment.findMany({
        where: { centerId, status: { in: ['PAID', 'COMPLETED'] }, paidAt: { gte: todayStart, lt: todayEnd } },
        select: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { centerId, status: { in: ['PAID', 'COMPLETED'] } },
        _sum: { amount: true },
      }),
      prisma.settlement.aggregate({
        where: { centerId, status: { in: ['CALCULATED', 'APPROVED'] } },
        _sum: { teacherShare: true },
      }),
      prisma.expense.aggregate({
        where: { centerId, date: { gte: todayStart, lt: todayEnd } },
        _sum: { amount: true },
      }),
      prisma.payment.count({ where: { centerId, status: 'PENDING' } }),
    ]);

  const todayGross = todayPayments.reduce((sum, p) => sum + p.amount, 0);
  const todayCenterShare = Math.round(todayGross * commissionRate);

  return ok(res, {
    todayIncome: todayCenterShare / 100,
    totalCollected: (totalCollectedResult._sum.amount ?? 0) / 100,
    teacherDues: (teacherDues._sum.teacherShare ?? 0) / 100,
    todayExpenses: (todayExpenses._sum.amount ?? 0) / 100,
    pendingPayments,
  });
});

export const listExpenses = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { from, to, category } = req.query as Record<string, string | undefined>;

  const expenses = await prisma.expense.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: 'desc' },
    take: 200,
  });

  return ok(
    res,
    expenses.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      amount: e.amount / 100,
      date: e.date,
      note: e.note,
    })),
  );
});

export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { title, category, amount, date, note } = req.body ?? {};
  if (!title) throw ApiError.badRequest('Expense title is required');
  if (!amount || Number(amount) <= 0) throw ApiError.badRequest('A positive expense amount is required');

  const expense = await prisma.expense.create({
    data: {
      centerId,
      title,
      category: category || null,
      amount: Math.round(Number(amount) * 100),
      date: date ? new Date(date) : new Date(),
      note: note || null,
      createdBy: req.user!.id,
    },
  });

  await recordActivity({ userId: req.user!.id, action: 'created_expense', entity: 'Expense', entityId: expense.id });

  return ok(res, expense, 'Expense created');
});

export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const expense = await prisma.expense.findFirst({ where: { id, centerId } });
  if (!expense) throw ApiError.notFound('Expense not found');

  await prisma.expense.delete({ where: { id } });
  await recordActivity({ userId: req.user!.id, action: 'deleted_expense', entity: 'Expense', entityId: id });

  return ok(res, { id }, 'Expense deleted');
});

export const listFinanceSettlements = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const role = req.user!.role;
  const { status, page = 1, limit = 50 } = req.query as Record<string, string>;

  const result = await settlementService.listSettlements(
    { userId, role },
    {
      status,
      page: Number(page),
      limit: Number(limit),
    },
  );

  return ok(res, result.settlements, 'Settlements loaded');
});

export const fetchSettlementSummary = asyncHandler(async (req: Request, res: Response) => {
  const result = await settlementService.getSettlementSummary({ userId: req.user!.id, role: req.user!.role });
  return ok(res, result, 'Settlement summary loaded');
});

export const approveFinanceSettlement = asyncHandler(async (req: Request, res: Response) => {
  const settlement = await settlementService.approveSettlement(
    { userId: req.user!.id, role: req.user!.role },
    req.params.id,
  );
  return ok(res, settlement, 'Settlement approved');
});

export const payFinanceSettlement = asyncHandler(async (req: Request, res: Response) => {
  const settlement = await settlementService.markSettlementPaid(
    { userId: req.user!.id, role: req.user!.role },
    req.params.id,
  );
  return ok(res, settlement, 'Settlement marked as paid');
});

export const calculateFinanceSettlement = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { teacherId, period } = req.body ?? {};
  if (!teacherId || !period) throw ApiError.badRequest('teacherId and period are required');

  const settlement = await settlementService.calculateSettlement(
    { userId: req.user!.id, role: req.user!.role },
    { centerId, teacherId, period },
  );
  return ok(res, settlement, 'Settlement calculated');
});

export const getStudentLedger = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { search } = req.query as Record<string, string | undefined>;

  const students = await prisma.student.findMany({
    where: { centerId, ...(search ? { user: { fullName: { contains: search } } } : {}) },
    include: {
      user: { select: { fullName: true } },
      payments: {
        where: { status: { in: ['PAID', 'COMPLETED'] } },
        select: { amount: true, createdAt: true },
      },
      groupEnrollments: { where: { status: 'ACTIVE' }, select: { groupId: true }, take: 5 },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return ok(
    res,
    students.map((s) => ({
      id: s.id,
      name: s.user.fullName,
      totalPaid: s.payments.reduce((sum, p) => sum + p.amount, 0) / 100,
      lastPayment: s.payments.length > 0 ? s.payments[s.payments.length - 1].createdAt : null,
      paymentCount: s.payments.length,
      groupsCount: s.groupEnrollments.length,
      balance: 0,
    })),
  );
});

export const getStudentLedgerDetail = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { studentId } = req.params;

  const student = await prisma.student.findFirst({
    where: { id: studentId, centerId },
    include: {
      user: { select: { fullName: true, photo: true, phone: true } },
      payments: {
        where: { centerId, status: { in: ['PAID', 'COMPLETED'] } },
        include: {
          teacher: { include: { user: { select: { fullName: true } } } },
          lesson: { select: { subject: { select: { name: true } }, date: true } },
        },
        orderBy: { paidAt: 'desc', createdAt: 'desc' },
      },
      attendance: {
        where: { centerId },
        include: { lesson: { select: { subject: { select: { name: true } }, date: true } } },
        orderBy: { markedAt: 'desc' },
        take: 30,
      },
      groupEnrollments: {
        where: { status: 'ACTIVE' },
        include: { group: { select: { id: true, name: true, teacher: { select: { user: { select: { fullName: true } } } } } } },
      },
    },
  });

  if (!student) throw ApiError.notFound('Student not found');

  const commissionRate = await getCenterCommissionRate(centerId);

  const totalPaid = student.payments.reduce((sum, p) => sum + p.amount, 0);
  const centerShareTotal = Math.round(totalPaid * commissionRate);

  return ok(res, {
    id: student.id,
    name: student.user.fullName,
    photo: student.user.photo,
    phone: student.user.phone,
    totalPaid: totalPaid / 100,
    centerShareTotal: centerShareTotal / 100,
    teacherShareTotal: (totalPaid - centerShareTotal) / 100,
    paymentCount: student.payments.length,
    groups: student.groupEnrollments.map((e) => ({
      id: e.group.id,
      name: e.group.name,
      teacherName: e.group.teacher?.user?.fullName || '—',
    })),
    payments: student.payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      amount: p.amount / 100,
      centerShare: Math.round(p.amount * commissionRate) / 100,
      type: p.type,
      method: p.method,
      status: p.status,
      paidAt: p.paidAt?.toISOString() || p.createdAt.toISOString(),
      teacherName: p.teacher?.user?.fullName || '—',
      lesson: p.lesson ? { subject: p.lesson.subject?.name || '—', date: p.lesson.date } : null,
    })),
    attendance: student.attendance.map((a) => ({
      id: a.id,
      status: a.status,
      lesson: a.lesson.subject?.name || '—',
      date: a.lesson.date,
      markedAt: a.markedAt,
    })),
  });
});

export const listCollections = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { search, page = 1, limit = 20 } = req.query as Record<string, string | undefined>;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = { centerId, status: { in: ['PAID', 'COMPLETED'] } };
  if (search) {
    where.OR = [
      { student: { user: { fullName: { contains: search, mode: 'insensitive' } } } },
      { paymentNumber: { contains: search } },
    ];
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        teacher: { include: { user: { select: { fullName: true } } } },
        lesson: { select: { subject: { select: { name: true } }, date: true } },
      },
      orderBy: { paidAt: 'desc', createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.payment.count({ where }),
  ]);

  const commissionRate = await getCenterCommissionRate(centerId);

  const items = payments.map((p) => {
    const centerShare = Math.round(p.amount * commissionRate);
    return {
      id: p.id,
      paymentNumber: p.paymentNumber,
      studentName: p.student?.user?.fullName || '—',
      teacherName: p.teacher?.user?.fullName || '—',
      type: p.type,
      method: p.method,
      status: p.status,
      amount: p.amount / 100,
      centerShare: centerShare / 100,
      teacherShare: (p.amount - centerShare) / 100,
      paidAt: p.paidAt?.toISOString() || p.createdAt.toISOString(),
      lesson: p.lesson ? { subject: p.lesson.subject?.name || '—', date: p.lesson.date } : null,
    };
  });

  return ok(res, items, 'Collections loaded', {
    page: Number(page),
    limit: Number(limit),
    total,
    totalPages: Math.ceil(total / Number(limit)),
  });
});
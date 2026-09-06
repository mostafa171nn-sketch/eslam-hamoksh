import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';
import * as settlementService from '../services/settlement.service';

export const getFinanceOverview = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [todayIncome, totalCollected, teacherDues, todayExpenses, pendingPayments] =
    await Promise.all([
      prisma.payment.aggregate({
        where: { centerId, status: { in: ['PAID', 'COMPLETED'] }, paidAt: { gte: todayStart, lt: todayEnd } },
        _sum: { amount: true },
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

  return ok(res, {
    todayIncome: (todayIncome._sum.amount ?? 0) / 100,
    totalCollected: (totalCollected._sum.amount ?? 0) / 100,
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
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

export const getCenterPayments = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const { search, status, page = 1, limit = 20 } = req.query as any;

  const where: any = { centerId };
  if (status) where.status = status;
  if (search) {
    where.student = {
      user: { fullName: { contains: search, mode: 'insensitive' } },
    };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        student: {
          include: { user: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.payment.count({ where }),
  ]);

  const items = payments.map(p => ({
    id: p.id,
    studentId: p.studentId,
    studentName: p.student?.user?.fullName || 'Unknown',
    amount: p.amount,
    status: p.status,
    method: p.method,
    reference: p.transactionReference,
    dueDate: p.paidAt?.toISOString() || p.createdAt.toISOString(),
    paidAt: p.paidAt?.toISOString() || null,
    description: null,
    createdAt: p.createdAt.toISOString(),
  }));

  return ok(res, items, 'Payments loaded', {
    page: Number(page),
    limit: Number(limit),
    total,
    totalPages: Math.ceil(total / Number(limit)),
  });
});

export const getCenterPaymentsStats = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalRevenue, pendingAmount, overdueCount, paidThisMonth] = await Promise.all([
    prisma.payment.aggregate({
      where: { centerId, status: 'PAID' },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { centerId, status: 'PENDING' },
      _sum: { amount: true },
    }),
    prisma.payment.count({
      where: {
        centerId,
        status: 'PENDING',
        paidAt: { lt: now },
      },
    }),
    prisma.payment.aggregate({
      where: {
        centerId,
        status: 'PAID',
        paidAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    }),
  ]);

  return ok(res, {
    totalRevenue: totalRevenue._sum.amount || 0,
    pendingAmount: pendingAmount._sum.amount || 0,
    overdueCount,
    paidThisMonth: paidThisMonth._sum.amount || 0,
  });
});

export const recordCenterPayment = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const { studentId, amount, dueDate, description, method } = req.body;

  if (!studentId || !amount) {
    throw ApiError.badRequest('Student and amount are required');
  }

  const payment = await prisma.payment.create({
    data: {
      centerId,
      studentId,
      amount,
      method: method || 'CASH',
      type: 'MONTHLY',
      payerName: 'Center',
      payerId: req.user!.id,
      teacherId: req.user!.id,
      status: 'PENDING',
      paymentNumber: `PAY-${Date.now()}`,
    },
  });

  await recordActivity({
    userId: req.user!.id,
    action: 'recorded_payment',
    entity: 'Payment',
    entityId: payment.id,
    details: JSON.stringify({ amount, studentId }),
  });

  return ok(res, payment, 'Payment recorded');
});

export const updateCenterPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const { id } = req.params;
  const { status, method, reference } = req.body;

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment || payment.centerId !== centerId) {
    throw ApiError.notFound('Payment not found');
  }

  const updateData: any = { status };
  if (status === 'PAID') {
    updateData.paidAt = new Date();
    if (method) updateData.method = method;
    if (reference) updateData.transactionReference = reference;
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: updateData,
  });

  await recordActivity({
    userId: req.user!.id,
    action: `payment_${status.toLowerCase()}`,
    entity: 'Payment',
    entityId: id,
  });

  return ok(res, updated, 'Payment updated');
});

import {
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  Prisma,
  Role,
  SubscriptionStatus,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { fileUrl } from '../middleware/upload';
import { recordActivity } from './activity.service';
import { sendNotification } from './notification.service';
import { getCenterSettings } from './center.service';
import { paymentRepository } from '../repositories/payment.repository';
import { billingSubscriptionRepository } from '../repositories/billing-subscription.repository';
import { walletRepository } from '../repositories/wallet.repository';
import { walletTransactionRepository } from '../repositories/wallet-transaction.repository';
import { teacherRepository } from '../repositories/teacher.repository';
import { studentRepository } from '../repositories/student.repository';
import { parentRepository } from '../repositories/parent.repository';
import { userRepository } from '../repositories/user.repository';
import { lessonRepository } from '../repositories/lesson.repository';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  VODAFONE_CASH: 'Vodafone Cash',
  ETISALAT_CASH: 'Etisalat Cash',
  ORANGE_CASH: 'Orange Cash',
  INSTAPAY: 'InstaPay',
  TELDA: 'Telda',
  CASH: 'Cash',
  WALLET: 'Wallet',
  LATER: 'Pay Later',
  WISE: 'Wise',
};

// ---------------------------------------------------------------------------
// Teacher payment settings
// ---------------------------------------------------------------------------

export async function getTeacherPaymentSettings(teacherId: string) {
  const existing = await teacherRepository.findPaymentSettings(teacherId);
  if (existing) return existing;
  return teacherRepository.upsertPaymentSettings(
    teacherId,
    { sessionEnabled: true, monthlyEnabled: false, sessionPrice: 0, monthlyPrice: 0 },
    {},
  );
}

export interface TeacherPaymentSettingsInput {
  sessionEnabled?: boolean;
  monthlyEnabled?: boolean;
  sessionPrice?: number;
  monthlyPrice?: number;
  vodafoneCash?: string | null;
  etisalatCash?: string | null;
  orangeCash?: string | null;
  instaPay?: string | null;
  telda?: string | null;
}

export async function updateTeacherPaymentSettings(teacherId: string, input: TeacherPaymentSettingsInput) {
  const data: Record<string, unknown> = {};
  if (input.sessionEnabled !== undefined) data.sessionEnabled = input.sessionEnabled;
  if (input.monthlyEnabled !== undefined) data.monthlyEnabled = input.monthlyEnabled;
  if (input.sessionPrice !== undefined) {
    if (input.sessionPrice < 0 || input.sessionPrice > 1_000_000) throw ApiError.badRequest('Invalid session price.');
    data.sessionPrice = input.sessionPrice;
  }
  if (input.monthlyPrice !== undefined) {
    if (input.monthlyPrice < 0 || input.monthlyPrice > 10_000_000) throw ApiError.badRequest('Invalid monthly price.');
    data.monthlyPrice = input.monthlyPrice;
  }
  for (const key of ['vodafoneCash', 'etisalatCash', 'orangeCash', 'instaPay', 'telda'] as const) {
    if (input[key] !== undefined) data[key] = input[key];
  }

  return teacherRepository.upsertPaymentSettings(teacherId, data, data);
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method];
}

// ---------------------------------------------------------------------------
// Public helper endpoints (for payment creation forms)
// ---------------------------------------------------------------------------

export async function listPayableTeachers() {
  const teachers = await teacherRepository.findMany({
    where: { paymentSettings: { OR: [{ sessionEnabled: true }, { monthlyEnabled: true }] } },
    include: {
      user: { select: { fullName: true, photo: true } },
      paymentSettings: true,
    },
  }) as any;
  return teachers.map((t: any) => ({
    id: t.id,
    fullName: t.user.fullName,
    photo: fileUrl(t.user.photo),
    sessionEnabled: t.paymentSettings?.sessionEnabled ?? false,
    monthlyEnabled: t.paymentSettings?.monthlyEnabled ?? false,
    sessionPrice: t.paymentSettings?.sessionPrice ?? 0,
    monthlyPrice: t.paymentSettings?.monthlyPrice ?? 0,
    methods: {
      VODAFONE_CASH: t.paymentSettings?.vodafoneCash ?? null,
      ETISALAT_CASH: t.paymentSettings?.etisalatCash ?? null,
      ORANGE_CASH: t.paymentSettings?.orangeCash ?? null,
      INSTAPAY: t.paymentSettings?.instaPay ?? null,
      TELDA: t.paymentSettings?.telda ?? null,
    },
  }));
}

export async function listParentStudents(actor: { userId: string; role: Role }) {
  if (actor.role !== 'PARENT') return [];
  const parent = await parentRepository.findByUserId(actor.userId);
  if (!parent) return [];
  const links = await parentRepository.findParentStudentsWithUser(parent.id);
  return links.map((l) => ({
    id: l.student.id,
    fullName: l.student.user.fullName,
    photo: fileUrl(l.student.user.photo),
  }));
}

// ---------------------------------------------------------------------------
// Create payment
// ---------------------------------------------------------------------------

export interface CreatePaymentInput {
  teacherId: string;
  studentId: string;
  type: PaymentType;
  method: PaymentMethod;
  amount?: number;
  lessonId?: string;
  subscriptionId?: string;
  transactionReference?: string;
  proofUrl?: string;
}

async function nextPaymentNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}-`;
  const count = await tx.payment.count({ where: { paymentNumber: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(6, '0')}`;
}

const MAX_PAYMENT_RETRIES = 3;

export async function createPayment(actor: { userId: string; role: Role }, input: CreatePaymentInput) {
  if (actor.role !== 'STUDENT' && actor.role !== 'PARENT') {
    throw ApiError.forbidden('Only students and parents can submit payments.');
  }

  const teacher = await teacherRepository.findUnique({ id: input.teacherId }, {
    user: { select: { fullName: true, id: true } },
    paymentSettings: true,
  }) as any;
  if (!teacher) throw ApiError.notFound('Teacher not found.');
  const settings = teacher.paymentSettings;
  if (!settings) throw ApiError.badRequest('This teacher has not configured payments yet.', 'PAYMENTS_DISABLED');

  const student = await studentRepository.findUnique({
    where: { id: input.studentId },
    include: { user: { select: { fullName: true } } },
  }) as any;
  if (!student) throw ApiError.notFound('Student not found.');

  // Payer identity + ownership enforcement.
  let payerId = actor.userId;
  let payerName = '';
  let parentId: string | null = null;
  if (actor.role === 'STUDENT') {
    const me = await studentRepository.findByUserId(actor.userId);
    if (!me || me.id !== input.studentId) throw ApiError.forbidden('You can only pay for your own lessons.');
    payerName = student.user.fullName;
  } else {
    const parent = await parentRepository.findByUserId(actor.userId);
    if (!parent) throw ApiError.notFound('Parent profile not found.');
    const owns = await studentRepository.findParentStudent(parent.id, input.studentId);
    if (!owns) throw ApiError.forbidden("You can only pay for your own children.");
    parentId = parent.id;
    const parentUser = await userRepository.findById(actor.userId);
    payerName = parentUser?.fullName ?? '';
  }

  // Validate method is enabled by teacher and destination exists.
  const methodEnabled =
    (input.method === 'VODAFONE_CASH' && settings.vodafoneCash) ||
    (input.method === 'ETISALAT_CASH' && settings.etisalatCash) ||
    (input.method === 'ORANGE_CASH' && settings.orangeCash) ||
    (input.method === 'INSTAPAY' && settings.instaPay) ||
    (input.method === 'TELDA' && settings.telda);
  if (!methodEnabled) {
    throw ApiError.badRequest('This payment method is not enabled by the teacher.', 'METHOD_DISABLED');
  }

  // Pricing model validation + amount snapshot.
  let amount = input.amount;
  if (input.type === 'SESSION') {
    if (!settings.sessionEnabled) throw ApiError.badRequest('Session payments are not enabled by this teacher.');
    if (amount == null) amount = settings.sessionPrice;
  } else if (input.type === 'MONTHLY') {
    if (!settings.monthlyEnabled) throw ApiError.badRequest('Monthly payments are not enabled by this teacher.');
    if (amount == null) amount = settings.monthlyPrice;
  } else {
    throw ApiError.badRequest('Invalid payment type.');
  }
  if (!amount || amount <= 0) throw ApiError.badRequest('A valid payment amount is required.', 'INVALID_AMOUNT');

  // Link validation.
  if (input.lessonId) {
    const lesson = await lessonRepository.findForPayment(input.lessonId);
    if (!lesson) throw ApiError.notFound('Lesson not found.');
    if (lesson.teacherId !== teacher.id || lesson.studentId !== student.id) {
      throw ApiError.badRequest('The selected lesson does not belong to this teacher and student.', 'INVALID_LESSON');
    }
  }
  if (input.subscriptionId) {
    const sub = await billingSubscriptionRepository.findById(input.subscriptionId);
    if (!sub || sub.teacherId !== teacher.id || sub.studentId !== student.id) {
      throw ApiError.badRequest('The selected subscription is invalid.', 'INVALID_SUBSCRIPTION');
    }
  }

  const center = await getCenterSettings();
  const currency = center.currency || 'EGP';

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_PAYMENT_RETRIES; attempt++) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const paymentNumber = await nextPaymentNumber(tx);
        const payment = await tx.payment.create({
          data: {
            paymentNumber,
            payerId,
            payerName,
            studentId: student.id,
            parentId,
            teacherId: teacher.id,
            lessonId: input.lessonId ?? null,
            subscriptionId: input.subscriptionId ?? null,
            amount,
            currency,
            type: input.type,
            method: input.method,
            status: 'PENDING',
            transactionReference: input.transactionReference,
            proofUrl: input.proofUrl ?? null,
          },
        });
        await tx.paymentStatusHistory.create({
          data: { paymentId: payment.id, newStatus: 'PENDING', changedById: actor.userId, changedByName: payerName },
        });
        return payment;
      });

      await sendNotification({
        userId: teacher.user.id,
        type: 'GENERAL',
        title: 'New payment submitted',
        message: `${payerName} submitted a ${input.type === 'MONTHLY' ? 'monthly' : 'session'} payment of ${amount} ${currency}.`,
      });
      await recordActivity({
        userId: actor.userId,
        role: actor.role,
        action: 'created_payment',
        entity: 'Payment',
        entityId: result.id,
        details: result.paymentNumber,
      });

      return serializePayment(result);
    } catch (err: any) {
      // Unique constraint collision on paymentNumber — retry with a new number
      if (err?.code === 'P2002' && err?.meta?.target?.includes('paymentNumber')) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastError ?? ApiError.internal('Failed to create payment after retries.');
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

function serializePayment(p: any) {
  return {
    id: p.id,
    paymentNumber: p.paymentNumber,
    payerId: p.payerId,
    payerName: p.payerName,
    studentId: p.studentId,
    parentId: p.parentId,
    teacherId: p.teacherId,
    lessonId: p.lessonId,
    subscriptionId: p.subscriptionId,
    amount: p.amount,
    currency: p.currency,
    type: p.type,
    method: p.method,
    methodLabel: paymentMethodLabel(p.method),
    status: p.status,
    transactionReference: p.transactionReference,
    proofUrl: fileUrl(p.proofUrl),
    rejectionReason: p.rejectionReason,
    approvedById: p.approvedById,
    paidAt: p.paidAt,
    refundedAt: p.refundedAt,
    refundAmount: p.refundAmount,
    refundReason: p.refundReason,
    refundedById: p.refundedById,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

export interface PaymentFilters {
  status?: string;
  type?: string;
  method?: string;
  teacherId?: string;
  studentId?: string;
  parentId?: string;
  payerId?: string;
  lessonId?: string;
  subscriptionId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

function buildPaymentWhere(f: PaymentFilters): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = {};
  if (f.status) where.status = f.status as PaymentStatus;
  if (f.type) where.type = f.type as PaymentType;
  if (f.method) where.method = f.method as PaymentMethod;
  if (f.teacherId) where.teacherId = f.teacherId;
  if (f.studentId) where.studentId = f.studentId;
  if (f.parentId) where.parentId = f.parentId;
  if (f.payerId) where.payerId = f.payerId;
  if (f.lessonId) where.lessonId = f.lessonId;
  if (f.subscriptionId) where.subscriptionId = f.subscriptionId;
  if (f.dateFrom || f.dateTo) {
    where.createdAt = {};
    if (f.dateFrom) (where.createdAt as any).gte = new Date(f.dateFrom);
    if (f.dateTo) (where.createdAt as any).lte = new Date(f.dateTo + 'T23:59:59.999Z');
  }
  if (f.search) {
    where.OR = [
      { paymentNumber: { contains: f.search, mode: 'insensitive' } },
      { payerName: { contains: f.search, mode: 'insensitive' } },
      { transactionReference: { contains: f.search, mode: 'insensitive' } },
      { student: { user: { fullName: { contains: f.search, mode: 'insensitive' } } } },
      { teacher: { user: { fullName: { contains: f.search, mode: 'insensitive' } } } },
    ];
  }
  return where;
}

const PAYMENT_INCLUDE: Prisma.PaymentInclude = {
  student: { include: { user: { select: { fullName: true, photo: true } } } },
  teacher: { include: { user: { select: { fullName: true } } } },
  parent: { include: { user: { select: { fullName: true } } } },
  lesson: { include: { subject: true } },
  billingSubscription: true,
  history: { orderBy: { createdAt: 'asc' } },
};

export async function listPayments(actor: { userId: string; role: Role }, filters: PaymentFilters) {
  const { page = 1, limit = 25, sort = 'newest' } = filters;
  const where = buildPaymentWhere(filters);

  const orderBy: Prisma.PaymentOrderByWithRelationInput =
    sort === 'oldest'
      ? { createdAt: 'asc' }
      : sort === 'highest'
        ? { amount: 'desc' }
        : sort === 'lowest'
          ? { amount: 'asc' }
          : sort === 'updated'
            ? { updatedAt: 'desc' }
            : { createdAt: 'desc' };

  const [total, payments] = await Promise.all([
    paymentRepository.count(where),
    paymentRepository.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: PAYMENT_INCLUDE,
    }),
  ]);

  return {
    data: payments.map(serializePaymentDetail),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

function serializePaymentDetail(p: any) {
  const base = serializePayment(p);
  return {
    ...base,
    student: { id: p.student.id, fullName: p.student.user.fullName, photo: fileUrl(p.student.user.photo) },
    teacher: { id: p.teacher.id, fullName: p.teacher.user.fullName },
    parent: p.parent ? { id: p.parent.id, fullName: p.parent.user.fullName } : null,
    lesson: p.lesson ? { id: p.lesson.id, subject: p.lesson.subject?.name ?? 'General' } : null,
    subscription: p.billingSubscription ? { id: p.billingSubscription.id, status: p.billingSubscription.status } : null,
    history: (p.history ?? []).map((h: any) => ({
      id: h.id,
      oldStatus: h.oldStatus,
      newStatus: h.newStatus,
      changedByName: h.changedByName,
      reason: h.reason,
      createdAt: h.createdAt,
    })),
  };
}

export async function getPayment(actor: { userId: string; role: Role }, id: string) {
  const payment = await paymentRepository.findById(id);
  if (!payment) throw ApiError.notFound('Payment not found.');

  if (actor.role === 'CENTER_ADMIN' || actor.role === 'SUPER_ADMIN') {
    // full access
  } else if (actor.role === 'TEACHER') {
    const teacher = await teacherRepository.findByUserId(actor.userId);
    if (!teacher || teacher.id !== payment.teacherId) throw ApiError.forbidden('You can only view your own payments.');
  } else if (actor.role === 'STUDENT') {
    const me = await studentRepository.findByUserId(actor.userId);
    if (!me || (me.id !== payment.studentId && payment.payerId !== actor.userId)) {
      throw ApiError.forbidden('You can only view your own payments.');
    }
  } else if (actor.role === 'PARENT') {
    const parent = await parentRepository.findByUserId(actor.userId);
    if (!parent || (parent.id !== payment.parentId && payment.payerId !== actor.userId)) {
      throw ApiError.forbidden('You can only view your own payments.');
    }
  }
  return serializePaymentDetail(payment);
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

async function applyStatusChange(
  id: string,
  newStatus: PaymentStatus,
  changedById: string,
  changedByName: string,
  extra: Record<string, unknown> = {},
  reason?: string,
) {
  const payment = await paymentRepository.findById(id);
  if (!payment) throw ApiError.notFound('Payment not found.');
  if (payment.status === newStatus && newStatus !== 'REJECTED') {
    return serializePaymentDetail(await paymentRepository.findById(id));
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id },
      data: { status: newStatus, ...extra },
    });
    await tx.paymentStatusHistory.create({
      data: {
        paymentId: id,
        oldStatus: payment.status,
        newStatus,
        changedById,
        changedByName,
        reason,
      },
    });
    return updated;
  });

  // Activate subscription when a monthly payment is approved.
  if (newStatus === 'PAID' && payment.subscriptionId) {
    const sub = await billingSubscriptionRepository.findById(payment.subscriptionId);
    if (sub && sub.status !== 'ACTIVE') {
      await billingSubscriptionRepository.update(sub.id, { status: 'ACTIVE' });
    }
  }

  // Auto-create invoice when payment is approved
  if (newStatus === 'PAID') {
    try {
      const { createInvoiceForPayment } = await import('./invoice.service.js');
      await createInvoiceForPayment({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        payerId: payment.payerId,
        payerName: payment.payerName,
        centerId: payment.centerId,
        studentId: payment.studentId,
        student: payment.student as any,
      });
    } catch (e) {
      // Invoice creation failure should not block payment approval
    }
  }

  // Wallet payment: deduct from payer's wallet on approval, refund on refund
  if (payment.method === 'WALLET') {
    try {
      if (newStatus === 'PAID') {
        const wallet = await walletRepository.findByUserId(payment.payerId);
        if (wallet && wallet.balance >= payment.amount && wallet.status === 'ACTIVE') {
          await prisma.$transaction(async (tx) => {
            const balanceBefore = wallet.balance;
            const balanceAfter = balanceBefore - payment.amount;
            await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                type: 'PURCHASE',
                amount: -payment.amount,
                balanceBefore,
                balanceAfter,
                referenceType: 'Payment',
                referenceId: payment.id,
                description: `Payment ${payment.paymentNumber} via wallet`,
                createdBy: changedById,
              },
            });
          });
        }
      } else if (newStatus === 'REFUNDED') {
        const wallet = await walletRepository.findByUserId(payment.payerId);
        if (wallet && wallet.status === 'ACTIVE') {
          const refundAmount = (payment.refundAmount as number) ?? payment.amount;
          await prisma.$transaction(async (tx) => {
            const balanceBefore = wallet.balance;
            const balanceAfter = balanceBefore + refundAmount;
            await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                type: 'REFUND',
                amount: refundAmount,
                balanceBefore,
                balanceAfter,
                referenceType: 'Payment',
                referenceId: payment.id,
                description: `Refund for payment ${payment.paymentNumber}`,
                createdBy: changedById,
              },
            });
          });
        }
      }
    } catch (e) {
      // Wallet errors logged but not blocking payment flow
    }
  }

  await sendNotification({
    userId: payment.payerId,
    type: 'GENERAL',
    title: newStatus === 'PAID' ? 'Payment approved' : newStatus === 'REJECTED' ? 'Payment rejected' : 'Payment updated',
    message:
      newStatus === 'PAID'
        ? `Your payment ${payment.paymentNumber} of ${payment.amount} ${payment.currency} was approved.`
        : newStatus === 'REJECTED'
          ? `Your payment ${payment.paymentNumber} was rejected.${reason ? ' Reason: ' + reason : ''}`
          : `Your payment ${payment.paymentNumber} status changed to ${newStatus}.`,
  });

  return serializePaymentDetail(await paymentRepository.findById(id));
}

export async function approvePayment(actor: { userId: string; role: Role }, id: string) {
  const payment = await paymentRepository.findById(id);
  if (!payment) throw ApiError.notFound('Payment not found.');
  if (actor.role === 'TEACHER') {
    const teacher = await teacherRepository.findByUserId(actor.userId);
    if (!teacher || teacher.id !== payment.teacherId) throw ApiError.forbidden('You can only approve your own payments.');
  } else if (actor.role !== 'CENTER_ADMIN' && actor.role !== 'SUPER_ADMIN') {
    throw ApiError.forbidden('You are not authorized to approve payments.');
  }
  if (payment.status !== 'PENDING') throw ApiError.badRequest('Only pending payments can be approved.', 'NOT_PENDING');

  const actorName = actor.role === 'TEACHER' ? payment.teacher.user.fullName : 'Admin';
  return applyStatusChange(id, 'PAID', actor.userId, actorName, {
    approvedById: actor.userId,
    paidAt: new Date(),
  });
}

export async function rejectPayment(actor: { userId: string; role: Role }, id: string, reason?: string) {
  const payment = await paymentRepository.findById(id);
  if (!payment) throw ApiError.notFound('Payment not found.');
  if (actor.role === 'TEACHER') {
    const teacher = await teacherRepository.findByUserId(actor.userId);
    if (!teacher || teacher.id !== payment.teacherId) throw ApiError.forbidden('You can only reject your own payments.');
  } else if (actor.role !== 'CENTER_ADMIN' && actor.role !== 'SUPER_ADMIN') {
    throw ApiError.forbidden('You are not authorized to reject payments.');
  }
  if (payment.status !== 'PENDING') throw ApiError.badRequest('Only pending payments can be rejected.', 'NOT_PENDING');

  const actorName = actor.role === 'TEACHER' ? payment.teacher.user.fullName : 'Admin';
  return applyStatusChange(id, 'REJECTED', actor.userId, actorName, {
    rejectionReason: reason ?? null,
  }, reason);
}

export async function refundPayment(actor: { userId: string; role: Role }, id: string, reason?: string, amount?: number) {
  if (actor.role !== 'CENTER_ADMIN' && actor.role !== 'SUPER_ADMIN') throw ApiError.forbidden('Only admins can refund payments.');
  const payment = await paymentRepository.findById(id);
  if (!payment) throw ApiError.notFound('Payment not found.');
  if (payment.status !== 'PAID') throw ApiError.badRequest('Only paid payments can be refunded.', 'NOT_PAID');

  return applyStatusChange(
    id,
    'REFUNDED',
    actor.userId,
    'Admin',
    {
      refundedById: actor.userId,
      refundedAt: new Date(),
      refundAmount: amount ?? payment.amount,
      refundReason: reason ?? null,
    },
    reason,
  );
}

export async function correctPayment(actor: { userId: string; role: Role }, id: string, status: PaymentStatus, note?: string) {
  if (actor.role !== 'CENTER_ADMIN' && actor.role !== 'SUPER_ADMIN') throw ApiError.forbidden('Only admins can manually correct payments.');
  return applyStatusChange(id, status, actor.userId, 'Admin', {}, note);
}

// ---------------------------------------------------------------------------
// Summary & export
// ---------------------------------------------------------------------------

export async function paymentSummary(filters: PaymentFilters) {
  const where = buildPaymentWhere(filters);
  const [total, paid, pending, rejected, refunded, byMethod, all] = await Promise.all([
    paymentRepository.count(where),
    paymentRepository.aggregate({ where: { ...where, status: 'PAID' }, _sum: { amount: true }, _count: true }),
    paymentRepository.count({ ...where, status: 'PENDING' }),
    paymentRepository.count({ ...where, status: 'REJECTED' }),
    paymentRepository.count({ ...where, status: 'REFUNDED' }),
    paymentRepository.groupBy({ by: ['method'], where: { ...where, status: 'PAID' }, _sum: { amount: true }, _count: true }),
    paymentRepository.findMany({ where, select: { type: true, amount: true, status: true, currency: true } }),
  ]);

  const methodStats = byMethod.map((m) => ({
    method: m.method,
    methodLabel: paymentMethodLabel(m.method),
    count: m._count,
    revenue: m._sum?.amount ?? 0,
  }));

  const sessionRevenue = all.filter((p) => p.type === 'SESSION' && p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const monthlyRevenue = all.filter((p) => p.type === 'MONTHLY' && p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  // Currency comes from the first payment in the filtered result set (tenant
  // middleware ensures only the caller's center payments are included).
  const currency = all[0]?.currency ?? 'EGP';

  return {
    totalPayments: total,
    paidCount: paid._count,
    pendingCount: pending,
    rejectedCount: rejected,
    refundedCount: refunded,
    totalRevenue: paid._sum?.amount ?? 0,
    sessionRevenue,
    monthlyRevenue,
    currency,
    methodStats,
  };
}

export async function exportPaymentsCsv(filters: PaymentFilters): Promise<string> {
  const { data } = await listPayments({ userId: '', role: 'CENTER_ADMIN' }, { ...filters, limit: 100000, page: 1 });
  const header = [
    'Payment ID',
    'Payer',
    'Student',
    'Parent',
    'Teacher',
    'Amount',
    'Currency',
    'Type',
    'Method',
    'Status',
    'Transaction Reference',
    'Created Date',
    'Created Time',
    'Paid Date',
  ];
  const rows = data.map((p) => [
    p.paymentNumber,
    p.payerName,
    p.student?.fullName ?? '',
    p.parent?.fullName ?? '',
    p.teacher?.fullName ?? '',
    String(p.amount),
    p.currency,
    p.type,
    p.methodLabel,
    p.status,
    p.transactionReference ?? '',
    new Date(p.createdAt).toISOString().slice(0, 10),
    new Date(p.createdAt).toLocaleTimeString(),
    p.paidAt ? new Date(p.paidAt).toISOString().slice(0, 10) : '',
  ]);
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  return csv;
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export interface CreateSubscriptionInput {
  teacherId: string;
  studentId: string;
  method: PaymentMethod;
  months?: number;
  startDate?: Date;
}

export async function createSubscription(actor: { userId: string; role: Role }, input: CreateSubscriptionInput) {
  if (actor.role !== 'STUDENT' && actor.role !== 'PARENT') {
    throw ApiError.forbidden('Only students and parents can create subscriptions.');
  }
  const teacher = await teacherRepository.findUnique({ id: input.teacherId }, { paymentSettings: true }) as any;
  if (!teacher || !teacher.paymentSettings?.monthlyEnabled) {
    throw ApiError.badRequest('This teacher does not offer monthly subscriptions.', 'MONTHLY_DISABLED');
  }
  const student = await studentRepository.findById(input.studentId);
  if (!student) throw ApiError.notFound('Student not found.');

  let parentId: string | null = null;
  if (actor.role === 'STUDENT') {
    const me = await studentRepository.findByUserId(actor.userId);
    if (!me || me.id !== input.studentId) throw ApiError.forbidden('You can only subscribe for yourself.');
  } else {
    const parent = await parentRepository.findByUserId(actor.userId);
    if (!parent) throw ApiError.notFound('Parent profile not found.');
    const owns = await studentRepository.findParentStudent(parent.id, input.studentId);
    if (!owns) throw ApiError.forbidden("You can only subscribe for your own children.");
    parentId = parent.id;
  }

  const months = input.months && input.months > 0 ? input.months : 1;
  const start = input.startDate ?? new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);

  const subscription = await billingSubscriptionRepository.create({
    studentId: student.id,
    parentId,
    teacherId: teacher.id,
    monthlyPrice: teacher.paymentSettings!.monthlyPrice,
    startDate: start,
    endDate: end,
    paymentMethod: input.method,
    status: 'PENDING',
  } as any);

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'created_subscription',
    entity: 'BillingSubscription',
    entityId: subscription.id,
  });

  return subscription;
}

export async function listSubscriptions(actor: { userId: string; role: Role }, studentId?: string) {
  const where: Prisma.BillingSubscriptionWhereInput = {};
  if (actor.role === 'TEACHER') {
    const teacher = await teacherRepository.findByUserId(actor.userId);
    if (!teacher) throw ApiError.notFound('Teacher profile not found.');
    where.teacherId = teacher.id;
  } else if (actor.role === 'STUDENT') {
    const me = await studentRepository.findByUserId(actor.userId);
    where.studentId = me?.id;
  } else if (actor.role === 'PARENT') {
    const parent = await parentRepository.findByUserId(actor.userId);
    const children = parent ? await parentRepository.findParentStudents(parent.id) : [];
    where.studentId = { in: children.map((c) => c.studentId) };
  } else if (studentId) {
    where.studentId = studentId;
  }

  const subs = await billingSubscriptionRepository.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      student: { include: { user: { select: { fullName: true, photo: true } } } },
      teacher: { include: { user: { select: { fullName: true } } } },
      parent: { include: { user: { select: { fullName: true } } } },
      payments: { select: { id: true, status: true, amount: true } },
    },
  }) as any;

  return subs.map((s: any) => ({
    id: s.id,
    student: { id: s.student.id, fullName: s.student.user.fullName, photo: fileUrl(s.student.user.photo) },
    teacher: { id: s.teacher.id, fullName: s.teacher.user.fullName },
    parent: s.parent ? { id: s.parent.id, fullName: s.parent.user.fullName } : null,
    monthlyPrice: s.monthlyPrice,
    paymentMethod: s.paymentMethod,
    startDate: s.startDate,
    endDate: s.endDate,
    status: s.status,
    createdAt: s.createdAt,
    payments: s.payments,
  }));
}

export async function getSubscription(actor: { userId: string; role: Role }, id: string) {
  const sub = await billingSubscriptionRepository.findById(id);
  if (!sub) throw ApiError.notFound('Subscription not found.');
  if (actor.role === 'TEACHER') {
    const teacher = await teacherRepository.findByUserId(actor.userId);
    if (!teacher || teacher.id !== sub.teacherId) throw ApiError.forbidden('You can only view your own subscriptions.');
  } else if (actor.role === 'STUDENT') {
    const me = await studentRepository.findByUserId(actor.userId);
    if (!me || me.id !== sub.studentId) throw ApiError.forbidden('You can only view your own subscriptions.');
  } else if (actor.role === 'PARENT') {
    const parent = await parentRepository.findByUserId(actor.userId);
    if (!parent || parent.id !== sub.parentId) throw ApiError.forbidden('You can only view your own subscriptions.');
  }
  return sub;
}

export async function cancelSubscription(actor: { userId: string; role: Role }, id: string) {
  const sub = await billingSubscriptionRepository.findById(id);
  if (!sub) throw ApiError.notFound('Subscription not found.');
  if (actor.role === 'TEACHER') {
    const teacher = await teacherRepository.findByUserId(actor.userId);
    if (!teacher || teacher.id !== sub.teacherId) throw ApiError.forbidden('You can only cancel your own subscriptions.');
  } else if (actor.role === 'STUDENT') {
    const me = await studentRepository.findByUserId(actor.userId);
    if (!me || me.id !== sub.studentId) throw ApiError.forbidden('You can only cancel your own subscriptions.');
  } else if (actor.role === 'PARENT') {
    const parent = await parentRepository.findByUserId(actor.userId);
    if (!parent || parent.id !== sub.parentId) throw ApiError.forbidden('You can only cancel your own subscriptions.');
  } else if (actor.role !== 'CENTER_ADMIN' && actor.role !== 'SUPER_ADMIN') {
    throw ApiError.forbidden('Not authorized.');
  }
  if (sub.status === 'CANCELLED') return sub;
  return billingSubscriptionRepository.update(sub.id, { status: 'CANCELLED' });
}

import { ApiError } from '../utils/ApiError';
import { settlementRepository } from '../repositories/settlement.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { calculateSessionSettlement, generateSettlementNumber } from './financial-calculation.service';
import { getCenterCommissionRate } from './commission.service';
import { recordActivity } from './activity.service';
import type { Role } from '@prisma/client';

// ---------------------------------------------------------------------------
// Settlement service — calculates and manages teacher settlements per period
// All database operations go through repositories. No direct Prisma usage.
// ---------------------------------------------------------------------------

export interface Actor {
  userId: string;
  role: Role;
}

async function nextSettlementNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const max = await settlementRepository.findMaxSettlementNumber();
  if (!max) return generateSettlementNumber(1, year);

  const parts = max.settlementNumber.split('-');
  const lastYear = parseInt(parts[1], 10);
  const lastSeq = parseInt(parts[2], 10);

  if (lastYear === year) {
    return generateSettlementNumber(lastSeq + 1, year);
  }
  return generateSettlementNumber(1, year);
}

// ---- Calculation ----

/**
 * Calculate settlement for a teacher in a given period (e.g. "2026-01").
 * Sums all PAID payments for the teacher in the center during the period,
 * then applies the center's commission rate.
 */
export async function calculateSettlement(
  actor: Actor,
  input: { centerId: string; teacherId: string; period: string },
) {
  const { centerId, teacherId, period } = input;

  // Period format: YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(period)) {
    throw ApiError.badRequest('Period must be in YYYY-MM format.');
  }

  // Check for existing calculated/approved settlement for this period
  const existing = await settlementRepository.findByPeriod(centerId, teacherId, period);
  if (existing && existing.status !== 'CANCELLED' && existing.status !== 'PENDING') {
    throw ApiError.badRequest(`Settlement already exists for this period (status: ${existing.status}).`);
  }

  // Sum all PAID payments for this teacher in this center during the period
  const [year, month] = period.split('-').map(Number);
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const payments = await paymentRepository.findMany({
    where: {
      teacherId,
      centerId,
      status: 'PAID',
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    select: { amount: true, currency: true },
  });

  if (payments.length === 0) {
    throw ApiError.badRequest('No paid payments found for this teacher in the given period.');
  }

  const grossAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const currency = payments[0]?.currency ?? 'EGP';
  const commissionRate = await getCenterCommissionRate(centerId);

  const split = calculateSessionSettlement({
    grossAmount,
    commissionRate,
    teacherId,
    centerId,
    period,
    currency,
  });

  const settlementNumber = await nextSettlementNumber();

  const numericData = {
    settlementNumber,
    period,
    grossAmount: split.grossAmount,
    platformCommission: split.platformCommission,
    teacherShare: split.teacherShare,
    centerShare: split.centerShare,
    netAmount: split.netAmount,
    status: 'CALCULATED' as const,
    notes: `Auto-calculated from ${payments.length} payments. Commission rate: ${(commissionRate * 100).toFixed(1)}%`,
  };

  let settlement;
  if (existing) {
    settlement = await settlementRepository.update(existing.id, numericData);
  } else {
    settlement = await settlementRepository.create({
      ...numericData,
      center: { connect: { id: centerId } },
      teacher: { connect: { id: teacherId } },
    });
  }

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'calculated_settlement',
    entity: 'Settlement',
    entityId: settlement.id,
    details: `Period ${period}: gross ${grossAmount} EGP, commission ${split.platformCommission} EGP`,
  });

  return settlement;
}

// ---- Queries ----

export async function getSettlement(actor: Actor, id: string) {
  const settlement = await settlementRepository.findById(id);
  if (!settlement) throw ApiError.notFound('Settlement not found.');

  if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'CENTER_ADMIN') {
    throw ApiError.forbidden('Access denied.');
  }

  return settlement;
}

export async function listSettlements(
  actor: Actor,
  query: {
    centerId?: string;
    teacherId?: string;
    status?: string;
    period?: string;
    page?: number;
    limit?: number;
  },
) {
  const { page = 1, limit = 20, status, teacherId, period } = query;

  const where: any = {};

  if (actor.role !== 'SUPER_ADMIN') {
    // In center scope the Prisma tenant middleware auto-injects centerId.
    // For SUPER_ADMIN in platform scope, the caller must pass centerId.
    // No manual centerId injection needed here since the middleware handles it.
  } else if (query.centerId) {
    where.centerId = query.centerId;
  }

  if (teacherId) where.teacherId = teacherId;
  if (status) where.status = status;
  if (period) where.period = period;

  const [total, settlements] = await Promise.all([
    settlementRepository.count(where),
    settlementRepository.findMany({
      where,
      include: {
        teacher: { include: { user: { select: { fullName: true } } } },
        center: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    settlements,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getSettlementSummary(actor: Actor, centerId?: string) {
  const where: any = {};
  if (actor.role !== 'SUPER_ADMIN') {
    // Center scope: tenant middleware handles scoping
  } else if (centerId) {
    where.centerId = centerId;
  }

  const [pending, calculated, approved, paid, cancelled, total] = await Promise.all([
    settlementRepository.count({ ...where, status: 'PENDING' }),
    settlementRepository.count({ ...where, status: 'CALCULATED' }),
    settlementRepository.count({ ...where, status: 'APPROVED' }),
    settlementRepository.count({ ...where, status: 'PAID' }),
    settlementRepository.count({ ...where, status: 'CANCELLED' }),
    settlementRepository.count(where),
  ]);

  const totals = await settlementRepository.aggregate(where);

  return {
    counts: { pending, calculated, approved, paid, cancelled, total },
    totals: {
      grossAmount: totals._sum.grossAmount ?? 0,
      platformCommission: totals._sum.platformCommission ?? 0,
      teacherShare: totals._sum.teacherShare ?? 0,
      centerShare: totals._sum.centerShare ?? 0,
      netAmount: totals._sum.netAmount ?? 0,
    },
  };
}

// ---- Status transitions ----

export async function approveSettlement(actor: Actor, id: string) {
  if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'CENTER_ADMIN') {
    throw ApiError.forbidden('Only admins can approve settlements.');
  }

  const settlement = await settlementRepository.findById(id);
  if (!settlement) throw ApiError.notFound('Settlement not found.');
  if (settlement.status !== 'CALCULATED') {
    throw ApiError.badRequest('Only calculated settlements can be approved.');
  }

  const updated = await settlementRepository.update(id, { status: 'APPROVED' });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'approved_settlement',
    entity: 'Settlement',
    entityId: id,
    details: `Settlement ${settlement.settlementNumber} for period ${settlement.period} approved`,
  });

  return updated;
}

export async function markSettlementPaid(actor: Actor, id: string) {
  if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'CENTER_ADMIN') {
    throw ApiError.forbidden('Only admins can mark settlements as paid.');
  }

  const settlement = await settlementRepository.findById(id);
  if (!settlement) throw ApiError.notFound('Settlement not found.');
  if (settlement.status !== 'APPROVED') {
    throw ApiError.badRequest('Only approved settlements can be marked as paid.');
  }

  const updated = await settlementRepository.update(id, {
    status: 'PAID',
    settledAt: new Date(),
  });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'paid_settlement',
    entity: 'Settlement',
    entityId: id,
    details: `Settlement ${settlement.settlementNumber} for period ${settlement.period} marked as paid`,
  });

  return updated;
}

export async function cancelSettlement(actor: Actor, id: string) {
  if (actor.role !== 'SUPER_ADMIN') {
    throw ApiError.forbidden('Only super admins can cancel settlements.');
  }

  const settlement = await settlementRepository.findById(id);
  if (!settlement) throw ApiError.notFound('Settlement not found.');
  if (settlement.status === 'PAID') {
    throw ApiError.badRequest('Cannot cancel a paid settlement.');
  }

  const updated = await settlementRepository.update(id, { status: 'CANCELLED' });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'cancelled_settlement',
    entity: 'Settlement',
    entityId: id,
    details: `Settlement ${settlement.settlementNumber} for period ${settlement.period} cancelled`,
  });

  return updated;
}

/**
 * Calculate settlements for all teachers in a center for a given period.
 * Bulk operation for admin convenience.
 */
export async function calculateBulkSettlements(
  actor: Actor,
  input: { centerId: string; period: string },
) {
  const { centerId, period } = input;

  // Get all teachers who have paid payments in this center/period
  const [year, month] = period.split('-').map(Number);
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const teacherPayments = await paymentRepository.groupBy({
    by: ['teacherId'],
    where: {
      centerId,
      status: 'PAID',
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    _sum: { amount: true },
    _count: true,
  });

  if (teacherPayments.length === 0) {
    throw ApiError.badRequest('No paid payments found for this center in the given period.');
  }

  const results = [];
  for (const tp of teacherPayments) {
    try {
      const settlement = await calculateSettlement(actor, {
        centerId,
        teacherId: tp.teacherId,
        period,
      });
      results.push(settlement);
    } catch {
      // Skip teachers with no payments or existing settlements
    }
  }

  return results;
}

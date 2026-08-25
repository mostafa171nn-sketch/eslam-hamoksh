import { ApiError } from '../utils/ApiError';
import { centerRepository } from '../repositories/center.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { calculatePaymentSplit, type PaymentSplit } from './financial-calculation.service';

// Re-export for backward compatibility
export type { PaymentSplit } from './financial-calculation.service';

// Re-export the calculation function under its legacy name
export const calculateCommission = calculatePaymentSplit;

/**
 * Resolve the commission rate for a given center by looking up its active plan.
 * Falls back to 0 (no commission) if the center has no plan.
 */
export async function getCenterCommissionRate(centerId: string): Promise<number> {
  const center = await centerRepository.findByIdWithPlan(centerId);
  if (!center?.plan) return 0;
  return center.plan.commissionRate;
}

// ---------------------------------------------------------------------------
// Commission summary (for admin dashboard)
// ---------------------------------------------------------------------------

export async function getCommissionSummary(centerId: string) {
  const center = await centerRepository.findByIdWithPlan(centerId);
  if (!center) throw ApiError.notFound('Center not found.');
  const rate = center.plan?.commissionRate ?? 0;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const payments = await paymentRepository.findMany({
    where: {
      centerId,
      status: 'PAID',
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    },
    select: { amount: true, currency: true, teacherId: true },
  });

  const grossAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const breakdown = calculateCommission(grossAmount, rate, center.plan?.currency ?? 'EGP');

  // Per-teacher breakdown
  const teacherTotals = new Map<string, { gross: number; count: number }>();
  for (const p of payments) {
    const existing = teacherTotals.get(p.teacherId) ?? { gross: 0, count: 0 };
    existing.gross += p.amount;
    existing.count++;
    teacherTotals.set(p.teacherId, existing);
  }

  const byTeacher = Array.from(teacherTotals.entries()).map(([teacherId, data]) => ({
    teacherId,
    ...calculateCommission(data.gross, rate),
    paymentCount: data.count,
  }));

  return {
    centerId,
    planName: center.plan?.name ?? 'No plan',
    period: { from: startOfMonth, to: endOfMonth },
    totalPayments: payments.length,
    ...breakdown,
    byTeacher,
  };
}

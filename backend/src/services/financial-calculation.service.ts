import { ApiError } from '../utils/ApiError';

// ---------------------------------------------------------------------------
// Centralized financial calculation service
// All monetary math uses integer arithmetic (smallest unit = EGP piaster).
// Never use floating-point for final monetary values.
// ---------------------------------------------------------------------------

export interface PaymentSplit {
  grossAmount: number;
  commissionRate: number;
  platformCommission: number;
  teacherShare: number;
  centerShare: number;
  netAmount: number;
  currency: string;
}

export interface SessionSettlementInput {
  grossAmount: number;
  commissionRate: number;
  teacherId: string;
  centerId: string;
  period: string;
  currency?: string;
}

/**
 * Calculate payment split: platform commission, teacher share, center share.
 *
 * Formula:
 *   platformCommission = round(grossAmount * commissionRate)
 *   teacherShare       = grossAmount - platformCommission
 *   centerShare        = 0 (teacher gets non-commission portion)
 *   netAmount          = teacherShare (amount that goes to teacher after platform cut)
 *
 * All values are integers (EGP piasters). Rounding uses Math.round.
 */
export function calculatePaymentSplit(
  grossAmount: number,
  commissionRate: number,
  currency: string = 'EGP',
): PaymentSplit {
  if (grossAmount < 0) throw ApiError.badRequest('Gross amount cannot be negative.');
  if (commissionRate < 0 || commissionRate > 1) {
    throw ApiError.badRequest('Commission rate must be between 0 and 1.');
  }

  const platformCommission = Math.round(grossAmount * commissionRate);
  const teacherShare = grossAmount - platformCommission;
  const centerShare = 0;

  return {
    grossAmount,
    commissionRate,
    platformCommission,
    teacherShare,
    centerShare,
    netAmount: teacherShare,
    currency,
  };
}

/**
 * Calculate session settlement for a specific teacher in a period.
 * Delegates to calculatePaymentSplit for the core math.
 */
export function calculateSessionSettlement(
  input: SessionSettlementInput,
): PaymentSplit & { teacherId: string; centerId: string; period: string } {
  const split = calculatePaymentSplit(input.grossAmount, input.commissionRate, input.currency ?? 'EGP');
  return {
    ...split,
    teacherId: input.teacherId,
    centerId: input.centerId,
    period: input.period,
  };
}

/**
 * Generate a sequential invoice number: INV-YYYY-NNNNNN
 */
export function generateInvoiceNumber(sequenceNumber: number, year?: number): string {
  const y = year ?? new Date().getFullYear();
  const seq = String(sequenceNumber).padStart(6, '0');
  return `INV-${y}-${seq}`;
}

/**
 * Generate a sequential settlement number: STL-YYYY-NNNNNN
 */
export function generateSettlementNumber(sequenceNumber: number, year?: number): string {
  const y = year ?? new Date().getFullYear();
  const seq = String(sequenceNumber).padStart(6, '0');
  return `STL-${y}-${seq}`;
}

/**
 * Validate that an amount is a positive integer.
 */
export function assertValidAmount(amount: number, label: string = 'Amount'): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw ApiError.badRequest(`${label} must be a positive integer.`);
  }
}

/**
 * Validate that a currency code is supported.
 */
export function assertValidCurrency(currency: string): void {
  const supported = ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'];
  if (!supported.includes(currency)) {
    throw ApiError.badRequest(`Unsupported currency: ${currency}. Supported: ${supported.join(', ')}`);
  }
}

/**
 * Generate a sequential payment number: PAY-YYYY-NNNNNN
 */
export function generatePaymentNumber(sequenceNumber: number, year?: number): string {
  const y = year ?? new Date().getFullYear();
  const seq = String(sequenceNumber).padStart(6, '0');
  return `PAY-${y}-${seq}`;
}

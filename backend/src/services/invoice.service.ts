import { ApiError } from '../utils/ApiError';
import { invoiceRepository } from '../repositories/invoice.repository';
import { userRepository } from '../repositories/user.repository';
import { generateInvoiceNumber } from './financial-calculation.service';
import { recordActivity } from './activity.service';
import type { Role } from '@prisma/client';

// ---------------------------------------------------------------------------
// Invoice service — no direct Prisma usage; all data access via repositories.
// ---------------------------------------------------------------------------

export interface Actor {
  userId: string;
  role: Role;
}

/**
 * Generate the next sequential invoice number: INV-YYYY-NNNNNN
 */
async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const max = await invoiceRepository.findMaxInvoiceNumber();
  if (!max) return generateInvoiceNumber(1, year);

  const parts = max.invoiceNumber.split('-');
  const lastYear = parseInt(parts[1], 10);
  const lastSeq = parseInt(parts[2], 10);

  if (lastYear === year) {
    return generateInvoiceNumber(lastSeq + 1, year);
  }
  return generateInvoiceNumber(1, year);
}

// ---- Queries ----

export async function getInvoice(actor: Actor, id: string) {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Invoice not found.');

  if (actor.role !== 'SUPER_ADMIN' && invoice.centerId) {
    const user = await userRepository.findById(actor.userId);
    if (user?.centerId !== invoice.centerId) {
      throw ApiError.forbidden('Access denied.');
    }
  }

  return invoice;
}

export async function listInvoices(
  actor: Actor,
  query: {
    centerId?: string;
    status?: string;
    page?: number;
    limit?: number;
    from?: Date;
    to?: Date;
  },
) {
  const { page = 1, limit = 20, status, from, to } = query;

  const where: any = {};

  if (actor.role !== 'SUPER_ADMIN') {
    // In center scope, tenant middleware handles scoping.
  } else if (query.centerId) {
    where.centerId = query.centerId;
  }

  if (status) where.status = status;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  const [total, invoices] = await Promise.all([
    invoiceRepository.count(where),
    invoiceRepository.findMany({
      where,
      include: {
        payment: {
          select: { id: true, paymentNumber: true, payerName: true, amount: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    invoices,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getInvoiceSummary(actor: Actor, centerId?: string) {
  const where: any = {};
  if (actor.role !== 'SUPER_ADMIN') {
    // In center scope, tenant middleware handles scoping.
  } else if (centerId) {
    where.centerId = centerId;
  }

  const [draft, sent, paid, cancelled, overdue, total] = await Promise.all([
    invoiceRepository.count({ ...where, status: 'DRAFT' }),
    invoiceRepository.count({ ...where, status: 'SENT' }),
    invoiceRepository.count({ ...where, status: 'PAID' }),
    invoiceRepository.count({ ...where, status: 'CANCELLED' }),
    invoiceRepository.count({ ...where, status: 'OVERDUE' }),
    invoiceRepository.count(where),
  ]);

  const totalRevenue = await invoiceRepository.aggregate({ ...where, status: 'PAID' });

  return {
    counts: { draft, sent, paid, cancelled, overdue, total },
    totalRevenue: totalRevenue._sum.amount ?? 0,
  };
}

// ---- Mutations ----

export interface CreateInvoiceInput {
  paymentId?: string;
  centerId?: string;
  payerId?: string;
  payerName?: string;
  amount: number;
  currency?: string;
  description?: string;
  dueAt?: Date;
}

export async function createInvoice(actor: Actor, input: CreateInvoiceInput) {
  if (input.amount <= 0 || !Number.isInteger(input.amount)) {
    throw ApiError.badRequest('Invoice amount must be a positive integer.');
  }

  const invoiceNumber = await nextInvoiceNumber();

  const invoice = await invoiceRepository.create({
    invoiceNumber,
    ...(input.paymentId ? { payment: { connect: { id: input.paymentId } } } : {}),
    ...(input.centerId ? { center: { connect: { id: input.centerId } } } : {}),
    payerId: input.payerId ?? undefined,
    payerName: input.payerName ?? undefined,
    amount: input.amount,
    currency: input.currency ?? 'EGP',
    description: input.description ?? undefined,
    status: 'DRAFT',
    issuedAt: new Date(),
    dueAt: input.dueAt ?? undefined,
  });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'created_invoice',
    entity: 'Invoice',
    entityId: invoice.id,
    details: `Invoice ${invoiceNumber} for ${input.amount} EGP`,
  });

  return invoice;
}

export async function sendInvoice(actor: Actor, id: string) {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Invoice not found.');
  if (invoice.status !== 'DRAFT') {
    throw ApiError.badRequest('Only draft invoices can be sent.');
  }

  const updated = await invoiceRepository.update(id, { status: 'SENT', issuedAt: new Date() });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'sent_invoice',
    entity: 'Invoice',
    entityId: id,
    details: `Invoice ${invoice.invoiceNumber} sent`,
  });

  return updated;
}

export async function markInvoicePaid(actor: Actor, id: string) {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Invoice not found.');
  if (invoice.status === 'PAID') throw ApiError.badRequest('Invoice already paid.');
  if (invoice.status === 'CANCELLED' || invoice.status === 'VOIDED') {
    throw ApiError.badRequest('Cannot mark cancelled/voided invoice as paid.');
  }

  const updated = await invoiceRepository.update(id, { status: 'PAID', paidAt: new Date() });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'paid_invoice',
    entity: 'Invoice',
    entityId: id,
    details: `Invoice ${invoice.invoiceNumber} marked as paid`,
  });

  return updated;
}

export async function cancelInvoice(actor: Actor, id: string) {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Invoice not found.');
  if (invoice.status === 'PAID') {
    throw ApiError.badRequest('Cannot cancel a paid invoice. Void it instead.');
  }

  const updated = await invoiceRepository.update(id, { status: 'CANCELLED' });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'cancelled_invoice',
    entity: 'Invoice',
    entityId: id,
    details: `Invoice ${invoice.invoiceNumber} cancelled`,
  });

  return updated;
}

export async function voidInvoice(actor: Actor, id: string) {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Invoice not found.');
  if (invoice.status === 'VOIDED') throw ApiError.badRequest('Invoice already voided.');

  const updated = await invoiceRepository.update(id, { status: 'VOIDED' });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'voided_invoice',
    entity: 'Invoice',
    entityId: id,
    details: `Invoice ${invoice.invoiceNumber} voided`,
  });

  return updated;
}

/**
 * Auto-create an invoice when a payment is approved.
 * Called internally from payment.service.ts during payment approval.
 */
export async function createInvoiceForPayment(payment: {
  id: string;
  amount: number;
  currency: string;
  payerId?: string | null;
  payerName?: string;
  centerId?: string | null;
  studentId?: string | null;
  student?: { user?: { fullName?: string } | null } | null;
}): Promise<string> {
  const invoiceNumber = await nextInvoiceNumber();
  const payerName = payment.payerName ?? payment.student?.user?.fullName ?? null;

  const invoice = await invoiceRepository.create({
    invoiceNumber,
    payment: { connect: { id: payment.id } },
    center: payment.centerId ? { connect: { id: payment.centerId } } : undefined,
    payerId: payment.payerId ?? payment.studentId ?? null,
    payerName,
    amount: payment.amount,
    currency: payment.currency,
    description: `Auto-generated for payment ${payment.id}`,
    status: 'SENT',
    issuedAt: new Date(),
  });

  return invoice.id;
}

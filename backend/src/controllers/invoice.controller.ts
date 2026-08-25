import type { Request, Response } from 'express';
import * as invoiceService from '../services/invoice.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';

function extractActor(req: Request) {
  return { userId: req.user!.id, role: req.user!.role };
}

export const getInvoiceHandler = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await invoiceService.getInvoice(extractActor(req), req.params.id);
  return ok(res, invoice, 'Invoice loaded.');
});

export const listInvoicesHandler = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const status = req.query.status as string | undefined;
  const centerId = req.query.centerId as string | undefined;
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;
  const result = await invoiceService.listInvoices(extractActor(req), { centerId, status, page, limit, from, to });
  return ok(res, result.invoices, 'Invoices loaded.', {
    page: result.pagination.page,
    limit: result.pagination.limit,
    total: result.pagination.total,
    totalPages: result.pagination.totalPages,
  });
});

export const getInvoiceSummaryHandler = asyncHandler(async (req: Request, res: Response) => {
  const centerId = req.query.centerId as string | undefined;
  const result = await invoiceService.getInvoiceSummary(extractActor(req), centerId);
  return ok(res, result, 'Invoice summary loaded.');
});

export const createInvoiceHandler = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await invoiceService.createInvoice(extractActor(req), {
    paymentId: req.body.paymentId,
    centerId: req.body.centerId,
    payerId: req.body.payerId,
    payerName: req.body.payerName,
    amount: req.body.amount,
    currency: req.body.currency,
    description: req.body.description,
    dueAt: req.body.dueAt ? new Date(req.body.dueAt) : undefined,
  });
  return created(res, invoice, 'Invoice created.');
});

export const sendInvoiceHandler = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await invoiceService.sendInvoice(extractActor(req), req.params.id);
  return ok(res, invoice, 'Invoice sent.');
});

export const markInvoicePaidHandler = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await invoiceService.markInvoicePaid(extractActor(req), req.params.id);
  return ok(res, invoice, 'Invoice marked as paid.');
});

export const cancelInvoiceHandler = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await invoiceService.cancelInvoice(extractActor(req), req.params.id);
  return ok(res, invoice, 'Invoice cancelled.');
});

export const voidInvoiceHandler = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await invoiceService.voidInvoice(extractActor(req), req.params.id);
  return ok(res, invoice, 'Invoice voided.');
});

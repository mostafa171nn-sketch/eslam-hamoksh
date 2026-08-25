import type { Request, Response } from 'express';
import * as settlementService from '../services/settlement.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';

function extractActor(req: Request) {
  return { userId: req.user!.id, role: req.user!.role };
}

export const getSettlementHandler = asyncHandler(async (req: Request, res: Response) => {
  const settlement = await settlementService.getSettlement(extractActor(req), req.params.id);
  return ok(res, settlement, 'Settlement loaded.');
});

export const listSettlementsHandler = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const centerId = req.query.centerId as string | undefined;
  const teacherId = req.query.teacherId as string | undefined;
  const status = req.query.status as string | undefined;
  const period = req.query.period as string | undefined;
  const result = await settlementService.listSettlements(extractActor(req), { centerId, teacherId, status, period, page, limit });
  return ok(res, result.settlements, 'Settlements loaded.', {
    page: result.pagination.page,
    limit: result.pagination.limit,
    total: result.pagination.total,
    totalPages: result.pagination.totalPages,
  });
});

export const getSettlementSummaryHandler = asyncHandler(async (req: Request, res: Response) => {
  const centerId = req.query.centerId as string | undefined;
  const result = await settlementService.getSettlementSummary(extractActor(req), centerId);
  return ok(res, result, 'Settlement summary loaded.');
});

export const calculateSettlementHandler = asyncHandler(async (req: Request, res: Response) => {
  const settlement = await settlementService.calculateSettlement(extractActor(req), {
    centerId: req.body.centerId,
    teacherId: req.body.teacherId,
    period: req.body.period,
  });
  return created(res, settlement, 'Settlement calculated.');
});

export const calculateBulkSettlementsHandler = asyncHandler(async (req: Request, res: Response) => {
  const settlements = await settlementService.calculateBulkSettlements(extractActor(req), {
    centerId: req.body.centerId,
    period: req.body.period,
  });
  return created(res, { settlements, count: settlements.length }, 'Bulk settlements calculated.');
});

export const approveSettlementHandler = asyncHandler(async (req: Request, res: Response) => {
  const settlement = await settlementService.approveSettlement(extractActor(req), req.params.id);
  return ok(res, settlement, 'Settlement approved.');
});

export const markSettlementPaidHandler = asyncHandler(async (req: Request, res: Response) => {
  const settlement = await settlementService.markSettlementPaid(extractActor(req), req.params.id);
  return ok(res, settlement, 'Settlement marked as paid.');
});

export const cancelSettlementHandler = asyncHandler(async (req: Request, res: Response) => {
  const settlement = await settlementService.cancelSettlement(extractActor(req), req.params.id);
  return ok(res, settlement, 'Settlement cancelled.');
});

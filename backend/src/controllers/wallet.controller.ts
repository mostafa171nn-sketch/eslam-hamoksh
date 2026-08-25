import type { Request, Response } from 'express';
import * as walletService from '../services/wallet.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';

function extractActor(req: Request) {
  return { userId: req.user!.id, role: req.user!.role };
}

export const getMyWalletHandler = asyncHandler(async (req: Request, res: Response) => {
  const wallet = await walletService.getMyWallet(extractActor(req));
  return ok(res, wallet, 'Wallet loaded.');
});

export const getWalletHandler = asyncHandler(async (req: Request, res: Response) => {
  const wallet = await walletService.getWalletById(extractActor(req), req.params.id);
  return ok(res, wallet, 'Wallet loaded.');
});

export const getWalletTransactionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await walletService.getWalletTransactions(extractActor(req), req.params.id, page, limit);
  return ok(res, result.transactions, 'Wallet transactions loaded.', {
    page: result.pagination.page,
    limit: result.pagination.limit,
    total: result.pagination.total,
    totalPages: result.pagination.totalPages,
  });
});

export const listWalletsHandler = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const centerId = req.query.centerId as string | undefined;
  const result = await walletService.listWallets(extractActor(req), { centerId, page, limit });
  return ok(res, result.wallets, 'Wallets loaded.', {
    page: result.pagination.page,
    limit: result.pagination.limit,
    total: result.pagination.total,
    totalPages: result.pagination.totalPages,
  });
});

export const depositHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await walletService.depositToWallet(extractActor(req), {
    userId: req.body.userId,
    amount: req.body.amount,
    description: req.body.description,
    referenceType: req.body.referenceType,
    referenceId: req.body.referenceId,
  });
  return created(res, result, 'Deposit successful.');
});

export const withdrawHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await walletService.withdrawFromWallet(extractActor(req), {
    walletId: req.params.id,
    amount: req.body.amount,
    description: req.body.description,
    referenceType: req.body.referenceType,
    referenceId: req.body.referenceId,
  });
  return ok(res, result, 'Withdrawal successful.');
});

export const adjustHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await walletService.adjustWallet(extractActor(req), {
    walletId: req.params.id,
    amount: req.body.amount,
    description: req.body.description,
    referenceType: req.body.referenceType,
    referenceId: req.body.referenceId,
  });
  return ok(res, result, 'Adjustment successful.');
});

export const refundHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await walletService.refundToWallet(extractActor(req), {
    walletId: req.params.id,
    amount: req.body.amount,
    description: req.body.description,
    referenceType: req.body.referenceType,
    referenceId: req.body.referenceId,
  });
  return ok(res, result, 'Refund successful.');
});

export const freezeHandler = asyncHandler(async (req: Request, res: Response) => {
  const wallet = await walletService.freezeWallet(extractActor(req), req.params.id);
  return ok(res, wallet, 'Wallet frozen.');
});

export const unfreezeHandler = asyncHandler(async (req: Request, res: Response) => {
  const wallet = await walletService.unfreezeWallet(extractActor(req), req.params.id);
  return ok(res, wallet, 'Wallet unfrozen.');
});

export const closeHandler = asyncHandler(async (req: Request, res: Response) => {
  const wallet = await walletService.closeWallet(extractActor(req), req.params.id);
  return ok(res, wallet, 'Wallet closed.');
});

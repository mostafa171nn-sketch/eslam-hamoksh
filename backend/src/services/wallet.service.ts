import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { walletRepository } from '../repositories/wallet.repository';
import { walletTransactionRepository } from '../repositories/wallet-transaction.repository';
import { userRepository } from '../repositories/user.repository';
import { recordActivity } from './activity.service';
import type { Role } from '@prisma/client';

// ---------------------------------------------------------------------------
// Wallet service — all balance mutations are wrapped in Prisma interactive
// transactions with SELECT … FOR UPDATE to prevent concurrent balance corruption.
// ---------------------------------------------------------------------------

export interface Actor {
  userId: string;
  role: Role;
}

// ---- Queries ----

export async function getMyWallet(actor: Actor) {
  if (actor.role === 'SUPER_ADMIN') {
    throw ApiError.badRequest('Super admins do not have wallets.');
  }
  const wallet = await walletRepository.findByUserId(actor.userId);
  if (!wallet) {
    throw ApiError.notFound('No wallet found. A wallet is created automatically when needed.');
  }
  return wallet;
}

export async function getWalletById(actor: Actor, walletId: string) {
  const wallet = await walletRepository.findById(walletId);
  if (!wallet) throw ApiError.notFound('Wallet not found.');

  if (actor.role === 'CENTER_ADMIN') {
    const user = await userRepository.findById(actor.userId);
    if (user?.centerId && wallet.centerId && user.centerId !== wallet.centerId) {
      throw ApiError.forbidden('Access denied.');
    }
    return wallet;
  }
  if (actor.role === 'SUPER_ADMIN') {
    return wallet;
  }
  throw ApiError.forbidden('You do not have permission to view this wallet.');
}

export async function getWalletTransactions(actor: Actor, walletId: string, page = 1, limit = 20) {
  const wallet = await walletRepository.findById(walletId);
  if (!wallet) throw ApiError.notFound('Wallet not found.');

  if (actor.role === 'STUDENT' || actor.role === 'PARENT') {
    if (wallet.userId !== actor.userId) {
      throw ApiError.forbidden('Access denied.');
    }
  }

  const [total, transactions] = await Promise.all([
    walletTransactionRepository.countByWalletId(walletId),
    walletTransactionRepository.findByWalletId(walletId, page, limit),
  ]);

  return {
    transactions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function listWallets(actor: Actor, query: { centerId?: string; page?: number; limit?: number }) {
  const { page = 1, limit = 20 } = query;

  const where: any = {};
  if (actor.role !== 'SUPER_ADMIN') {
    // In center scope, the tenant middleware auto-injects centerId.
  } else if (query.centerId) {
    where.centerId = query.centerId;
  }

  const [total, wallets] = await Promise.all([
    walletRepository.count(where),
    walletRepository.findMany({
      where,
      include: { user: { select: { id: true, fullName: true, username: true, role: true } } },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    wallets,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ---- Mutations (all inside transactions with row-level locking) ----

export interface DepositInput {
  userId: string;
  amount: number;
  description?: string;
  referenceType?: string;
  referenceId?: string;
}

/**
 * Deposit funds into a user's wallet. Creates the wallet if it doesn't exist.
 * Uses atomic increment inside a transaction — safe under concurrency.
 */
export async function depositToWallet(actor: Actor, input: DepositInput) {
  if (input.amount <= 0 || !Number.isInteger(input.amount)) {
    throw ApiError.badRequest('Deposit amount must be a positive integer.');
  }

  const targetUser = await userRepository.findById(input.userId);
  if (!targetUser) throw ApiError.notFound('Target user not found.');

  const result = await prisma.$transaction(async (tx) => {
    // Upsert wallet inside the transaction
    const wallet = await tx.wallet.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        centerId: targetUser.centerId ?? null,
        balance: 0,
      },
      update: {},
    });

    if (wallet.status !== 'ACTIVE') {
      throw ApiError.badRequest('Wallet is not active.');
    }

    // Atomic increment — safe under concurrency
    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: input.amount } },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'DEPOSIT',
        amount: input.amount,
        balanceBefore: wallet.balance,
        balanceAfter: updated.balance,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        description: input.description ?? `Deposit of ${input.amount} EGP`,
        createdBy: actor.userId,
      },
    });

    return { wallet: { id: wallet.id, balance: updated.balance }, transaction };
  });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'deposited_to_wallet',
    entity: 'Wallet',
    entityId: result.wallet.id,
    details: `Deposit of ${input.amount} EGP to user ${input.userId}`,
  });

  return result;
}

export interface WithdrawInput {
  walletId: string;
  amount: number;
  description?: string;
  referenceType?: string;
  referenceId?: string;
}

/**
 * Withdraw funds from a wallet. Uses SELECT … FOR UPDATE to lock the wallet row
 * and prevent concurrent withdrawals from corrupting the balance.
 */
export async function withdrawFromWallet(actor: Actor, input: WithdrawInput) {
  if (input.amount <= 0 || !Number.isInteger(input.amount)) {
    throw ApiError.badRequest('Withdrawal amount must be a positive integer.');
  }

  const result = await prisma.$transaction(async (tx) => {
    // Lock the wallet row to prevent concurrent reads
    const rows = await tx.$queryRaw<{ id: string; balance: number; status: string }[]>`
      SELECT id, balance, status FROM "Wallet" WHERE id = ${input.walletId} FOR UPDATE
    `;
    const wallet = rows[0];
    if (!wallet) throw ApiError.notFound('Wallet not found.');
    if (wallet.status !== 'ACTIVE') throw ApiError.badRequest('Wallet is not active.');
    if (wallet.balance < input.amount) {
      throw ApiError.badRequest('Insufficient wallet balance.', 'INSUFFICIENT_BALANCE');
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - input.amount;

    await tx.wallet.update({
      where: { id: input.walletId },
      data: { balance: balanceAfter },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: input.walletId,
        type: 'WITHDRAWAL',
        amount: -input.amount,
        balanceBefore,
        balanceAfter,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        description: input.description ?? `Withdrawal of ${input.amount} EGP`,
        createdBy: actor.userId,
      },
    });

    return { wallet: { id: input.walletId, balance: balanceAfter }, transaction };
  });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'withdrew_from_wallet',
    entity: 'Wallet',
    entityId: input.walletId,
    details: `Withdrawal of ${input.amount} EGP`,
  });

  return result;
}

export interface AdjustInput {
  walletId: string;
  amount: number;
  description: string;
  referenceType?: string;
  referenceId?: string;
}

/**
 * Admin adjustment to a wallet balance (can be positive or negative).
 * Uses SELECT … FOR UPDATE to prevent concurrent corruption.
 */
export async function adjustWallet(actor: Actor, input: AdjustInput) {
  if (!Number.isInteger(input.amount) || input.amount === 0) {
    throw ApiError.badRequest('Adjustment amount must be a non-zero integer.');
  }
  if (!input.description || input.description.trim().length < 3) {
    throw ApiError.badRequest('Adjustment description is required (min 3 characters).');
  }

  const result = await prisma.$transaction(async (tx) => {
    // Lock the wallet row
    const rows = await tx.$queryRaw<{ id: string; balance: number; status: string }[]>`
      SELECT id, balance, status FROM "Wallet" WHERE id = ${input.walletId} FOR UPDATE
    `;
    const wallet = rows[0];
    if (!wallet) throw ApiError.notFound('Wallet not found.');
    if (wallet.status !== 'ACTIVE') throw ApiError.badRequest('Wallet is not active.');

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + input.amount;
    if (balanceAfter < 0) {
      throw ApiError.badRequest('Adjustment would result in negative balance.', 'INSUFFICIENT_BALANCE');
    }

    await tx.wallet.update({
      where: { id: input.walletId },
      data: { balance: balanceAfter },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: input.walletId,
        type: 'ADJUSTMENT',
        amount: input.amount,
        balanceBefore,
        balanceAfter,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        description: input.description,
        createdBy: actor.userId,
      },
    });

    return { wallet: { id: input.walletId, balance: balanceAfter }, transaction };
  });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'adjusted_wallet',
    entity: 'Wallet',
    entityId: input.walletId,
    details: `${input.amount > 0 ? '+' : ''}${input.amount} EGP — ${input.description}`,
  });

  return result;
}

export interface RefundInput {
  walletId: string;
  amount: number;
  description?: string;
  referenceType?: string;
  referenceId?: string;
}

/**
 * Refund funds to a wallet. Uses atomic increment inside a transaction.
 */
export async function refundToWallet(actor: Actor, input: RefundInput) {
  if (input.amount <= 0 || !Number.isInteger(input.amount)) {
    throw ApiError.badRequest('Refund amount must be a positive integer.');
  }

  const result = await prisma.$transaction(async (tx) => {
    // Lock the wallet row
    const rows = await tx.$queryRaw<{ id: string; balance: number; status: string }[]>`
      SELECT id, balance, status FROM "Wallet" WHERE id = ${input.walletId} FOR UPDATE
    `;
    const wallet = rows[0];
    if (!wallet) throw ApiError.notFound('Wallet not found.');
    if (wallet.status !== 'ACTIVE') throw ApiError.badRequest('Wallet is not active.');

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + input.amount;

    await tx.wallet.update({
      where: { id: input.walletId },
      data: { balance: balanceAfter },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: input.walletId,
        type: 'REFUND',
        amount: input.amount,
        balanceBefore,
        balanceAfter,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        description: input.description ?? `Refund of ${input.amount} EGP`,
        createdBy: actor.userId,
      },
    });

    return { wallet: { id: input.walletId, balance: balanceAfter }, transaction };
  });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'refunded_wallet',
    entity: 'Wallet',
    entityId: input.walletId,
    details: `Refund of ${input.amount} EGP`,
  });

  return result;
}

// ---- Admin wallet management ----

export async function freezeWallet(actor: Actor, walletId: string) {
  if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'CENTER_ADMIN') {
    throw ApiError.forbidden('Only admins can freeze wallets.');
  }
  const wallet = await walletRepository.findById(walletId);
  if (!wallet) throw ApiError.notFound('Wallet not found.');

  const updated = await walletRepository.update(walletId, { status: 'FROZEN' });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'froze_wallet',
    entity: 'Wallet',
    entityId: walletId,
    details: `Wallet frozen for user ${wallet.userId}`,
  });

  return updated;
}

export async function unfreezeWallet(actor: Actor, walletId: string) {
  if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'CENTER_ADMIN') {
    throw ApiError.forbidden('Only admins can unfreeze wallets.');
  }
  const wallet = await walletRepository.findById(walletId);
  if (!wallet) throw ApiError.notFound('Wallet not found.');

  const updated = await walletRepository.update(walletId, { status: 'ACTIVE' });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'unfroze_wallet',
    entity: 'Wallet',
    entityId: walletId,
    details: `Wallet unfrozen for user ${wallet.userId}`,
  });

  return updated;
}

export async function closeWallet(actor: Actor, walletId: string) {
  if (actor.role !== 'SUPER_ADMIN') {
    throw ApiError.forbidden('Only super admins can close wallets.');
  }
  const wallet = await walletRepository.findById(walletId);
  if (!wallet) throw ApiError.notFound('Wallet not found.');
  if (wallet.balance !== 0) {
    throw ApiError.badRequest('Cannot close wallet with non-zero balance. Withdraw or adjust first.');
  }

  const updated = await walletRepository.update(walletId, { status: 'CLOSED' });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'closed_wallet',
    entity: 'Wallet',
    entityId: walletId,
    details: `Wallet closed for user ${wallet.userId}`,
  });

  return updated;
}

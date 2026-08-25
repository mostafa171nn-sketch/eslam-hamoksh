import { Router } from 'express';
import {
  getMyWalletHandler,
  getWalletHandler,
  getWalletTransactionsHandler,
  listWalletsHandler,
  depositHandler,
  withdrawHandler,
  adjustHandler,
  refundHandler,
  freezeHandler,
  unfreezeHandler,
  closeHandler,
} from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  depositWalletSchema,
  withdrawWalletSchema,
  adjustWalletSchema,
  refundWalletSchema,
} from '../validation';

const router = Router();

router.use(authenticate);

// Own wallet
router.get('/me', requirePermission('wallets.view'), getMyWalletHandler);

// List all wallets (admin/superadmin)
router.get('/', requirePermission('wallets.view'), listWalletsHandler);

// Single wallet
router.get('/:id', requirePermission('wallets.view'), getWalletHandler);

// Wallet transactions
router.get('/:id/transactions', requirePermission('wallets.view'), getWalletTransactionsHandler);

// Deposit (admin)
router.post('/deposit', requirePermission('wallets.deposit'), validate(depositWalletSchema), depositHandler);

// Withdraw
router.post('/:id/withdraw', requirePermission('wallets.withdraw'), validate(withdrawWalletSchema), withdrawHandler);

// Admin adjustments
router.post('/:id/adjust', requirePermission('wallets.deposit'), validate(adjustWalletSchema), adjustHandler);

// Refund
router.post('/:id/refund', requirePermission('wallets.deposit'), validate(refundWalletSchema), refundHandler);

// Freeze / unfreeze / close (admin)
router.post('/:id/freeze', requirePermission('wallets.deposit'), freezeHandler);
router.post('/:id/unfreeze', requirePermission('wallets.deposit'), unfreezeHandler);
router.post('/:id/close', requirePermission('wallets.deposit'), closeHandler);

export default router;

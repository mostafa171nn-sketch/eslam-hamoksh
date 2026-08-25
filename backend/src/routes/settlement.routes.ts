import { Router } from 'express';
import {
  getSettlementHandler,
  listSettlementsHandler,
  getSettlementSummaryHandler,
  calculateSettlementHandler,
  calculateBulkSettlementsHandler,
  approveSettlementHandler,
  markSettlementPaidHandler,
  cancelSettlementHandler,
} from '../controllers/settlement.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  calculateSettlementSchema,
  calculateBulkSettlementsSchema,
} from '../validation';

const router = Router();

router.use(authenticate);

// List settlements
router.get('/', requirePermission('settlements.view'), listSettlementsHandler);

// Summary
router.get('/summary', requirePermission('settlements.view'), getSettlementSummaryHandler);

// Single settlement
router.get('/:id', requirePermission('settlements.view'), getSettlementHandler);

// Calculate single settlement
router.post('/calculate', requirePermission('settlements.process'), validate(calculateSettlementSchema), calculateSettlementHandler);

// Calculate bulk settlements
router.post('/calculate-bulk', requirePermission('settlements.process'), validate(calculateBulkSettlementsSchema), calculateBulkSettlementsHandler);

// Approve settlement
router.post('/:id/approve', requirePermission('settlements.process'), approveSettlementHandler);

// Mark as paid
router.post('/:id/pay', requirePermission('settlements.process'), markSettlementPaidHandler);

// Cancel settlement
router.post('/:id/cancel', requirePermission('settlements.process'), cancelSettlementHandler);

export default router;

import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  getFinanceOverview,
  listCollections,
  listExpenses,
  createExpense,
  deleteExpense,
  listFinanceSettlements,
  fetchSettlementSummary,
  approveFinanceSettlement,
  payFinanceSettlement,
  calculateFinanceSettlement,
  getStudentLedger,
  getStudentLedgerDetail,
} from '../controllers/center-finance.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('payments.view'), getFinanceOverview);
router.get('/collections', requirePermission('payments.view'), listCollections);
router.get('/settlements', requirePermission('settlements.view'), listFinanceSettlements);
router.get('/settlements/summary', requirePermission('settlements.view'), fetchSettlementSummary);
router.post('/settlements/calculate', requirePermission('settlements.process'), calculateFinanceSettlement);
router.patch('/settlements/:id/approve', requirePermission('settlements.process'), approveFinanceSettlement);
router.patch('/settlements/:id/pay', requirePermission('settlements.process'), payFinanceSettlement);
router.get('/ledger', requirePermission('payments.view'), getStudentLedger);
router.get('/ledger/:studentId', requirePermission('payments.view'), getStudentLedgerDetail);
router.get('/expenses', requirePermission('payments.view'), listExpenses);
router.post('/expenses', requirePermission('payments.create'), createExpense);
router.delete('/expenses/:id', requirePermission('payments.update'), deleteExpense);

export default router;
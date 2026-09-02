import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  getCenterPayments,
  getCenterPaymentsStats,
  recordCenterPayment,
  updateCenterPaymentStatus,
} from '../controllers/center-payments.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('payments.view'), getCenterPayments);
router.get('/stats', requirePermission('payments.view'), getCenterPaymentsStats);
router.post('/', requirePermission('payments.create'), recordCenterPayment);
router.patch('/:id/status', requirePermission('payments.update'), updateCenterPaymentStatus);

export default router;

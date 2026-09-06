import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  listBroadcasts,
  getBroadcastSummary,
  createBroadcast,
  sendBroadcastNow,
  cancelBroadcast,
  deleteBroadcast,
} from '../controllers/center-broadcast.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('centers.view'), listBroadcasts);
router.get('/summary', requirePermission('centers.view'), getBroadcastSummary);
router.post('/', requirePermission('centers.update'), createBroadcast);
router.post('/:id/send', requirePermission('centers.update'), sendBroadcastNow);
router.post('/:id/cancel', requirePermission('centers.update'), cancelBroadcast);
router.delete('/:id', requirePermission('centers.update'), deleteBroadcast);

export default router;
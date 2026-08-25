import { Router } from 'express';
import {
  listNotificationsHandler,
  markAllReadHandler,
  markReadHandler,
} from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('notifications.view'), listNotificationsHandler);
router.put('/read-all', requirePermission('notifications.update'), markAllReadHandler);
router.put('/:id/read', requirePermission('notifications.update'), markReadHandler);

export default router;

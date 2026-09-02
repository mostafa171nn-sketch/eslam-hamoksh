import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getCenterAnalytics } from '../controllers/center-analytics.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('analytics.view'), getCenterAnalytics);

export default router;

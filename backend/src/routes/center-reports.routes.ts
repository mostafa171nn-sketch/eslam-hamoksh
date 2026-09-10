import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getCenterReportsOverview } from '../controllers/center-reports.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('reports.view'), getCenterReportsOverview);

export default router;
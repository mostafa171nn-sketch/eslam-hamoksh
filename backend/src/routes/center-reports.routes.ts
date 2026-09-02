import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  listCenterReports,
  generateCenterReport,
} from '../controllers/center-reports.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('reports.view'), listCenterReports);
router.post('/', requirePermission('reports.create'), generateCenterReport);

export default router;

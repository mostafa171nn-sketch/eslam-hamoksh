import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  getCenterAttendance,
  getCenterAttendanceStats,
  updateCenterAttendance,
} from '../controllers/center-attendance.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('attendance.view'), getCenterAttendance);
router.get('/stats', requirePermission('attendance.view'), getCenterAttendanceStats);
router.patch('/:id', requirePermission('attendance.update'), updateCenterAttendance);

export default router;

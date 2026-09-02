import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  getCenterProfile,
  updateCenterProfile,
  getCenterDashboardStats,
  getTodayLessons,
  getCenterAlerts,
} from '../controllers/center-account.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/profile', requirePermission('centers.view'), getCenterProfile);
router.put('/profile', requirePermission('centers.update'), updateCenterProfile);

router.get('/stats', requirePermission('centers.view'), getCenterDashboardStats);
router.get('/lessons/today', requirePermission('lessons.view'), getTodayLessons);
router.get('/lessons', requirePermission('lessons.view'), getTodayLessons);
router.get('/alerts', requirePermission('centers.view'), getCenterAlerts);

export default router;

import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { upload } from '../middleware/upload';
import {
  getCenterProfile,
  updateCenterProfile,
  uploadProfilePhoto,
  setCoverPhoto,
  deleteProfilePhoto,
  getCenterDashboardStats,
  getTodayLessons,
  getCenterAlerts,
  getScheduleLessons,
  getScheduleStats,
  getScheduleFormData,
  createCenterLesson,
  updateCenterLesson,
  cancelCenterLesson,
  getCenterSettings,
  updateCenterSettings,
  getCenterBranches,
} from '../controllers/center-account.controller';
import { getCenterDashboardOverview } from '../controllers/center-dashboard.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/profile', requirePermission('centers.view'), getCenterProfile);
router.put('/profile', requirePermission('centers.update'), updateCenterProfile);
router.post('/profile/photos', requirePermission('centers.update'), upload.single('photo'), uploadProfilePhoto);
router.patch('/profile/photos/:index/cover', requirePermission('centers.update'), setCoverPhoto);
router.delete('/profile/photos/:index', requirePermission('centers.update'), deleteProfilePhoto);

router.get('/dashboard', requirePermission('centers.view'), getCenterDashboardOverview);
router.get('/stats', requirePermission('centers.view'), getCenterDashboardStats);
router.get('/lessons/today', requirePermission('lessons.view'), getTodayLessons);
router.get('/alerts', requirePermission('centers.view'), getCenterAlerts);

router.get('/schedule', requirePermission('lessons.view'), getScheduleLessons);
router.get('/schedule/stats', requirePermission('lessons.view'), getScheduleStats);
router.get('/schedule/form-data', requirePermission('lessons.view'), getScheduleFormData);
router.post('/schedule/lessons', requirePermission('lessons.create'), createCenterLesson);
router.put('/schedule/lessons/:id', requirePermission('lessons.update'), updateCenterLesson);
router.patch('/schedule/lessons/:id/cancel', requirePermission('lessons.update'), cancelCenterLesson);

router.get('/settings', requirePermission('centers.view'), getCenterSettings);
router.put('/settings', requirePermission('centers.update'), updateCenterSettings);

router.get('/branches', requirePermission('centers.view'), getCenterBranches);

export default router;

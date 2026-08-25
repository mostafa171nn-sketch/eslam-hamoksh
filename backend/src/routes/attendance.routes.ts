import { Router } from 'express';
import {
  adminListHandler,
  adminSummaryHandler,
  centerSettingsGetHandler,
  centerSettingsUpdateHandler,
  finalizeHandler,
  generateQrHandler,
  lessonAttendanceHandler,
  parentOverviewHandler,
  scanHandler,
  summaryHandler,
  updateHandler,
} from '../controllers/attendance.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { generateQrSchema, scanSchema, updateAttendanceSchema, centerSettingsSchema } from '../validation';

const router = Router();

router.use(authenticate);

// Student QR generation (server-side GPS + lesson + enrollment validation)
router.post('/generate-qr', requirePermission('attendance.mark'), validate(generateQrSchema), generateQrHandler);

// Teacher / admin scan
router.post('/scan', requirePermission('attendance.mark'), validate(scanSchema), scanHandler);

// Live lesson attendance (teacher, admin, the enrolled student, the parent)
router.get('/lesson/:lessonId', requirePermission('attendance.view'), lessonAttendanceHandler);

// Finalize lesson -> auto-absent for missing students
router.post('/lesson/:lessonId/finalize', requirePermission('attendance.mark'), finalizeHandler);

// Student attendance summary (with RBAC enforcement inside service)
router.get('/summary/:studentId', requirePermission('attendance.view'), summaryHandler);

// Admin central attendance list + summary (dashboard). Center admins manage
// their own center; the platform super admin gets global oversight.
router.get('/admin', requirePermission('attendance.view'), adminListHandler);
router.get('/admin/summary', requirePermission('attendance.view'), adminSummaryHandler);

// Parent attendance overview for their linked children
router.get('/parent/overview', requirePermission('attendance.view'), parentOverviewHandler);

// Center settings (center admin, or super admin managing a specific center via
// the `centerId` query param). Declared before '/:id' so the static path wins.
router.get('/settings', requirePermission('settings.view'), centerSettingsGetHandler);
router.put('/settings', requirePermission('settings.update'), validate(centerSettingsSchema), centerSettingsUpdateHandler);

// Manual correction (teacher owns lesson, center admin, or super admin)
router.put('/:id', requirePermission('attendance.update'), validate(updateAttendanceSchema), updateHandler);

export default router;

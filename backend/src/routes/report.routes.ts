import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  centerDashboardHandler,
  studentReportHandler,
  teacherReportHandler,
  attendanceReportHandler,
  studentAttendanceDetailHandler,
  financialReportHandler,
  subscriptionReportHandler,
  exportAttendanceHandler,
  exportStudentsHandler,
  exportSettlementsHandler,
  exportInvoicesHandler,
  exportTeachersHandler,
} from '../controllers/report.controller';

const router = Router();

router.use(authenticate);

// Dashboard
router.get('/dashboard', requirePermission('reports.view'), centerDashboardHandler);

// Student reports
router.get('/students/:studentId', requirePermission('reports.view'), studentReportHandler);
router.get('/students/:studentId/attendance', requirePermission('reports.view'), studentAttendanceDetailHandler);

// Teacher reports
router.get('/teachers/:teacherId', requirePermission('reports.view'), teacherReportHandler);

// Attendance reports
router.get('/attendance', requirePermission('reports.view'), attendanceReportHandler);

// Financial reports
router.get('/financial', requirePermission('reports.view'), financialReportHandler);

// Subscription reports
router.get('/subscriptions', requirePermission('reports.view'), subscriptionReportHandler);

// CSV Exports
router.get('/export/attendance', requirePermission('reports.export'), exportAttendanceHandler);
router.get('/export/students', requirePermission('reports.export'), exportStudentsHandler);
router.get('/export/teachers', requirePermission('reports.export'), exportTeachersHandler);
router.get('/export/settlements', requirePermission('reports.export'), exportSettlementsHandler);
router.get('/export/invoices', requirePermission('reports.export'), exportInvoicesHandler);

export { router as reportRoutes };

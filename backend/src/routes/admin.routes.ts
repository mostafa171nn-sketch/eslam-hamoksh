import { Router } from 'express';
import {
  activityLogsHandler,
  adminTeachersHandler,
  analyticsHandler,
  createAdminHandler,
  createGradeHandler,
  createLocationHandler,
  createSubjectHandler,
  dashboardStatsHandler,
  deleteGradeHandler,
  deleteLocationHandler,
  deleteSubjectHandler,
  listGradesHandler,
  listLocationsHandler,
  listSubjectsHandler,
  listUsersHandler,
  reportHandler,
  setUserStatusHandler,
  updateGradeHandler,
  updateLocationHandler,
  updateSubjectHandler,
  updateUserHandler,
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  createAdminSchema,
  createGradeSchema,
  createLocationSchema,
  createSubjectSchema,
  setUserStatusSchema,
  updateGradeSchema,
  updateLocationSchema,
  updateSubjectSchema,
  updateUserSchema,
} from '../validation';

const router = Router();

router.use(authenticate);

// Dashboard & Analytics
router.get('/stats', requirePermission('reports.view'), dashboardStatsHandler);
router.get('/analytics', requirePermission('reports.view'), analyticsHandler);
router.get('/reports/:type', requirePermission('reports.view'), reportHandler);
router.get('/logs', requirePermission('reports.view'), activityLogsHandler);

// User management
router.get('/users', requirePermission('teachers.view'), listUsersHandler);
router.put('/users/:id/status', requirePermission('teachers.update'), validate(setUserStatusSchema), setUserStatusHandler);
router.put('/users/:id', requirePermission('teachers.update'), validate(updateUserSchema), updateUserHandler);

router.post('/admins', requirePermission('teachers.create'), validate(createAdminSchema), createAdminHandler);

router.get('/teachers', requirePermission('teachers.view'), adminTeachersHandler);

// Subject management
router.get('/subjects', requirePermission('subjects.view'), listSubjectsHandler);
router.post('/subjects', requirePermission('subjects.manage'), validate(createSubjectSchema), createSubjectHandler);
router.put('/subjects/:id', requirePermission('subjects.manage'), validate(updateSubjectSchema), updateSubjectHandler);
router.delete('/subjects/:id', requirePermission('subjects.manage'), deleteSubjectHandler);

// Grade management
router.get('/grades', requirePermission('grades.view'), listGradesHandler);
router.post('/grades', requirePermission('grades.manage'), validate(createGradeSchema), createGradeHandler);
router.put('/grades/:id', requirePermission('grades.manage'), validate(updateGradeSchema), updateGradeHandler);
router.delete('/grades/:id', requirePermission('grades.manage'), deleteGradeHandler);

// Location management
router.get('/locations', requirePermission('locations.view'), listLocationsHandler);
router.post('/locations', requirePermission('locations.create'), validate(createLocationSchema), createLocationHandler);
router.put('/locations/:id', requirePermission('locations.update'), validate(updateLocationSchema), updateLocationHandler);
router.delete('/locations/:id', requirePermission('locations.delete'), deleteLocationHandler);

export default router;

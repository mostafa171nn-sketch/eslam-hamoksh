import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  listCenterTeachers,
  getCenterTeachersStats,
  getCenterTeacherQueue,
  getCenterTeacher,
  createCenterTeacher,
  updateCenterTeacher,
  setCenterTeacherStatus,
} from '../controllers/center-teachers.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('teachers.view'), listCenterTeachers);
router.get('/stats', requirePermission('teachers.view'), getCenterTeachersStats);
router.get('/queue', requirePermission('teachers.view'), getCenterTeacherQueue);
router.post('/', requirePermission('teachers.create'), createCenterTeacher);
router.get('/:id', requirePermission('teachers.view'), getCenterTeacher);
router.put('/:id', requirePermission('teachers.update'), updateCenterTeacher);
router.patch('/:id/status', requirePermission('teachers.update'), setCenterTeacherStatus);

export default router;

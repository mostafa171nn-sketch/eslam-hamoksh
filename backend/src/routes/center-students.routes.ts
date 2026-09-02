import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  listCenterStudents,
  getCenterStudentsStats,
  getCenterStudent,
  updateCenterStudent,
} from '../controllers/center-students.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('students.view'), listCenterStudents);
router.get('/stats', requirePermission('students.view'), getCenterStudentsStats);
router.get('/:id', requirePermission('students.view'), getCenterStudent);
router.put('/:id', requirePermission('students.update'), updateCenterStudent);

export default router;

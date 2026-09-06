import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  listGroups,
  getGroupSummary,
  getGroupDetail,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupFormData,
  addGroupStudents,
  removeGroupStudent,
} from '../controllers/center-groups.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('students.view'), listGroups);
router.get('/summary', requirePermission('students.view'), getGroupSummary);
router.get('/form-data', requirePermission('students.view'), getGroupFormData);
router.get('/:slug', requirePermission('students.view'), getGroupDetail);
router.post('/', requirePermission('students.create'), createGroup);
router.put('/:id', requirePermission('students.update'), updateGroup);
router.delete('/:id', requirePermission('students.delete'), deleteGroup);
router.post('/:id/students', requirePermission('students.update'), addGroupStudents);
router.delete('/:id/students/:studentId', requirePermission('students.update'), removeGroupStudent);

export default router;
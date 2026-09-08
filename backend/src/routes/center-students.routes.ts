import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  listCenterStudents,
  getCenterStudentsStats,
  getCenterStudent,
  updateCenterStudent,
  createCenterStudent,
  updateStudentEnrollmentStatus,
  getStudentFormData,
  remindOverduePayments,
  sendStudentMessage,
  getStudentCommunications,
} from '../controllers/center-students.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('students.view'), listCenterStudents);
router.get('/stats', requirePermission('students.view'), getCenterStudentsStats);
router.get('/form-data', requirePermission('students.view'), getStudentFormData);
router.post('/', requirePermission('students.create'), createCenterStudent);
router.post('/remind-overdue', requirePermission('students.update'), remindOverduePayments);
router.get('/:id', requirePermission('students.view'), getCenterStudent);
router.put('/:id', requirePermission('students.update'), updateCenterStudent);
router.patch('/:id/enrollment', requirePermission('students.update'), updateStudentEnrollmentStatus);
router.post('/:id/messages', requirePermission('students.update'), sendStudentMessage);
router.get('/:id/communications', requirePermission('students.view'), getStudentCommunications);

export default router;

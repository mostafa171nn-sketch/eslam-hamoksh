import { Router } from 'express';
import {
  assignTeacherHandler,
  myTeachersHandler,
  removeTeacherHandler,
  teacherAssistantsHandler,
} from '../controllers/teacher-assistant.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { assignTeacherAssistantSchema } from '../validation';

const router = Router();

router.use(authenticate);

// Assistant views their own assigned teachers
router.get('/me/teachers', requireRole('TEACHER_ASSISTANT'), myTeachersHandler);

// Admin/CENTER_ADMIN manages assistant ↔ teacher assignments
router.post(
  '/',
  requireRole('CENTER_ADMIN', 'SUPER_ADMIN'),
  requirePermission('teachers.update'),
  validate(assignTeacherAssistantSchema),
  assignTeacherHandler,
);

router.get(
  '/teacher/:teacherId',
  requireRole('CENTER_ADMIN', 'SUPER_ADMIN'),
  requirePermission('teachers.view'),
  teacherAssistantsHandler,
);

router.delete(
  '/:assistantId/teachers/:teacherId',
  requireRole('CENTER_ADMIN', 'SUPER_ADMIN'),
  requirePermission('teachers.update'),
  removeTeacherHandler,
);

export default router;

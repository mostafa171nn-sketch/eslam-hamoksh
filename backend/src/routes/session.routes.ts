import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  enrollStudentHandler,
  cancelEnrollmentHandler,
  getLessonEnrollmentsHandler,
  getStudentEnrollmentsHandler,
} from '../controllers/session.controller';
import {
  enrollStudentSchema,
  lessonIdParamSchema,
  enrollmentIdParamSchema,
  studentIdParamSchema,
} from '../validation';

const router = Router();

router.use(authenticate);

router.get(
  '/lesson/:lessonId',
  requirePermission('lessons.view'),
  validate(lessonIdParamSchema, 'params'),
  getLessonEnrollmentsHandler,
);

router.get(
  '/student/:studentId',
  requirePermission('students.view'),
  validate(studentIdParamSchema, 'params'),
  getStudentEnrollmentsHandler,
);

router.post(
  '/lesson/:lessonId',
  requirePermission('lessons.create'),
  validate(lessonIdParamSchema, 'params'),
  validate(enrollStudentSchema),
  enrollStudentHandler,
);

router.delete(
  '/:enrollmentId',
  requirePermission('lessons.update'),
  validate(enrollmentIdParamSchema, 'params'),
  cancelEnrollmentHandler,
);

export { router as sessionRoutes };

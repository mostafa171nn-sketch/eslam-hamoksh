import { Router } from 'express';
import {
  bookLessonHandler,
  createLessonHandler,
  createGroupLessonHandler,
  getLessonHandler,
  lessonAttendanceHandler,
  listLessonsHandler,
  markAttendanceHandler,
  studentAttendanceHandler,
  updateLessonHandler,
} from '../controllers/lesson.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { bookLessonSchema, createLessonSchema, createGroupLessonSchema, markAttendanceSchema, updateLessonSchema } from '../validation';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('lessons.view'), listLessonsHandler);
router.post('/book', requirePermission('lessons.create'), validate(bookLessonSchema), bookLessonHandler);
router.post('/', requirePermission('lessons.create'), validate(createLessonSchema), createLessonHandler);
router.post('/group', requirePermission('lessons.create'), validate(createGroupLessonSchema), createGroupLessonHandler);
router.get('/attendance/student/:studentId', requirePermission('attendance.view'), studentAttendanceHandler);
router.get('/:id', requirePermission('lessons.view'), getLessonHandler);
router.put('/:id', requirePermission('lessons.update'), validate(updateLessonSchema), updateLessonHandler);
router.get('/:id/attendance', requirePermission('attendance.view'), lessonAttendanceHandler);
router.post(
  '/:id/attendance',
  requirePermission('attendance.mark'),
  validate(markAttendanceSchema),
  markAttendanceHandler,
);

export default router;

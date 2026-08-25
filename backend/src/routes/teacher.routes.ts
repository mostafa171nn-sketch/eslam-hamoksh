import { Router } from 'express';
import {
  availableSlotsHandler,
  getTeacherProfileHandler,
  searchTeachersHandler,
  teacherStatsHandler,
  teacherStudentsHandler,
  updateAvailabilityHandler,
  updateTeacherPhotoHandler,
  updateTeacherProfileHandler,
} from '../controllers/teacher.controller';
import { attachUser, authenticate, requireRole } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import {
  availableSlotsSchema,
  searchTeachersQuerySchema,
  updateAvailabilitySchema,
  updateTeacherProfileSchema,
} from '../validation';
import { teacherReviewsHandler } from '../controllers/rating.controller';

const router = Router();

router.get('/', validate(searchTeachersQuerySchema, 'query'), searchTeachersHandler);
router.get('/reviews/:teacherId', teacherReviewsHandler);
router.get('/:id/available-slots', attachUser, validate(availableSlotsSchema, 'query'), availableSlotsHandler);
router.get('/:id', attachUser, getTeacherProfileHandler);

router.use(authenticate);

router.get('/me/stats', requireRole('TEACHER'), teacherStatsHandler);
router.get('/me/students', requireRole('TEACHER'), teacherStudentsHandler);
router.put('/me/profile', requireRole('TEACHER'), validate(updateTeacherProfileSchema), updateTeacherProfileHandler);
router.put('/me/photo', requireRole('TEACHER'), upload.single('photo'), updateTeacherPhotoHandler);
router.put('/me/availability', requireRole('TEACHER'), validate(updateAvailabilitySchema), updateAvailabilityHandler);

export default router;

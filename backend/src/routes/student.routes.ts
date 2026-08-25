import { Router } from 'express';
import {
  myTeachersHandler,
  studentDashboardHandler,
  updateStudentPhotoHandler,
  updateStudentProfileHandler,
} from '../controllers/student.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { updateStudentProfileSchema } from '../validation';

const router = Router();

router.use(authenticate, requireRole('STUDENT'));

router.get('/dashboard', studentDashboardHandler);
router.get('/me/teachers', myTeachersHandler);
router.put('/profile', validate(updateStudentProfileSchema), updateStudentProfileHandler);
router.put('/photo', upload.single('photo'), updateStudentPhotoHandler);

export default router;

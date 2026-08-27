import { Router } from 'express';
import {
  myTeachersHandler,
  studentDashboardHandler,
  updateStudentPhotoHandler,
  updateStudentProfileHandler,
} from '../controllers/student.controller';
import {
  followCenterHandler,
  unfollowCenterHandler,
  listFollowedCentersHandler,
  checkFollowHandler,
} from '../controllers/student-center-follow.controller';
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

// Follow / unfollow centers (student independent of single center)
router.get('/follows', listFollowedCentersHandler);
router.get('/follows/:centerId', checkFollowHandler);
router.post('/follows/:centerId', followCenterHandler);
router.delete('/follows/:centerId', unfollowCenterHandler);

export default router;

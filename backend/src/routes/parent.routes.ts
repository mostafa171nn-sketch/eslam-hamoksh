import { Router } from 'express';
import {
  childDashboardHandler,
  childProfileHandler,
  connectChildHandler,
  listChildrenHandler,
  parentDashboardHandler,
  removeChildHandler,
  updateParentPhotoHandler,
  updateParentProfileHandler,
} from '../controllers/student.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { updateParentProfileSchema } from '../validation';

const router = Router();

router.use(authenticate, requireRole('PARENT'));

router.get('/dashboard', parentDashboardHandler);
router.get('/children', listChildrenHandler);
router.post('/children/:studentId', connectChildHandler);
router.delete('/children/:studentId', removeChildHandler);
router.get('/children/:studentId', childProfileHandler);
router.get('/children/:studentId/dashboard', childDashboardHandler);
router.put('/profile', validate(updateParentProfileSchema), updateParentProfileHandler);
router.put('/photo', upload.single('photo'), updateParentPhotoHandler);

export default router;

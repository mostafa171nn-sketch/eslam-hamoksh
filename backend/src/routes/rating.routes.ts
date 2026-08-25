import { Router } from 'express';
import { rateTeacherHandler } from '../controllers/rating.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateTeacherSchema } from '../validation';

const router = Router();

router.post('/:teacherId', authenticate, requireRole('STUDENT', 'PARENT'), validate(rateTeacherSchema), rateTeacherHandler);

export default router;

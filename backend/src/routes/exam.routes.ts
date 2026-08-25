import { Router } from 'express';
import {
  createExamHandler,
  examResultsHandler,
  getAttemptResultHandler,
  getExamDetailHandler,
  gradeWrittenHandler,
  listExamsHandler,
  saveAnswerHandler,
  startExamHandler,
  submitExamHandler,
} from '../controllers/exam.controller';
import { authenticate } from '../middleware/auth';
import { requireFeature } from '../middleware/feature-guard';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createExamSchema, gradeWrittenSchema, saveAnswerSchema } from '../validation';
import { examSaveRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate, requireFeature('exams'));

router.get('/', requirePermission('exams.view'), listExamsHandler);
router.post('/', requirePermission('exams.create'), validate(createExamSchema), createExamHandler);

router.get('/attempts/:attemptId', requirePermission('exams.view'), getAttemptResultHandler);
router.post('/attempts/:attemptId/answers/:questionId', requirePermission('exams.view'), examSaveRateLimiter, validate(saveAnswerSchema), saveAnswerHandler);
router.post('/attempts/:attemptId/submit', requirePermission('exams.view'), submitExamHandler);
router.put(
  '/attempts/:attemptId/questions/:questionId/grade',
  requirePermission('exams.grade'),
  validate(gradeWrittenSchema),
  gradeWrittenHandler,
);

router.get('/:id', requirePermission('exams.view'), getExamDetailHandler);
router.post('/:id/start', requirePermission('exams.view'), startExamHandler);
router.get('/:id/results', requirePermission('exams.view'), examResultsHandler);

export default router;

import { Router } from 'express';
import {
  createAssignmentHandler,
  getAssignmentDetailHandler,
  getStudentAssignmentsForParentHandler,
  getStudentAssignmentsHandler,
  gradeSubmissionHandler,
  listAssignmentsHandler,
  listSubmissionsHandler,
  submitAssignmentHandler,
} from '../controllers/assignment.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireFeature } from '../middleware/feature-guard';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { createAssignmentSchema, gradeSubmissionSchema, submitAssignmentSchema } from '../validation';

const router = Router();

router.use(authenticate, requireFeature('assignments'));

router.get('/', requirePermission('assignments.view'), listAssignmentsHandler);
router.post('/', requirePermission('assignments.create'), upload.single('attachment'), validate(createAssignmentSchema), createAssignmentHandler);

router.get('/students/:studentId', requirePermission('assignments.view'), getStudentAssignmentsForParentHandler);
router.get('/:id', requirePermission('assignments.view'), getAssignmentDetailHandler);

router.post(
  '/:assignmentId/submit',
  requirePermission('assignments.view'),
  upload.single('file'),
  validate(submitAssignmentSchema),
  submitAssignmentHandler,
);

router.get(
  '/:assignmentId/submissions',
  requirePermission('assignments.grade'),
  listSubmissionsHandler,
);

router.put(
  '/submissions/:submissionId/grade',
  requirePermission('assignments.grade'),
  validate(gradeSubmissionSchema),
  gradeSubmissionHandler,
);

export default router;

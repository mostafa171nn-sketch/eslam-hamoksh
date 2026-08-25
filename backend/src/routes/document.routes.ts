import { Router } from 'express';
import {
  deleteHandler,
  getHandler,
  listHandler,
  rejectHandler,
  updateHandler,
  uploadHandler,
  verifyHandler,
} from '../controllers/document.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { createDocumentSchema, updateDocumentSchema } from '../validation';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('documents.view'), listHandler);
router.get('/:id', requirePermission('documents.view'), getHandler);
router.post('/', requirePermission('documents.create'), upload.single('file'), validate(createDocumentSchema), uploadHandler);
router.put('/:id', requirePermission('documents.update'), validate(updateDocumentSchema), updateHandler);
router.delete('/:id', requirePermission('documents.delete'), deleteHandler);
router.post('/:id/verify', requirePermission('documents.verify'), verifyHandler);
router.post('/:id/reject', requirePermission('documents.verify'), rejectHandler);

export default router;

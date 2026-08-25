import { Router } from 'express';
import {
  listTemplatesHandler,
  getTemplateHandler,
  createTemplateHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
} from '../controllers/notification-template.controller';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createNotificationTemplateSchema, updateNotificationTemplateSchema } from '../validation';

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/', listTemplatesHandler);
router.get('/:key', getTemplateHandler);
router.post('/', validate(createNotificationTemplateSchema), createTemplateHandler);
router.put('/:key', validate(updateNotificationTemplateSchema), updateTemplateHandler);
router.delete('/:key', deleteTemplateHandler);

export default router;

import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { listTasks, createTask, updateTask, deleteTask } from '../controllers/center-tasks.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('settings.view'), listTasks);
router.post('/', requirePermission('settings.update'), createTask);
router.put('/:id', requirePermission('settings.update'), updateTask);
router.delete('/:id', requirePermission('settings.update'), deleteTask);

export default router;
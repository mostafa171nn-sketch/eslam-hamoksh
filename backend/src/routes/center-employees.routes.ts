import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  listCenterEmployees,
  getCenterEmployeeStats,
  getCenterEmployee,
  createCenterEmployee,
  updateCenterEmployee,
  setCenterEmployeeStatus,
  deleteCenterEmployee,
} from '../controllers/center-employees.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('teachers.view'), listCenterEmployees);
router.get('/stats', requirePermission('teachers.view'), getCenterEmployeeStats);
router.get('/:id', requirePermission('teachers.view'), getCenterEmployee);
router.post('/', requirePermission('teachers.create'), createCenterEmployee);
router.put('/:id', requirePermission('teachers.update'), updateCenterEmployee);
router.patch('/:id/status', requirePermission('teachers.update'), setCenterEmployeeStatus);
router.delete('/:id', requirePermission('teachers.delete'), deleteCenterEmployee);

export default router;

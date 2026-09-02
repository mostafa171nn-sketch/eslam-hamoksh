import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  listCenterBranches,
  getCenterBranch,
  createCenterBranch,
  updateCenterBranch,
  deleteCenterBranch,
} from '../controllers/center-branches.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('locations.view'), listCenterBranches);
router.get('/:id', requirePermission('locations.view'), getCenterBranch);
router.post('/', requirePermission('locations.create'), createCenterBranch);
router.put('/:id', requirePermission('locations.update'), updateCenterBranch);
router.delete('/:id', requirePermission('locations.delete'), deleteCenterBranch);

export default router;

import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  getCenterRooms,
  createCenterRoom,
  updateCenterRoom,
  deleteCenterRoom,
} from '../controllers/center-rooms.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('rooms.view'), getCenterRooms);
router.post('/', requirePermission('rooms.create'), createCenterRoom);
router.put('/:id', requirePermission('rooms.update'), updateCenterRoom);
router.delete('/:id', requirePermission('rooms.delete'), deleteCenterRoom);

export default router;

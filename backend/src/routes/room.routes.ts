import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  createRoomHandler,
  updateRoomHandler,
  deleteRoomHandler,
  getRoomHandler,
  listRoomsHandler,
  listAvailableRoomsHandler,
} from '../controllers/room.controller';
import {
  createRoomSchema,
  updateRoomSchema,
  roomIdParamSchema,
} from '../validation';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('settings.view'), listRoomsHandler);
router.get('/available', requirePermission('lessons.view'), listAvailableRoomsHandler);
router.get('/:id', requirePermission('settings.view'), validate(roomIdParamSchema, 'params'), getRoomHandler);
router.post('/', requirePermission('settings.update'), validate(createRoomSchema), createRoomHandler);
router.put('/:id', requirePermission('settings.update'), validate(roomIdParamSchema, 'params'), validate(updateRoomSchema), updateRoomHandler);
router.delete('/:id', requirePermission('settings.update'), validate(roomIdParamSchema, 'params'), deleteRoomHandler);

export { router as roomRoutes };

import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  listBookings,
  getBookingStats,
  getRoomSchedule,
  createBooking,
  updateBookingStatus,
  deleteBooking,
} from '../controllers/center-bookings.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('rooms.view'), listBookings);
router.get('/schedule', requirePermission('rooms.view'), getRoomSchedule);
router.get('/stats', requirePermission('rooms.view'), getBookingStats);
router.post('/', requirePermission('rooms.create'), createBooking);
router.patch('/:id/status', requirePermission('rooms.update'), updateBookingStatus);
router.delete('/:id', requirePermission('rooms.delete'), deleteBooking);

export default router;
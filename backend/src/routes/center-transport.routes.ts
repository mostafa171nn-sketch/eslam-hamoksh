import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  listTransportRoutes,
  getTransportSummary,
  getTransportDrivers,
  getTransportStudents,
  createTransportRoute,
  updateTransportRoute,
  deleteTransportRoute,
  subscribeStudentToRoute,
  unsubscribeStudentFromRoute,
} from '../controllers/center-transport.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/', requirePermission('centers.view'), listTransportRoutes);
router.get('/summary', requirePermission('centers.view'), getTransportSummary);
router.get('/drivers', requirePermission('centers.view'), getTransportDrivers);
router.get('/students', requirePermission('centers.view'), getTransportStudents);
router.post('/', requirePermission('centers.update'), createTransportRoute);
router.put('/:id', requirePermission('centers.update'), updateTransportRoute);
router.delete('/:id', requirePermission('centers.update'), deleteTransportRoute);
router.post('/subscribe', requirePermission('centers.update'), subscribeStudentToRoute);
router.delete('/subscriptions/:id', requirePermission('centers.update'), unsubscribeStudentFromRoute);

export default router;
import { Router } from 'express';
import {
  adminListHandler,
  approveHandler,
  cancelSubscriptionHandler,
  correctHandler,
  createHandler,
  createSubscriptionHandler,
  exportHandler,
  getHandler,
  getSubscriptionHandler,
  listMineHandler,
  listSubscriptionsHandler,
  listTeacherHandler,
  parentStudentsHandler,
  payableTeachersHandler,
  refundHandler,
  rejectHandler,
  summaryHandler,
  teacherSettingsGetHandler,
  teacherSettingsUpdateHandler,
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireFeature } from '../middleware/feature-guard';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import {
  correctPaymentSchema,
  createPaymentSchema,
  createSubscriptionSchema,
  teacherPaymentSettingsSchema,
} from '../validation';

const router = Router();

router.use(authenticate, requireFeature('payments'));

// Helper lists for payment creation forms
router.get('/teachers', requirePermission('payments.view'), payableTeachersHandler);
router.get('/students', requirePermission('parents.view'), parentStudentsHandler);

// Teacher payment settings
router.get('/teacher/settings', requirePermission('payments.view'), teacherSettingsGetHandler);
router.put('/teacher/settings', requirePermission('payments.update'), validate(teacherPaymentSettingsSchema), teacherSettingsUpdateHandler);

// Payment creation (with optional proof upload)
router.post('/', requirePermission('payments.create'), upload.single('proof'), validate(createPaymentSchema), createHandler);

// My payments (student / parent)
router.get('/mine', requirePermission('payments.view'), listMineHandler);

// Teacher payments
router.get('/teacher', requirePermission('payments.view'), listTeacherHandler);

// Admin central payments (center admin, or super admin for global oversight)
router.get('/admin', requirePermission('payments.view'), adminListHandler);
router.get('/admin/export', requirePermission('reports.export'), exportHandler);
router.get('/admin/summary', requirePermission('reports.view'), summaryHandler);

// Single payment
router.get('/:id', requirePermission('payments.view'), getHandler);
router.post('/:id/approve', requirePermission('payments.approve'), approveHandler);
router.post('/:id/reject', requirePermission('payments.reject'), rejectHandler);
router.post('/:id/refund', requirePermission('payments.refund'), refundHandler);
router.put('/:id', requirePermission('payments.approve'), validate(correctPaymentSchema), correctHandler);

// Subscriptions
router.post('/subscriptions', requirePermission('subscriptions.create'), validate(createSubscriptionSchema), createSubscriptionHandler);
router.get('/subscriptions', requirePermission('subscriptions.view'), listSubscriptionsHandler);
router.get('/subscriptions/:id', requirePermission('subscriptions.view'), getSubscriptionHandler);
router.post('/subscriptions/:id/cancel', requirePermission('subscriptions.cancel'), cancelSubscriptionHandler);

export default router;

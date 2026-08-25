import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  listPlansHandler,
  listPublicCenterPlansHandler,
  getPlanHandler,
  createPlanHandler,
  updatePlanHandler,
  deletePlanHandler,
  assignPlanHandler,
  platformChangePlanHandler,
  platformCancelSubscriptionHandler,
  platformReactivateSubscriptionHandler,
  getMySubscriptionHandler,
  getMySubscriptionHistoryHandler,
} from '../controllers/subscription.controller';
import {
  createSubscriptionPlanSchema,
  updateSubscriptionPlanSchema,
  assignCenterPlanSchema,
  centerIdParamSchema,
  planIdParamSchema,
  cancelCenterSubscriptionSchema,
  changeCenterPlanSchema,
} from '../validation';

const router = Router();

// PUBLIC: active center packages (no auth) — must be registered before the
// global authenticate guard below.
router.get('/public/center-plans', listPublicCenterPlansHandler);

// All other subscription routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// Platform Plan Management (SUPER_ADMIN)
// ---------------------------------------------------------------------------

const superAdminRouter = Router();
superAdminRouter.use(requireSuperAdmin);

// Subscription plan CRUD
superAdminRouter.get('/plans', listPlansHandler);
superAdminRouter.get('/plans/:id', validate(planIdParamSchema, 'params'), getPlanHandler);
superAdminRouter.post('/plans', validate(createSubscriptionPlanSchema), createPlanHandler);
superAdminRouter.put('/plans/:id', validate(planIdParamSchema, 'params'), validate(updateSubscriptionPlanSchema), updatePlanHandler);
superAdminRouter.delete('/plans/:id', validate(planIdParamSchema, 'params'), deletePlanHandler);

// Assign plan to center
superAdminRouter.post('/assign', validate(assignCenterPlanSchema), assignPlanHandler);

// Platform-level center subscription management
superAdminRouter.put('/centers/:centerId/plan', validate(centerIdParamSchema, 'params'), validate(changeCenterPlanSchema), platformChangePlanHandler);
superAdminRouter.post('/centers/:centerId/cancel', validate(centerIdParamSchema, 'params'), validate(cancelCenterSubscriptionSchema), platformCancelSubscriptionHandler);
superAdminRouter.post('/centers/:centerId/reactivate', validate(centerIdParamSchema, 'params'), platformReactivateSubscriptionHandler);

router.use(superAdminRouter);

// ---------------------------------------------------------------------------
// Center Subscription Management (CENTER_ADMIN views own subscription)
// ---------------------------------------------------------------------------

router.get('/me', getMySubscriptionHandler);
router.get('/me/history', getMySubscriptionHistoryHandler);

export { router as subscriptionRoutes };

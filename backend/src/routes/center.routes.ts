import { Router } from 'express';
import {
  approveCenterHandler,
  getCenterForAdmin,
  getPublicCenter,
  getPublicCenterTeachers,
  listAllCenters,
  platformStatsHandler,
  reactivateCenterHandler,
  rejectCenterHandler,
  searchCenters,
  suspendCenterHandler,
} from '../controllers/center.controller';
import { registerCenterHandler } from '../controllers/auth.controller';
import {
  rateCenterHandler,
  centerRatingSummaryHandler,
  myCenterRatingHandler,
} from '../controllers/rating.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  centerIdParamSchema,
  centerSearchSchema,
  rateCenterSchema,
  registerCenterSchema,
} from '../validation';

export const centerRoutes = Router();

// Super admin only (registered before /:id to avoid shadowing).
centerRoutes.get('/admin/all', authenticate, requireSuperAdmin, validate(centerSearchSchema, 'query'), listAllCenters);
centerRoutes.get('/admin/stats', authenticate, requireSuperAdmin, platformStatsHandler);
centerRoutes.get('/admin/:id', authenticate, requireSuperAdmin, validate(centerIdParamSchema, 'params'), getCenterForAdmin);
centerRoutes.post('/admin/:id/approve', authenticate, requireSuperAdmin, validate(centerIdParamSchema, 'params'), approveCenterHandler);
centerRoutes.post('/admin/:id/reject', authenticate, requireSuperAdmin, validate(centerIdParamSchema, 'params'), rejectCenterHandler);
centerRoutes.post('/admin/:id/suspend', authenticate, requireSuperAdmin, validate(centerIdParamSchema, 'params'), suspendCenterHandler);
centerRoutes.post('/admin/:id/reactivate', authenticate, requireSuperAdmin, validate(centerIdParamSchema, 'params'), reactivateCenterHandler);

// Public: discover & register centers.
centerRoutes.get('/search', validate(centerSearchSchema, 'query'), searchCenters);
centerRoutes.get('/:id', validate(centerIdParamSchema, 'params'), getPublicCenter);
// Teachers that belong to ONE specific center (public browsing).
centerRoutes.get('/:id/teachers', validate(centerIdParamSchema, 'params'), getPublicCenterTeachers);

// Center ratings: public aggregate + authenticated submit / own-rating lookup.
centerRoutes.get('/:id/rating', validate(centerIdParamSchema, 'params'), centerRatingSummaryHandler);
centerRoutes.get(
  '/:id/rating/me',
  authenticate,
  validate(centerIdParamSchema, 'params'),
  myCenterRatingHandler,
);
centerRoutes.post(
  '/:id/rating',
  authenticate,
  requireRole('STUDENT', 'PARENT', 'TEACHER'),
  validate(centerIdParamSchema, 'params'),
  validate(rateCenterSchema),
  rateCenterHandler,
);
centerRoutes.post('/register', validate(registerCenterSchema), registerCenterHandler);

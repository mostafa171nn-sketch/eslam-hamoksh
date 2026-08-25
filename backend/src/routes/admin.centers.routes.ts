import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import {
  adminCentersListHandler,
  adminCentersDetailHandler,
  adminCentersApproveHandler,
  adminCentersRejectHandler,
  adminCentersSuspendHandler,
  adminCentersReactivateHandler,
  listRegistrationRequestsHandler,
  getRegistrationRequestHandler,
  approveRegistrationRequestHandler,
  rejectRegistrationRequestHandler,
} from '../controllers/admin.centers.controller';
import { validate } from '../middleware/validate';
import {
  approveRegistrationRequestSchema,
  centerIdParamSchema,
  rejectCenterSchema,
  rejectRegistrationRequestSchema,
} from '../validation';

export const adminCentersRoutes = Router();

adminCentersRoutes.use(authenticate, requireSuperAdmin);

// Center management
adminCentersRoutes.get('/', adminCentersListHandler);
adminCentersRoutes.get('/:id', validate(centerIdParamSchema, 'params'), adminCentersDetailHandler);
adminCentersRoutes.patch('/:id/approve', validate(centerIdParamSchema, 'params'), adminCentersApproveHandler);
adminCentersRoutes.patch('/:id/reject', validate(centerIdParamSchema, 'params'), validate(rejectCenterSchema), adminCentersRejectHandler);
adminCentersRoutes.patch('/:id/suspend', validate(centerIdParamSchema, 'params'), adminCentersSuspendHandler);
adminCentersRoutes.patch('/:id/activate', validate(centerIdParamSchema, 'params'), adminCentersReactivateHandler);

// Registration requests
adminCentersRoutes.get('/requests/all', listRegistrationRequestsHandler);
adminCentersRoutes.get('/requests/:id', getRegistrationRequestHandler);
adminCentersRoutes.patch('/requests/:id/approve', validate(approveRegistrationRequestSchema), approveRegistrationRequestHandler);
adminCentersRoutes.patch('/requests/:id/reject', validate(rejectRegistrationRequestSchema), rejectRegistrationRequestHandler);

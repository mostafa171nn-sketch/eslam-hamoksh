import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  listEmployeesHandler,
  getEmployeeHandler,
  createEmployeeHandler,
  updateEmployeeHandler,
  setEmployeeStatusHandler,
  removeEmployeeHandler,
  assignEmployeeRoleHandler,
} from '../controllers/center-employee.controller';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  setEmployeeStatusSchema,
  assignRoleSchema,
} from '../validation';

const router = Router();

router.use(authenticate, requireCenterAdmin);

// List employees in the current center
router.get('/', requirePermission('teachers.view'), listEmployeesHandler);

// Get a single employee
router.get('/:id', requirePermission('teachers.view'), getEmployeeHandler);

// Create a new employee
router.post('/', requirePermission('teachers.create'), validate(createEmployeeSchema), createEmployeeHandler);

// Update employee details
router.put('/:id', requirePermission('teachers.update'), validate(updateEmployeeSchema), updateEmployeeHandler);

// Set employee status (activate/deactivate/suspend)
router.patch('/:id/status', requirePermission('teachers.update'), validate(setEmployeeStatusSchema), setEmployeeStatusHandler);

// Assign/rotate employee role
router.patch('/:id/role', requirePermission('teachers.update'), validate(assignRoleSchema), assignEmployeeRoleHandler);

// Deactivate/remove employee
router.delete('/:id', requirePermission('teachers.delete'), removeEmployeeHandler);

export default router;

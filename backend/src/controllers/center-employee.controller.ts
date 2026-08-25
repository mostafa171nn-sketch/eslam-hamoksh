import type { Request, Response } from 'express';
import {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  setEmployeeStatus,
  removeEmployee,
  assignEmployeeRole,
} from '../services/center-employee.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';

export const listEmployeesHandler = asyncHandler(async (req: Request, res: Response) => {
  const { role, status, search, page, limit } = req.validatedQuery as any;
  const result = await listEmployees({ role, status, search, page, limit });
  return ok(res, result.items, 'Employees loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const getEmployeeHandler = asyncHandler(async (req: Request, res: Response) => {
  const employee = await getEmployee(req.params.id);
  return ok(res, employee, 'Employee loaded.');
});

export const createEmployeeHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await createEmployee(req.validatedBody, req.user!.id);
  return created(res, result, 'Employee created.');
});

export const updateEmployeeHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await updateEmployee(req.params.id, req.validatedBody, req.user!.id);
  return ok(res, result, 'Employee updated.');
});

export const setEmployeeStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await setEmployeeStatus(req.params.id, req.validatedBody.status, req.user!.id);
  return ok(res, result, 'Employee status updated.');
});

export const removeEmployeeHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await removeEmployee(req.params.id, req.user!.id);
  return ok(res, result, 'Employee deactivated.');
});

export const assignEmployeeRoleHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await assignEmployeeRole(req.params.id, req.validatedBody.role, req.user!.id);
  return ok(res, result, 'Employee role updated.');
});

import type { Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { fileUrl } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { hashPassword } from '../utils/password';
import { recordActivity } from '../services/activity.service';
import { assertWithinPlanLimit } from '../services/subscription.service';

const EMPLOYEE_ROLES: Role[] = ['CENTER_EMPLOYEE', 'RECEPTIONIST', 'TEACHER_ASSISTANT'];
const MATRIX_ROLES: Role[] = ['CENTER_ADMIN', 'CENTER_EMPLOYEE', 'RECEPTIONIST', 'TEACHER_ASSISTANT'];

export const listCenterEmployees = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const { search, status, role, department, page = 1, limit = 20 } = req.query as any;

  const where: any = {
    centerId,
    role: { in: EMPLOYEE_ROLES },
  };
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total, center] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        photo: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.user.count({ where }),
    prisma.center.findUnique({ where: { id: centerId }, select: { name: true } }),
  ]);

  const ids = items.map((u) => u.id);

  const [activities, taskGroups] = await Promise.all([
    ids.length
      ? prisma.activityLog.findMany({
          where: { userId: { in: ids } },
          orderBy: [{ userId: 'asc' }, { createdAt: 'desc' }],
          distinct: ['userId'],
          select: { userId: true, action: true, createdAt: true },
        })
      : Promise.resolve([]),
    ids.length
      ? prisma.employeeTask.groupBy({
          by: ['assigneeId'],
          where: { assigneeId: { in: ids }, status: { not: 'DONE' } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const lastActivityByUser = new Map(activities.map((a) => [a.userId, { action: a.action, createdAt: a.createdAt.toISOString() }]));
  const openTasksByUser = new Map(taskGroups.map((g) => [g.assigneeId, g._count._all]));

  const formattedItems = items.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    username: u.username,
    phone: u.phone,
    email: u.email,
    role: u.role,
    status: u.status,
    photo: fileUrl(u.photo),
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    lastActivity: lastActivityByUser.get(u.id) ?? null,
    openTaskCount: openTasksByUser.get(u.id) ?? 0,
    centerName: center?.name ?? null,
  }));

  return ok(res, formattedItems, 'Employees loaded', {
    page: Number(page),
    limit: Number(limit),
    total,
    totalPages: Math.ceil(total / Number(limit)),
  });
});

export const getCenterEmployeeStats = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalEmployees, activeEmployees, pendingEmployees, changesToday, openTasks, suspendedCount] = await Promise.all([
    prisma.user.count({
      where: { centerId, role: { in: EMPLOYEE_ROLES } },
    }),
    prisma.user.count({
      where: { centerId, role: { in: EMPLOYEE_ROLES }, status: 'ACTIVE' },
    }),
    prisma.user.count({
      where: { centerId, role: { in: EMPLOYEE_ROLES }, status: 'PENDING' },
    }),
    prisma.activityLog.count({
      where: {
        centerId,
        createdAt: { gte: today },
        entity: 'User',
      },
    }),
    prisma.employeeTask.count({
      where: { centerId, status: { not: 'DONE' } },
    }),
    prisma.user.count({
      where: { centerId, role: { in: EMPLOYEE_ROLES }, status: { in: ['SUSPENDED', 'INACTIVE'] } },
    }),
  ]);

  const activeRoles = await prisma.user.findMany({
    where: { centerId, role: { in: EMPLOYEE_ROLES } },
    distinct: ['role'],
    select: { role: true },
  });

  return ok(res, {
    totalEmployees,
    activeEmployees,
    pendingInvitations: pendingEmployees,
    activeRoles: activeRoles.length,
    openTasks,
    suspendedCount,
    changesToday,
  });
});

/**
 * Real permission matrix derived from the `RolePermission` table for the
 * center-facing roles. Each role's permission names are grouped by module
 * (the leading token of the permission name, e.g. `teachers.view` -> `teachers`)
 * and the raw operations are exposed so the UI can render access levels.
 */
export const getCenterPermissionMatrix = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const rows = await prisma.rolePermission.findMany({
    where: { role: { in: MATRIX_ROLES as any } },
    select: { role: true, permission: { select: { name: true } } },
    orderBy: [{ role: 'asc' }],
  });

  const byRole: Record<string, Map<string, { ops: string[] }>> = {};
  for (const role of MATRIX_ROLES) {
    byRole[role] = new Map();
  }

  for (const row of rows) {
    const name = row.permission.name;
    const dot = name.indexOf('.');
    const domain = dot === -1 ? name : name.slice(0, dot);
    const op = dot === -1 ? '' : name.slice(dot + 1);
    const map = byRole[row.role];
    if (!map) continue;
    const entry = map.get(domain) ?? { ops: [] };
    if (op && !entry.ops.includes(op)) entry.ops.push(op);
    map.set(domain, entry);
  }

  const roles = MATRIX_ROLES.map((role) => ({
    role,
    modules: Array.from(byRole[role].entries())
      .map(([domain, module]) => ({ domain, ops: module.ops }))
      .sort((a, b) => a.domain.localeCompare(b.domain)),
  }));

  return ok(res, { roles });
});

export const getCenterEmployee = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.centerId !== centerId) {
    throw ApiError.notFound('Employee not found');
  }
  return ok(res, {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    phone: user.phone,
    email: user.email,
    role: user.role,
    status: user.status,
    photo: fileUrl(user.photo),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
});

export const createCenterEmployee = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { fullName, username, password, phone, email, role } = req.body;

  if (!fullName || !username || !password || !phone || !role) {
    throw ApiError.badRequest('Missing required fields');
  }

  const validRoles = ['CENTER_EMPLOYEE', 'RECEPTIONIST', 'TEACHER_ASSISTANT'];
  if (!validRoles.includes(role)) {
    throw ApiError.badRequest('Invalid role');
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw ApiError.conflict('Username already taken');
  }

  await assertWithinPlanLimit(centerId, role === 'TEACHER_ASSISTANT' ? 'assistants' : 'employees');

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      fullName,
      username,
      passwordHash,
      phone,
      email: email || null,
      role,
      centerId,
    },
  });

  await recordActivity({
    userId: req.user!.id,
    action: 'created_employee',
    entity: 'User',
    entityId: user.id,
    details: JSON.stringify({ role }),
  });

  return ok(res, {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    role: user.role,
    status: user.status,
  }, 'Employee created');
});

export const updateCenterEmployee = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;
  const { fullName, phone, email, role, password } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.centerId !== centerId) {
    throw ApiError.notFound('Employee not found');
  }

  const updateData: any = {};
  if (fullName !== undefined) updateData.fullName = fullName;
  if (phone !== undefined) updateData.phone = phone;
  if (email !== undefined) updateData.email = email;
  if (role !== undefined) {
    const validRoles = ['CENTER_EMPLOYEE', 'RECEPTIONIST', 'TEACHER_ASSISTANT'];
    if (!validRoles.includes(role)) {
      throw ApiError.badRequest('Invalid role');
    }
    updateData.role = role;
  }
  if (password) updateData.passwordHash = await hashPassword(password);

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  await recordActivity({
    userId: req.user!.id,
    action: 'updated_employee',
    entity: 'User',
    entityId: id,
  });

  return ok(res, {
    id: updated.id,
    fullName: updated.fullName,
    username: updated.username,
    role: updated.role,
    status: updated.status,
  }, 'Employee updated');
});

export const setCenterEmployeeStatus = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;
  const { status } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.centerId !== centerId) {
    throw ApiError.notFound('Employee not found');
  }

  const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'];
  if (!validStatuses.includes(status)) {
    throw ApiError.badRequest('Invalid status');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status },
  });

  await recordActivity({
    userId: req.user!.id,
    action: `set_employee_status_${status.toLowerCase()}`,
    entity: 'User',
    entityId: id,
  });

  return ok(res, { id: updated.id, status: updated.status }, 'Status updated');
});

export const deleteCenterEmployee = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.centerId !== centerId) {
    throw ApiError.notFound('Employee not found');
  }

  // Deactivate instead of hard delete
  const updated = await prisma.user.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });

  await recordActivity({
    userId: req.user!.id,
    action: 'deactivated_employee',
    entity: 'User',
    entityId: id,
  });

  return ok(res, { id: updated.id, status: updated.status }, 'Employee deactivated');
});

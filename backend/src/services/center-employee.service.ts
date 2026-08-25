import type { Role } from '@prisma/client';
import { currentCenterId, isPlatformScope } from '../lib/tenant';
import { ApiError } from '../utils/ApiError';
import { hashPassword } from '../utils/password';
import { userRepository } from '../repositories/user.repository';
import { centerRepository } from '../repositories/center.repository';
import { recordActivity } from './activity.service';
import { assertWithinPlanLimit, type PlanLimitResource } from './subscription.service';

const EMPLOYEE_ROLES: Role[] = ['CENTER_EMPLOYEE', 'RECEPTIONIST', 'TEACHER_ASSISTANT'];

function isEmployeeRole(role: string): role is Role {
  return EMPLOYEE_ROLES.includes(role as Role);
}

/**
 * Resolves the effective centerId for employee operations.
 * For CENTER_ADMIN uses the tenant context.
 * For SUPER_ADMIN uses the explicit centerId from the request.
 */
function resolveCenterId(explicitCenterId?: string): string {
  if (isPlatformScope()) {
    if (!explicitCenterId) {
      throw ApiError.badRequest('centerId is required for platform-scope operations.', 'CENTER_REQUIRED');
    }
    return explicitCenterId;
  }
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.badRequest('No center context available.', 'NO_CENTER');
  }
  return centerId;
}

export interface CreateEmployeeInput {
  fullName: string;
  username: string;
  password: string;
  phone: string;
  email?: string;
  role: Role;
  centerId?: string;
}

export async function createEmployee(input: CreateEmployeeInput, actorId: string) {
  const centerId = resolveCenterId(input.centerId);

  if (!isEmployeeRole(input.role)) {
    throw ApiError.badRequest(
      'Invalid employee role. Must be CENTER_EMPLOYEE, RECEPTIONIST, or TEACHER_ASSISTANT.',
      'INVALID_ROLE',
    );
  }

  const limitResource: PlanLimitResource =
    input.role === 'TEACHER_ASSISTANT' ? 'assistants' : 'employees';
  await assertWithinPlanLimit(centerId, limitResource);

  const existing = await userRepository.findByUsername(input.username);
  if (existing) {
    throw ApiError.conflict('This username is already taken.', 'USERNAME_TAKEN');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await userRepository.create({
    username: input.username,
    passwordHash,
    fullName: input.fullName,
    phone: input.phone,
    email: input.email ?? null,
    role: input.role,
    center: { connect: { id: centerId } },
  });

  await recordActivity({
    userId: actorId,
    action: 'created_employee',
    entity: 'User',
    entityId: user.id,
    details: JSON.stringify({ role: input.role }),
  });

  return { id: user.id, username: user.username, fullName: user.fullName, role: user.role, status: user.status };
}

export interface ListEmployeesQuery {
  role?: Role;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  centerId?: string;
}

export async function listEmployees(query: ListEmployeesQuery) {
  const centerId = resolveCenterId(query.centerId);
  const { role, status, search, page = 1, limit = 20 } = query;

  const where: Record<string, unknown> = {
    centerId,
    role: role ? role : { in: EMPLOYEE_ROLES },
  };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }

  const [total, users] = await Promise.all([
    userRepository.count(where as any),
    userRepository.findMany({
      where: where as any,
      select: {
        id: true,
        username: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getEmployee(userId: string, centerId?: string) {
  const effectiveCenterId = resolveCenterId(centerId);
  const user = await userRepository.findById(userId);
  if (!user) throw ApiError.notFound('User not found.');
  if (!isEmployeeRole(user.role)) {
    throw ApiError.badRequest('User is not an employee.', 'NOT_EMPLOYEE');
  }
  if (user.centerId !== effectiveCenterId) {
    throw ApiError.forbidden('Access denied.');
  }
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

export interface UpdateEmployeeInput {
  fullName?: string;
  phone?: string;
  email?: string;
  role?: Role;
  password?: string;
}

export async function updateEmployee(
  userId: string,
  input: UpdateEmployeeInput,
  actorId: string,
  actorCenterId?: string,
) {
  const centerId = resolveCenterId(actorCenterId);
  const user = await userRepository.findById(userId);
  if (!user) throw ApiError.notFound('User not found.');
  if (!isEmployeeRole(user.role)) {
    throw ApiError.badRequest('User is not an employee.', 'NOT_EMPLOYEE');
  }
  if (user.centerId !== centerId) {
    throw ApiError.forbidden('Access denied. Cannot manage users outside your center.');
  }

  if (input.role && input.role !== user.role) {
    if (!isEmployeeRole(input.role)) {
      throw ApiError.badRequest(
        'Invalid employee role. Must be CENTER_EMPLOYEE, RECEPTIONIST, or TEACHER_ASSISTANT.',
        'INVALID_ROLE',
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (input.fullName !== undefined) data.fullName = input.fullName;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.email !== undefined) data.email = input.email || null;
  if (input.role !== undefined) data.role = input.role;
  if (input.password) data.passwordHash = await hashPassword(input.password);

  const updated = await userRepository.update(userId, data as any);

  await recordActivity({
    userId: actorId,
    action: 'updated_employee',
    entity: 'User',
    entityId: userId,
  });

  return {
    id: updated.id,
    username: updated.username,
    fullName: updated.fullName,
    role: updated.role,
    status: updated.status,
  };
}

export async function setEmployeeStatus(
  userId: string,
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
  actorId: string,
  actorCenterId?: string,
) {
  const centerId = resolveCenterId(actorCenterId);
  const user = await userRepository.findById(userId);
  if (!user) throw ApiError.notFound('User not found.');
  if (!isEmployeeRole(user.role)) {
    throw ApiError.badRequest('User is not an employee.', 'NOT_EMPLOYEE');
  }
  if (user.centerId !== centerId) {
    throw ApiError.forbidden('Access denied. Cannot manage users outside your center.');
  }

  const updated = await userRepository.update(userId, { status });

  await recordActivity({
    userId: actorId,
    action: `set_employee_status_${status.toLowerCase()}`,
    entity: 'User',
    entityId: userId,
  });

  return { id: updated.id, status: updated.status };
}

export async function removeEmployee(
  userId: string,
  actorId: string,
  actorCenterId?: string,
) {
  const centerId = resolveCenterId(actorCenterId);
  const user = await userRepository.findById(userId);
  if (!user) throw ApiError.notFound('User not found.');
  if (!isEmployeeRole(user.role)) {
    throw ApiError.badRequest('User is not an employee.', 'NOT_EMPLOYEE');
  }
  if (user.centerId !== centerId) {
    throw ApiError.forbidden('Access denied. Cannot manage users outside your center.');
  }

  const updated = await userRepository.update(userId, { status: 'INACTIVE' });

  await recordActivity({
    userId: actorId,
    action: 'deactivated_employee',
    entity: 'User',
    entityId: userId,
  });

  return { id: updated.id, status: updated.status };
}

export async function assignEmployeeRole(
  userId: string,
  role: Role,
  actorId: string,
  actorCenterId?: string,
) {
  const centerId = resolveCenterId(actorCenterId);
  const user = await userRepository.findById(userId);
  if (!user) throw ApiError.notFound('User not found.');
  if (!isEmployeeRole(user.role) && user.role !== 'TEACHER') {
    throw ApiError.badRequest('User is not an employee or teacher.', 'NOT_EMPLOYEE');
  }
  if (user.centerId !== centerId) {
    throw ApiError.forbidden('Access denied. Cannot manage users outside your center.');
  }
  if (!isEmployeeRole(role)) {
    throw ApiError.badRequest(
      'Invalid employee role. Must be CENTER_EMPLOYEE, RECEPTIONIST, or TEACHER_ASSISTANT.',
      'INVALID_ROLE',
    );
  }

  const updated = await userRepository.update(userId, { role });

  await recordActivity({
    userId: actorId,
    action: 'assigned_employee_role',
    entity: 'User',
    entityId: userId,
    details: JSON.stringify({ newRole: role }),
  });

  return { id: updated.id, role: updated.role };
}

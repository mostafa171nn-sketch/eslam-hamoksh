import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { assigneeId, status } = req.query as Record<string, string | undefined>;

  const tasks = await prisma.employeeTask.findMany({
    where: {
      ...(assigneeId ? { assigneeId } : {}),
      ...(status ? { status: status as any } : {}),
    },
    include: { assignee: { select: { fullName: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return ok(
    res,
    tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      dueAt: t.dueAt,
      completedAt: t.completedAt,
      createdAt: t.createdAt,
      assignee: t.assignee?.fullName || null,
      assigneeRole: t.assignee?.role || null,
    })),
  );
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { assigneeId, title, description, dueAt } = req.body ?? {};
  if (!title) throw ApiError.badRequest('Task title is required');

  const task = await prisma.employeeTask.create({
    data: {
      centerId,
      assigneeId: assigneeId || null,
      title,
      description: description || null,
      dueAt: dueAt ? new Date(dueAt) : null,
    },
  });

  await recordActivity({ userId: req.user!.id, action: 'created_task', entity: 'EmployeeTask', entityId: task.id });

  return ok(res, task, 'Task created');
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const task = await prisma.employeeTask.findFirst({ where: { id, centerId } });
  if (!task) throw ApiError.notFound('Task not found');

  const { assigneeId, title, description, dueAt, status } = req.body ?? {};
  const data: any = {};
  if (assigneeId !== undefined) data.assigneeId = assigneeId || null;
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (dueAt !== undefined) data.dueAt = dueAt ? new Date(dueAt) : null;
  if (status !== undefined) {
    data.status = status;
    if (status === 'DONE') data.completedAt = new Date();
  }

  const updated = await prisma.employeeTask.update({ where: { id }, data });
  await recordActivity({ userId: req.user!.id, action: 'updated_task', entity: 'EmployeeTask', entityId: id });

  return ok(res, updated, 'Task updated');
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const task = await prisma.employeeTask.findFirst({ where: { id, centerId } });
  if (!task) throw ApiError.notFound('Task not found');

  await prisma.employeeTask.delete({ where: { id } });
  await recordActivity({ userId: req.user!.id, action: 'deleted_task', entity: 'EmployeeTask', entityId: id });

  return ok(res, { id }, 'Task deleted');
});
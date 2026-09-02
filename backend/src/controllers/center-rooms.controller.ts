import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

export const getCenterRooms = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const rooms = await prisma.room.findMany({
    where: { centerId },
    include: {
      location: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return ok(res, rooms.map(r => ({
    id: r.id,
    name: r.name,
    capacity: r.capacity,
    status: r.status,
    branch: r.location?.name || null,
    branchId: r.locationId,
  })));
});

export const createCenterRoom = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const { name, capacity, branchId } = req.body;
  if (!name) {
    throw ApiError.badRequest('Room name is required');
  }

  const room = await prisma.room.create({
    data: {
      name,
      capacity: capacity || 20,
      centerId,
      locationId: branchId || null,
      status: 'ACTIVE',
    },
  });

  await recordActivity({
    userId: req.user!.id,
    action: 'created_room',
    entity: 'Room',
    entityId: room.id,
  });

  return ok(res, room, 'Room created');
});

export const updateCenterRoom = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;
  const { name, capacity, branchId, status } = req.body;

  const room = await prisma.room.findUnique({ where: { id } });
  if (!room || room.centerId !== centerId) {
    throw ApiError.notFound('Room not found');
  }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (capacity !== undefined) updateData.capacity = Number(capacity);
  if (branchId !== undefined) updateData.locationId = branchId;
  if (status !== undefined) updateData.status = status;

  const updated = await prisma.room.update({
    where: { id },
    data: updateData,
  });

  await recordActivity({
    userId: req.user!.id,
    action: 'updated_room',
    entity: 'Room',
    entityId: id,
  });

  return ok(res, updated, 'Room updated');
});

export const deleteCenterRoom = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;

  const room = await prisma.room.findUnique({ where: { id } });
  if (!room || room.centerId !== centerId) {
    throw ApiError.notFound('Room not found');
  }

  // Soft delete by marking inactive
  await prisma.room.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });

  await recordActivity({
    userId: req.user!.id,
    action: 'deactivated_room',
    entity: 'Room',
    entityId: id,
  });

  return ok(res, { id }, 'Room deactivated');
});

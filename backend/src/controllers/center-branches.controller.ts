import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { fileUrl } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

export const listCenterBranches = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const branches = await prisma.location.findMany({
    where: { centerId },
    include: {
      _count: {
        select: {
          teachers: true,
          rooms: true,
          lessons: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const formattedBranches = await Promise.all(
    branches.map(async (b) => {
      // Get employee count
      const employeeCount = await prisma.user.count({
        where: { centerId, status: 'ACTIVE' },
      });

      return {
        id: b.id,
        name: b.name,
        address: b.address,
        teacherCount: b._count.teachers,
        roomCount: b._count.rooms,
        lessonCount: b._count.lessons,
        employeeCount,
        createdAt: b.createdAt.toISOString(),
      };
    })
  );

  return ok(res, formattedBranches, 'Branches loaded');
});

export const getCenterBranch = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;
  const branch = await prisma.location.findUnique({
    where: { id },
    include: {
      _count: { select: { teachers: true, rooms: true, lessons: true } },
    },
  });
  if (!branch || branch.centerId !== centerId) {
    throw ApiError.notFound('Branch not found');
  }
  return ok(res, branch);
});

export const createCenterBranch = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { name, address } = req.body;

  if (!name) {
    throw ApiError.badRequest('Branch name is required');
  }

  const branch = await prisma.location.create({
    data: {
      name,
      address: address || null,
      centerId,
    },
  });

  await recordActivity({
    userId: req.user!.id,
    action: 'created_branch',
    entity: 'Location',
    entityId: branch.id,
    details: JSON.stringify({ name }),
  });

  return ok(res, branch, 'Branch created');
});

export const updateCenterBranch = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;
  const { name, address } = req.body;

  const branch = await prisma.location.findUnique({ where: { id } });
  if (!branch || branch.centerId !== centerId) {
    throw ApiError.notFound('Branch not found');
  }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (address !== undefined) updateData.address = address;

  const updated = await prisma.location.update({
    where: { id },
    data: updateData,
  });

  await recordActivity({
    userId: req.user!.id,
    action: 'updated_branch',
    entity: 'Location',
    entityId: id,
  });

  return ok(res, updated, 'Branch updated');
});

export const deleteCenterBranch = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;

  const branch = await prisma.location.findUnique({ where: { id } });
  if (!branch || branch.centerId !== centerId) {
    throw ApiError.notFound('Branch not found');
  }

  // Check if branch has associated data
  const [teachersCount, lessonsCount, roomsCount] = await Promise.all([
    prisma.teacher.count({ where: { locationId: id } }),
    prisma.lesson.count({ where: { locationId: id } }),
    prisma.room.count({ where: { locationId: id } }),
  ]);

  if (teachersCount > 0 || lessonsCount > 0 || roomsCount > 0) {
    // Soft delete by adding " (inactive)" suffix
    await prisma.location.update({
      where: { id },
      data: { name: `${branch.name} (inactive)` },
    });

    await recordActivity({
      userId: req.user!.id,
      action: 'deactivated_branch',
      entity: 'Location',
      entityId: id,
    });

    return ok(res, { id }, 'Branch deactivated (has associated data)');
  }

  await prisma.location.delete({ where: { id } });

  await recordActivity({
    userId: req.user!.id,
    action: 'deleted_branch',
    entity: 'Location',
    entityId: id,
  });

  return ok(res, { id }, 'Branch deleted');
});

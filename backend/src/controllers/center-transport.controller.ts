import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

export const listTransportRoutes = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const routes = await prisma.transportRoute.findMany({
    where: { centerId },
    include: {
      students: {
        where: { active: true },
        include: { student: { include: { user: { select: { fullName: true } } } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return ok(
    res,
    routes.map((r) => ({
      id: r.id,
      name: r.name,
      areas: r.areas,
      driverName: r.driverName,
      driverPhone: r.driverPhone,
      vehicle: r.vehicle,
      capacity: r.capacity,
      occupied: r.students.length,
      pickupTime: r.pickupTime,
      dropoffTime: r.dropoffTime,
      status: r.status,
      students: r.students.map((s) => ({ id: s.studentId, name: s.student.user.fullName })),
    })),
  );
});

export const getTransportSummary = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const [routes, subscribed, availableSeats] = await Promise.all([
    prisma.transportRoute.count({ where: { centerId, status: 'ACTIVE' } }),
    prisma.transportStudent.count({ where: { active: true } }),
    prisma.transportRoute.aggregate({
      where: { centerId },
      _sum: { capacity: true },
    }),
  ]);

  const totalSeats = routes > 0 ? availableSeats._sum.capacity || 0 : 0;
  const occupied = await prisma.transportStudent.count({ where: { active: true } });

  return ok(res, {
    routes,
    subscribed,
    availableSeats: Math.max(totalSeats - occupied, 0),
    totalSeats,
  });
});

export const getTransportDrivers = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const routes = await prisma.transportRoute.findMany({
    where: { centerId, driverName: { not: null } },
    select: { id: true, name: true, driverName: true, driverPhone: true, vehicle: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  return ok(res, routes);
});

export const getTransportStudents = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const rows = await prisma.transportStudent.findMany({
    where: { active: true },
    include: {
      route: { select: { name: true } },
      student: {
        include: { user: { select: { fullName: true, phone: true } } },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return ok(
    res,
    rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      name: r.student.user.fullName,
      phone: r.student.user.phone,
      route: r.route.name,
      joinedAt: r.joinedAt,
    })),
  );
});

export const createTransportRoute = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { name, areas, driverName, driverPhone, vehicle, capacity, pickupTime, dropoffTime } = req.body ?? {};
  if (!name) throw ApiError.badRequest('Route name is required');

  const existing = await prisma.transportRoute.findFirst({ where: { centerId, name } });
  if (existing) throw ApiError.badRequest('A route with this name already exists');

  const route = await prisma.transportRoute.create({
    data: {
      centerId,
      name,
      areas: areas || null,
      driverName: driverName || null,
      driverPhone: driverPhone || null,
      vehicle: vehicle || null,
      capacity: capacity ? Number(capacity) : 0,
      pickupTime: pickupTime || null,
      dropoffTime: dropoffTime || null,
    },
  });

  await recordActivity({ userId: req.user!.id, action: 'created_transport_route', entity: 'TransportRoute', entityId: route.id });

  return ok(res, route, 'Route created');
});

export const updateTransportRoute = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const route = await prisma.transportRoute.findFirst({ where: { id, centerId } });
  if (!route) throw ApiError.notFound('Route not found');

  const { name, areas, driverName, driverPhone, vehicle, capacity, pickupTime, dropoffTime, status } = req.body ?? {};
  const data: any = {};
  if (name !== undefined) data.name = name;
  if (areas !== undefined) data.areas = areas;
  if (driverName !== undefined) data.driverName = driverName;
  if (driverPhone !== undefined) data.driverPhone = driverPhone;
  if (vehicle !== undefined) data.vehicle = vehicle;
  if (capacity !== undefined) data.capacity = Number(capacity);
  if (pickupTime !== undefined) data.pickupTime = pickupTime;
  if (dropoffTime !== undefined) data.dropoffTime = dropoffTime;
  if (status !== undefined) data.status = status;

  const updated = await prisma.transportRoute.update({ where: { id }, data });
  await recordActivity({ userId: req.user!.id, action: 'updated_transport_route', entity: 'TransportRoute', entityId: id });

  return ok(res, updated, 'Route updated');
});

export const deleteTransportRoute = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const route = await prisma.transportRoute.findFirst({ where: { id, centerId } });
  if (!route) throw ApiError.notFound('Route not found');

  await prisma.transportRoute.update({ where: { id }, data: { status: 'INACTIVE' } });
  await recordActivity({ userId: req.user!.id, action: 'deactivated_transport_route', entity: 'TransportRoute', entityId: id });

  return ok(res, { id }, 'Route deactivated');
});

export const subscribeStudentToRoute = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { routeId, studentId } = req.body ?? {};
  if (!routeId || !studentId) throw ApiError.badRequest('routeId and studentId are required');

  const route = await prisma.transportRoute.findFirst({ where: { id: routeId, centerId } });
  if (!route) throw ApiError.notFound('Route not found');

  const existing = await prisma.transportStudent.findUnique({
    where: { routeId_studentId: { routeId, studentId } },
  });

  if (existing) {
    await prisma.transportStudent.update({
      where: { id: existing.id },
      data: { active: true },
    });
    return ok(res, existing, 'Student subscribed to route');
  }

  const row = await prisma.transportStudent.create({ data: { routeId, studentId } });
  await recordActivity({ userId: req.user!.id, action: 'subscribed_transport_student', entity: 'TransportRoute', entityId: routeId });

  return ok(res, row, 'Student subscribed to route');
});

export const unsubscribeStudentFromRoute = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const row = await prisma.transportStudent.findFirst({
    where: {
      id,
      route: { centerId },
    },
  });
  if (!row) throw ApiError.notFound('Subscription not found');

  await prisma.transportStudent.update({ where: { id }, data: { active: false } });
  await recordActivity({ userId: req.user!.id, action: 'unsubscribed_transport_student', entity: 'TransportStudent', entityId: id });

  return ok(res, { id }, 'Student unsubscribed');
});
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

export const listBookings = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { status, date, dayOfWeek } = req.query as Record<string, string | undefined>;

  const bookings = await prisma.roomBooking.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(dayOfWeek !== undefined && dayOfWeek !== '' ? { dayOfWeek: Number(dayOfWeek) } : {}),
      ...(date ? { OR: [{ date: { gte: new Date(`${date}T00:00:00.000Z`) } }, { date: null }] } : {}),
    },
    include: {
      room: { select: { name: true, capacity: true } },
      teacher: { include: { user: { select: { fullName: true } } } },
      group: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return ok(
    res,
    bookings.map((b) => ({
      id: b.id,
      room: b.room?.name || null,
      roomId: b.roomId,
      roomCapacity: b.room?.capacity ?? null,
      teacher: b.teacher?.user?.fullName || null,
      teacherId: b.teacherId,
      group: b.group?.name || null,
      groupId: b.groupId,
      date: b.date,
      dayOfWeek: b.dayOfWeek,
      startTime: b.startTime,
      endTime: b.endTime,
      recurrence: b.recurrence,
      status: b.status,
      note: b.note,
      createdAt: b.createdAt,
    })),
  );
});

export const getBookingStats = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const [pending, approved, cancelled, roomsInUse] = await Promise.all([
    prisma.roomBooking.count({ where: { status: 'PENDING' } }),
    prisma.roomBooking.count({ where: { status: 'APPROVED' } }),
    prisma.roomBooking.count({ where: { status: 'CANCELLED' } }),
    prisma.roomBooking.count({ where: { status: { not: 'CANCELLED' } } }),
  ]);

  return ok(res, { pending, approved, cancelled, roomsInUse });
});

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { roomId, teacherId, groupId, date, dayOfWeek, startTime, endTime, recurrence, note } = req.body ?? {};

  if (!roomId || !teacherId || !startTime || !endTime) {
    throw ApiError.badRequest('roomId, teacherId, startTime and endTime are required');
  }

  const booking = await prisma.roomBooking.create({
    data: {
      centerId,
      roomId,
      teacherId,
      groupId: groupId || null,
      date: date ? new Date(date) : null,
      dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== '' ? Number(dayOfWeek) : null,
      startTime,
      endTime,
      recurrence: recurrence || 'ONE_TIME',
      note: note || null,
    },
  });

  await recordActivity({ userId: req.user!.id, action: 'created_room_booking', entity: 'RoomBooking', entityId: booking.id });

  return ok(res, booking, 'Booking created');
});

export const updateBookingStatus = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const { status } = req.body ?? {};

  const booking = await prisma.roomBooking.findFirst({ where: { id, centerId } });
  if (!booking) throw ApiError.notFound('Booking not found');

  if (!['PENDING', 'APPROVED', 'CANCELLED', 'COMPLETED'].includes(status)) {
    throw ApiError.badRequest('Invalid booking status');
  }

  const updated = await prisma.roomBooking.update({ where: { id }, data: { status } });
  await recordActivity({ userId: req.user!.id, action: 'updated_room_booking', entity: 'RoomBooking', entityId: id, details: status });

  return ok(res, updated, 'Booking updated');
});

export const deleteBooking = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const booking = await prisma.roomBooking.findFirst({ where: { id, centerId } });
  if (!booking) throw ApiError.notFound('Booking not found');

  await prisma.roomBooking.update({ where: { id }, data: { status: 'CANCELLED' } });
  await recordActivity({ userId: req.user!.id, action: 'cancelled_room_booking', entity: 'RoomBooking', entityId: id });

  return ok(res, { id }, 'Booking cancelled');
});
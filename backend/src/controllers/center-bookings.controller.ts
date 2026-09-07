import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timeOverlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = toMinutes(aStart) ?? 0;
  const ae = toMinutes(aEnd) ?? 0;
  const bs = toMinutes(bStart) ?? 0;
  const be = toMinutes(bEnd) ?? 0;
  return as < be && ae > bs;
}

export const getRoomSchedule = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { date, branchId } = req.query as { date?: string; branchId?: string };
  const now = new Date();
  const day = date
    ? new Date(`${date}T00:00:00.000Z`)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (Number.isNaN(day.getTime())) throw ApiError.badRequest('Invalid date');

  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const dow = dayStart.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const roomWhere: any = { centerId, status: 'ACTIVE' };
  if (branchId) roomWhere.locationId = branchId;

  const [rooms, scheduleBookings, pendingQueue] = await Promise.all([
    prisma.room.findMany({
      where: roomWhere,
      include: { location: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.roomBooking.findMany({
      where: {
        centerId,
        status: { in: ['PENDING', 'APPROVED', 'COMPLETED'] },
        ...(branchId ? { room: { locationId: branchId } } : {}),
        OR: [
          { recurrence: 'WEEKLY', dayOfWeek: dow },
          { recurrence: 'ONE_TIME', date: { gte: dayStart, lt: dayEnd } },
        ],
      },
      include: {
        room: { select: { name: true } },
        teacher: { include: { user: { select: { fullName: true } } } },
        group: { select: { name: true, stage: true, subject: { select: { name: true } } } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.roomBooking.findMany({
      where: {
        centerId,
        status: 'PENDING',
        ...(branchId ? { room: { locationId: branchId } } : {}),
      },
      include: {
        room: { select: { name: true } },
        teacher: { include: { user: { select: { fullName: true } } } },
        group: { select: { name: true, stage: true, subject: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const roomsData = rooms.map((room) => {
    const roomBookings = scheduleBookings.filter((b) => b.roomId === room.id);
    const active = roomBookings.filter((b) => b.status !== 'PENDING');

    const occurrences = roomBookings.map((b) => {
      const startMin = toMinutes(b.startTime) ?? 0;
      const endMin = toMinutes(b.endTime) ?? 0;
      let timelineStatus: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING' | 'PENDING' = b.status === 'PENDING' ? 'PENDING' : 'UPCOMING';
      if (b.status === 'APPROVED' || b.status === 'COMPLETED') {
        if (endMin <= currentMinutes) timelineStatus = 'COMPLETED';
        else if (startMin <= currentMinutes && endMin > currentMinutes) timelineStatus = 'IN_PROGRESS';
      }
      return {
        id: b.id,
        roomId: b.roomId,
        teacherId: b.teacherId,
        teacher: b.teacher?.user?.fullName || '—',
        subject: b.group?.subject?.name || b.group?.name || b.note || '—',
        grade: b.group?.stage || null,
        note: b.note,
        startTime: b.startTime,
        endTime: b.endTime,
        recurrence: b.recurrence,
        status: b.status,
        timelineStatus,
      };
    });

    const hasLive = occurrences.some((o) => o.timelineStatus === 'IN_PROGRESS');
    const hasPendingOccurrence = occurrences.some((o) => o.timelineStatus === 'PENDING');
    const liveOccurrence = occurrences.find((o) => o.timelineStatus === 'IN_PROGRESS');

    const nextActive = [...active]
      .filter((b) => (toMinutes(b.endTime) ?? 0) > currentMinutes)
      .sort((a, b) => (toMinutes(a.startTime) ?? 0) - (toMinutes(b.startTime) ?? 0))[0];

    const status = hasLive ? 'IN_PROGRESS' : hasPendingOccurrence ? 'PENDING_CONFIRM' : 'AVAILABLE';

    return {
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      status,
      availableUntil: status === 'AVAILABLE' && nextActive ? nextActive.startTime : null,
      ongoingUntil: status === 'IN_PROGRESS' && liveOccurrence ? liveOccurrence.endTime : null,
      bookingsCount: active.length,
      branch: room.location?.name || null,
      occurrences,
    };
  });

  return ok(res, {
    date: toDateKey(dayStart),
    rooms: roomsData,
    queue: pendingQueue.map((b) => ({
      id: b.id,
      roomId: b.roomId,
      room: b.room?.name || '—',
      teacherId: b.teacherId,
      teacher: b.teacher?.user?.fullName || '—',
      subject: b.group?.subject?.name || b.group?.name || b.note || null,
      note: b.note,
      date: b.date,
      dayOfWeek: b.dayOfWeek,
      startTime: b.startTime,
      endTime: b.endTime,
      recurrence: b.recurrence,
      createdAt: b.createdAt,
    })),
  });
});

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

  const room = await prisma.room.findFirst({ where: { id: roomId, centerId } });
  if (!room) throw ApiError.notFound('Room not found in this center');

  const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, centerId } });
  if (!teacher) throw ApiError.notFound('Teacher not found in this center');

  const dateObj = date ? new Date(date) : null;
  if (dateObj && Number.isNaN(dateObj.getTime())) throw ApiError.badRequest('Invalid date');
  const newDow = dayOfWeek !== undefined && dayOfWeek !== '' ? Number(dayOfWeek) : dateObj ? dateObj.getDay() : null;
  const newRecurrence = recurrence || 'ONE_TIME';

  const matchesDow = (b: { recurrence: string; date: Date | null; dayOfWeek: number | null }, dow: number | null): boolean => {
    if (dow === null) return false;
    if (b.recurrence === 'WEEKLY') return b.dayOfWeek === dow;
    return b.date ? b.date.getDay() === dow : false;
  };

  // Same-room + same-teacher booking conflicts (the queue is the single source
  // of manual room reservations, so a conflict blocks a duplicate slot).
  const [roomBookings, teacherBookings] = await Promise.all([
    prisma.roomBooking.findMany({
      where: { centerId, roomId, status: { not: 'CANCELLED' } },
      select: { recurrence: true, date: true, dayOfWeek: true, startTime: true, endTime: true },
    }),
    prisma.roomBooking.findMany({
      where: { centerId, teacherId, status: { not: 'CANCELLED' } },
      select: { recurrence: true, date: true, dayOfWeek: true, startTime: true, endTime: true },
    }),
  ]);

  if (newDow !== null) {
    const roomConflict = roomBookings.some((b) => matchesDow(b, newDow) && timeOverlaps(startTime, endTime, b.startTime, b.endTime));
    if (roomConflict) throw ApiError.conflict('Room already has a booking at this time slot');
    const teacherConflict = teacherBookings.some((b) => matchesDow(b, newDow) && timeOverlaps(startTime, endTime, b.startTime, b.endTime));
    if (teacherConflict) throw ApiError.conflict('Teacher already has a booking at this time slot');
  }

  // Also block slots already taken by scheduled lessons in the same room or by
  // the same teacher (rooms are shared between bookings and lessons).
  if (dateObj) {
    const dayStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const lessonConflicts = await prisma.lesson.findMany({
      where: {
        centerId,
        date: { gte: dayStart, lt: dayEnd },
        status: { not: 'CANCELLED' },
        OR: [{ roomId }, { teacherId }],
      },
      select: { id: true, startTime: true, endTime: true },
    });
    const lessonConflict = lessonConflicts.some((l) => timeOverlaps(startTime, endTime, l.startTime, l.endTime));
    if (lessonConflict) throw ApiError.conflict('Room or teacher already has a scheduled lesson at this time');
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
      recurrence: newRecurrence,
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
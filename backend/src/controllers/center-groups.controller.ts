import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

function slugify(value: string): string {
  const base = value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  return base || `group-${Date.now()}`;
}

const groupInclude = {
  teacher: { include: { user: { select: { fullName: true } } } },
  room: { select: { name: true } },
  branch: { select: { name: true } },
  subject: { select: { name: true } },
  enrollments: {
    where: { status: 'ACTIVE' },
    include: {
      student: {
        include: {
          user: { select: { fullName: true } },
          payments: { select: { id: true, amount: true } },
        },
      },
    },
  },
} satisfies Prisma.GroupInclude;

export const listGroups = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { teacherId, roomId, search, status } = req.query as Record<string, string | undefined>;

  const groups = await prisma.group.findMany({
    where: {
      ...(teacherId ? { teacherId } : {}),
      ...(roomId ? { roomId } : {}),
      ...(status ? { status: status as any } : {}),
      ...(search
        ? { OR: [{ name: { contains: search } }, { stage: { contains: search } }] }
        : {}),
    },
    include: groupInclude,
    orderBy: { createdAt: 'desc' },
  });

  return ok(
    res,
    groups.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      stage: g.stage,
      status: g.status,
      teacherId: g.teacherId,
      teacher: g.teacher?.user?.fullName || null,
      room: g.room?.name || null,
      roomId: g.roomId,
      branch: g.branch?.name || null,
      subject: g.subject?.name || null,
      dayOfWeek: g.dayOfWeek,
      startTime: g.startTime,
      endTime: g.endTime,
      capacity: g.capacity,
      studentCount: g.enrollments.length,
    })),
  );
});

export const getGroupSummary = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const [active, needsRoom, students, total] = await Promise.all([
    prisma.group.count({ where: { status: 'ACTIVE' } }),
    prisma.group.count({ where: { status: 'NEEDS_ROOM' } }),
    prisma.groupEnrollment.count({ where: { status: 'ACTIVE', group: { centerId } } }),
    prisma.group.count(),
  ]);

  return ok(res, {
    active,
    needsRoom,
    students,
    total,
  });
});

export const getGroupDetail = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { slug } = req.params;
  const group = await prisma.group.findFirst({
    where: { slug, centerId },
    include: {
      ...groupInclude,
      bookings: { include: { teacher: { include: { user: { select: { fullName: true } } } }, room: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
    },
  });

  if (!group) throw ApiError.notFound('Group not found');

  const latestAttendance = await prisma.attendance.groupBy({
    by: ['studentId'],
    where: { centerId, lesson: { centerId } },
    _max: { markedAt: true },
    orderBy: { _max: { markedAt: 'desc' } },
    take: 50,
  });

  const attendanceMap = new Map<string, Date>();
  latestAttendance.forEach((row) => {
    if (row._max.markedAt) attendanceMap.set(row.studentId, row._max.markedAt);
  });

  const students = group.enrollments.map((e) => {
    const totalPaid = e.student.payments.reduce((sum, p) => sum + p.amount, 0);
    const lastAttendance = attendanceMap.get(e.studentId) ?? null;
    return {
      id: e.studentId,
      name: e.student.user.fullName,
      enrolledAt: e.enrolledAt,
      status: e.status,
      totalPaid,
      financialStatus: totalPaid > 0 ? 'PAID' : 'NEEDS_MATCHING',
      lastAttendance,
    };
  });

  return ok(res, {
    id: group.id,
    name: group.name,
    slug: group.slug,
    stage: group.stage,
    status: group.status,
    capacity: group.capacity,
    dayOfWeek: group.dayOfWeek,
    startTime: group.startTime,
    endTime: group.endTime,
    notes: group.notes,
    teacherId: group.teacherId,
    teacher: group.teacher?.user?.fullName || null,
    room: group.room?.name || null,
    roomId: group.roomId,
    branch: group.branch?.name || null,
    subject: group.subject?.name || null,
    students,
    bookings: group.bookings.map((b) => ({
      id: b.id,
      teacher: b.teacher?.user?.fullName || null,
      room: b.room?.name || null,
      dayOfWeek: b.dayOfWeek,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
    })),
  });
});

export const createGroup = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { name, stage, teacherId, roomId, branchId, capacity, dayOfWeek, startTime, endTime, status, studentIds } = req.body ?? {};

  if (!name) throw ApiError.badRequest('Group name is required');

  const slug = slugify(name);
  const existing = await prisma.group.findFirst({ where: { centerId, name } });
  if (existing) throw ApiError.badRequest('A group with this name already exists');

  const group = await prisma.group.create({
    data: {
      centerId,
      name,
      slug,
      stage,
      teacherId: teacherId || null,
      roomId: roomId || null,
      branchId: branchId || null,
      capacity: capacity ? Number(capacity) : null,
      dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== '' ? Number(dayOfWeek) : null,
      startTime: startTime || null,
      endTime: endTime || null,
      status: status || 'ACTIVE',
    },
  });

  if (Array.isArray(studentIds) && studentIds.length > 0) {
    await prisma.groupEnrollment.createMany({
      data: studentIds.map((studentId: string) => ({ groupId: group.id, studentId })),
    });
  }

  await recordActivity({ userId: req.user!.id, action: 'created_group', entity: 'Group', entityId: group.id });

  return ok(res, group, 'Group created');
});

export const updateGroup = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const { name, stage, teacherId, roomId, branchId, capacity, dayOfWeek, startTime, endTime, status } = req.body ?? {};

  const group = await prisma.group.findFirst({ where: { id, centerId } });
  if (!group) throw ApiError.notFound('Group not found');

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (stage !== undefined) data.stage = stage;
  if (teacherId !== undefined) data.teacherId = teacherId || null;
  if (roomId !== undefined) data.roomId = roomId || null;
  if (branchId !== undefined) data.branchId = branchId || null;
  if (capacity !== undefined) data.capacity = capacity ? Number(capacity) : null;
  if (dayOfWeek !== undefined) data.dayOfWeek = dayOfWeek !== '' ? Number(dayOfWeek) : null;
  if (startTime !== undefined) data.startTime = startTime || null;
  if (endTime !== undefined) data.endTime = endTime || null;
  if (status !== undefined) data.status = status;

  if (name !== undefined && name !== group.name) {
    const slug = slugify(name);
    const taken = await prisma.group.findFirst({ where: { centerId, name, NOT: { id } } });
    if (taken) throw ApiError.badRequest('A group with this name already exists');
    data.slug = slug;
  }

  const updated = await prisma.group.update({ where: { id }, data });
  await recordActivity({ userId: req.user!.id, action: 'updated_group', entity: 'Group', entityId: id });

  return ok(res, updated, 'Group updated');
});

export const deleteGroup = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const group = await prisma.group.findFirst({ where: { id, centerId } });
  if (!group) throw ApiError.notFound('Group not found');

  await prisma.group.update({ where: { id }, data: { status: 'INACTIVE' } });
  await recordActivity({ userId: req.user!.id, action: 'deactivated_group', entity: 'Group', entityId: id });

  return ok(res, { id }, 'Group deactivated');
});

export const getGroupFormData = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const [teachers, rooms, branches, students] = await Promise.all([
    prisma.teacher.findMany({
      where: { centerId },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.room.findMany({ where: { centerId, status: 'ACTIVE' }, orderBy: { name: 'asc' } }),
    prisma.location.findMany({ where: { centerId }, orderBy: { name: 'asc' } }),
    prisma.student.findMany({
      where: { centerId },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return ok(res, {
    teachers: teachers.map((t) => ({ id: t.id, name: t.user.fullName })),
    rooms: rooms.map((r) => ({ id: r.id, name: r.name })),
    branches: branches.map((b) => ({ id: b.id, name: b.name })),
    students: students.map((s) => ({ id: s.id, name: s.user.fullName })),
  });
});

export const addGroupStudents = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const { studentIds } = req.body ?? {};
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw ApiError.badRequest('studentIds array is required');
  }

  const group = await prisma.group.findFirst({ where: { id, centerId } });
  if (!group) throw ApiError.notFound('Group not found');

  const rows = studentIds.map((studentId: string) => ({ groupId: id, studentId }));
  const existing = await prisma.groupEnrollment.findMany({
    where: { groupId: id, studentId: { in: studentIds } },
    select: { studentId: true },
  });
  const existingIds = new Set(existing.map((e) => e.studentId));
  await prisma.groupEnrollment.createMany({
    data: rows.filter((r) => !existingIds.has(r.studentId)),
  });

  await recordActivity({ userId: req.user!.id, action: 'added_group_students', entity: 'Group', entityId: id });

  return ok(res, { added: rows.length - existingIds.size, skipped: existingIds.size }, 'Students added to group');
});

export const removeGroupStudent = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id, studentId } = req.params;
  const group = await prisma.group.findFirst({ where: { id, centerId } });
  if (!group) throw ApiError.notFound('Group not found');

  await prisma.groupEnrollment.updateMany({
    where: { groupId: id, studentId },
    data: { status: 'INACTIVE' },
  });

  await recordActivity({ userId: req.user!.id, action: 'removed_group_student', entity: 'Group', entityId: id });

  return ok(res, { id, studentId }, 'Student removed from group');
});
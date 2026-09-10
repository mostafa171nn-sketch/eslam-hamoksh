import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { fileUrl, uploadRootPath } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

export const getCenterProfile = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const center = await prisma.center.findUnique({
    where: { id: centerId },
    include: {
      locations: {
        select: { id: true, name: true, address: true },
      },
      _count: {
        select: {
          teachers: true,
          students: true,
          users: {
            where: { role: { in: ['CENTER_EMPLOYEE', 'RECEPTIONIST', 'TEACHER_ASSISTANT'] } }
          },
          rooms: true,
        },
      },
    },
  });

  if (!center) {
    throw ApiError.notFound('Center not found');
  }

  const settings = await prisma.centerSettings.findUnique({
    where: { centerId },
  });

  const rawPhotos = ((center as any).photos as { url: string; isCover?: boolean }[] | null) ?? [];
  const photos = rawPhotos.map((p, i) => ({
    url: fileUrl(p.url),
    isCover: p.isCover ?? i === 0,
  }));
  const coverPhoto = photos.find(p => p.isCover) ?? photos[0] ?? null;

  return ok(res, {
    id: center.id,
    name: center.name,
    nameEn: center.nameEn,
    slug: center.slug,
    description: center.description,
    shortDescription: (center as any).shortDescription ?? null,
    published: (center as any).published ?? true,
    logoUrl: center.logoUrl,
    coverUrl: coverPhoto?.url ?? center.logoUrl,
    phone: center.phone,
    email: center.email,
    website: center.website,
    city: center.city,
    address: center.address,
    latitude: center.latitude,
    longitude: center.longitude,
    facebook: (center as any).facebook || null,
    instagram: (center as any).instagram || null,
    youtube: (center as any).youtube || null,
    linkedin: (center as any).linkedin || null,
    whatsapp: (center as any).whatsapp || null,
    workingHoursText: (center as any).workingHoursText ?? null,
    equipment: ((center as any).equipment as string[] | null) ?? [],
    photos,
    status: center.status,
    subscriptionStatus: center.subscriptionStatus,
    stats: {
      totalRooms: center._count.rooms,
    },
  });
});

export const updateCenterProfile = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const {
    name,
    nameEn,
    description,
    phone,
    email,
    website,
    city,
    address,
    latitude,
    longitude,
    facebook,
    instagram,
    youtube,
    linkedin,
    whatsapp,
    published,
    shortDescription,
    workingHoursText,
    equipment,
  } = req.body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (nameEn !== undefined) updateData.nameEn = nameEn;
  if (description !== undefined) updateData.description = description;
  if (shortDescription !== undefined) updateData.shortDescription = shortDescription;
  if (published !== undefined) updateData.published = published;
  if (workingHoursText !== undefined) updateData.workingHoursText = workingHoursText;
  if (equipment !== undefined) updateData.equipment = equipment;
  if (phone !== undefined) updateData.phone = phone;
  if (email !== undefined) updateData.email = email;
  if (website !== undefined) updateData.website = website;
  if (city !== undefined) updateData.city = city;
  if (address !== undefined) updateData.address = address;
  if (latitude !== undefined) updateData.latitude = latitude;
  if (longitude !== undefined) updateData.longitude = longitude;
  if (facebook !== undefined) (updateData as any).facebook = facebook;
  if (instagram !== undefined) (updateData as any).instagram = instagram;
  if (youtube !== undefined) (updateData as any).youtube = youtube;
  if (linkedin !== undefined) (updateData as any).linkedin = linkedin;
  if (whatsapp !== undefined) (updateData as any).whatsapp = whatsapp;

  const center = await prisma.center.update({
    where: { id: centerId },
    data: updateData,
  });

  return ok(res, center, 'Center profile updated');
});

export const uploadProfilePhoto = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();
  if (!req.file) throw ApiError.badRequest('No file uploaded');

  const center = await prisma.center.findUnique({ where: { id: centerId } });
  if (!center) throw ApiError.notFound('Center not found');

  const photos = ((center as any).photos as { url: string; isCover?: boolean }[] | null) ?? [];
  photos.push({ url: req.file.filename, isCover: photos.length === 0 });
  await prisma.center.update({ where: { id: centerId }, data: { photos } as any });

  const formatted = photos.map((p) => ({ url: fileUrl(p.url), isCover: p.isCover ?? false }));
  return ok(res, formatted, 'Photo uploaded');
});

export const setCoverPhoto = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();
  const index = parseInt(req.params.index, 10);
  const center = await prisma.center.findUnique({ where: { id: centerId } });
  if (!center) throw ApiError.notFound('Center not found');

  const photos = ((center as any).photos as { url: string; isCover?: boolean }[] | null) ?? [];
  if (isNaN(index) || index < 0 || index >= photos.length) {
    throw ApiError.badRequest('Invalid photo index');
  }

  photos.forEach((p, i) => { p.isCover = i === index; });
  await prisma.center.update({ where: { id: centerId }, data: { photos } as any });

  const formatted = photos.map((p) => ({ url: fileUrl(p.url), isCover: p.isCover ?? false }));
  return ok(res, formatted, 'Cover updated');
});

export const deleteProfilePhoto = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();
  const index = parseInt(req.params.index, 10);
  const center = await prisma.center.findUnique({ where: { id: centerId } });
  if (!center) throw ApiError.notFound('Center not found');

  const photos = ((center as any).photos as { url: string; isCover?: boolean }[] | null) ?? [];
  if (isNaN(index) || index < 0 || index >= photos.length) {
    throw ApiError.badRequest('Invalid photo index');
  }

  const removed = photos.splice(index, 1)[0];
  if (removed.isCover && photos.length) photos[0].isCover = true;

  try {
    const filename = removed.url.split('/').pop()!;
    await fs.unlink(path.join(uploadRootPath, filename));
  } catch {}

  await prisma.center.update({ where: { id: centerId }, data: { photos } as any });

  const formatted = photos.map((p) => ({ url: fileUrl(p.url), isCover: p.isCover ?? false }));
  return ok(res, formatted, 'Photo deleted');
});

export const getCenterDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const { branchId } = req.query as { branchId?: string };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const baseWhere: any = { centerId };
  if (branchId) baseWhere.locationId = branchId;

  const [
    totalStudents,
    totalTeachers,
    totalEmployees,
    totalBranches,
    totalRooms,
    todayLessons,
    completedLessons,
    upcomingLessons,
    cancelledLessons,
    todayAttendance,
    todayRevenue,
    pendingPayments,
    paidPayments,
    activeEnrollments,
  ] = await Promise.all([
    prisma.student.count({ where: baseWhere }),
    prisma.teacher.count({ where: baseWhere }),
    prisma.user.count({ where: { centerId, role: { in: ['CENTER_EMPLOYEE', 'RECEPTIONIST', 'TEACHER_ASSISTANT'] } } }),
    prisma.location.count({ where: { centerId } }),
    prisma.room.count({ where: { centerId, status: 'ACTIVE', ...(branchId ? { locationId: branchId } : {}) } }),
    prisma.lesson.count({
      where: {
        ...baseWhere,
        date: { gte: today, lt: tomorrow },
      },
    }),
    prisma.lesson.count({
      where: {
        ...baseWhere,
        date: { gte: today, lt: tomorrow },
        status: 'COMPLETED',
      },
    }),
    prisma.lesson.count({
      where: {
        ...baseWhere,
        date: { gte: today, lt: tomorrow },
        status: 'SCHEDULED',
      },
    }),
    prisma.lesson.count({
      where: {
        ...baseWhere,
        date: { gte: today, lt: tomorrow },
        status: 'CANCELLED',
      },
    }),
    prisma.attendance.groupBy({
      by: ['status'],
      where: {
        ...baseWhere,
        markedAt: { gte: today, lt: tomorrow },
      },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: {
        ...baseWhere,
        paidAt: { gte: today, lt: tomorrow },
        status: 'PAID',
      },
      _sum: { amount: true },
    }),
    prisma.payment.count({
      where: {
        ...baseWhere,
        status: 'PENDING',
      },
    }),
    prisma.payment.count({
      where: {
        ...baseWhere,
        status: 'PAID',
        paidAt: { gte: today, lt: tomorrow },
      },
    }),
    prisma.billingSubscription.count({
      where: {
        centerId,
        status: 'ACTIVE',
      },
    }),
  ]);

  const attendanceData = todayAttendance.reduce(
    (acc, curr) => {
      acc[curr.status] = curr._count;
      acc.total += curr._count;
      return acc;
    },
    { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: 0 }
  );

  return ok(res, {
    totalStudents,
    totalTeachers,
    totalEmployees,
    totalBranches,
    totalRooms,
    todayLessons,
    completedLessons,
    upcomingLessons,
    cancelledLessons,
    todayAttendance: {
      present: attendanceData.PRESENT,
      absent: attendanceData.ABSENT,
      late: attendanceData.LATE,
      excused: attendanceData.EXCUSED,
      total: attendanceData.total,
    },
    todayRevenue: todayRevenue._sum.amount || 0,
    pendingPayments,
    paidPayments,
    activeEnrollments,
    pendingEnrollments: 0,
  });
});

export const getTodayLessons = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const { branchId } = req.query as { branchId?: string };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateParam = req.query.date as string;
  if (dateParam) {
    today.setTime(new Date(dateParam).getTime());
    tomorrow.setTime(today.getTime() + 86400000);
  }

  const where: any = {
    centerId,
    date: { gte: today, lt: tomorrow },
  };
  if (branchId) where.locationId = branchId;

  const lessons = await prisma.lesson.findMany({
    where,
    include: {
      subject: { select: { name: true } },
      teacher: {
        include: { user: { select: { fullName: true } } },
      },
      room: { select: { name: true } },
      location: { select: { name: true } },
      enrollments: { where: { status: 'ENROLLED' } },
    },
    orderBy: { startTime: 'asc' },
  });

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const formattedLessons = lessons.map((lesson) => {
    let status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' = lesson.status as any;
    if (status === 'SCHEDULED' && lesson.startTime <= currentTime && lesson.endTime >= currentTime) {
      status = 'IN_PROGRESS';
    }
    return {
      id: lesson.id,
      subject: lesson.subject?.name || 'General',
      teacher: lesson.teacher.user.fullName,
      teacherId: lesson.teacher.id,
      grade: 'General',
      room: lesson.room?.name || lesson.location?.name || 'TBD',
      branch: lesson.location?.name || 'Main',
      date: lesson.date.toISOString(),
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      studentCount: lesson.capacity || 0,
      enrolledCount: lesson.enrollments.length,
      status,
    };
  });

  return ok(res, formattedLessons);
});

export const getCenterAlerts = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const alerts: any[] = [];

  const pendingPayments = await prisma.payment.count({
    where: { centerId, status: 'PENDING' },
  });
  if (pendingPayments > 0) {
    alerts.push({
      id: 'pending-payments',
      type: 'warning',
      title: 'Pending Payments',
      message: `There are ${pendingPayments} pending payments awaiting review`,
      actionUrl: '/center/payments',
    });
  }

  const overdueSubscriptions = await prisma.billingSubscription.count({
    where: { centerId, status: 'PAST_DUE' },
  });
  if (overdueSubscriptions > 0) {
    alerts.push({
      id: 'overdue-subscriptions',
      type: 'error',
      title: 'Overdue Subscriptions',
      message: `There are ${overdueSubscriptions} overdue subscriptions`,
      actionUrl: '/center/subscriptions',
    });
  }

  const pendingEnrollments = await prisma.billingSubscription.count({
    where: { centerId, status: 'PENDING' },
  });
  if (pendingEnrollments > 0) {
    alerts.push({
      id: 'pending-enrollments',
      type: 'info',
      title: 'Pending Enrollments',
      message: `There are ${pendingEnrollments} enrollments awaiting approval`,
      actionUrl: '/center/enrollments',
    });
  }

  return ok(res, alerts);
});

export const getScheduleLessons = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { date, view, branchId } = req.query as { date?: string; view?: string; branchId?: string };

  let startDate: Date;
  let endDate: Date;

  const baseDate = date ? new Date(date) : new Date();

  if (view === 'week') {
    startDate = new Date(baseDate);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
  } else if (view === 'month') {
    startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
  } else {
    startDate = new Date(baseDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  }

  const where: any = {
    centerId,
    date: { gte: startDate, lt: endDate },
  };
  if (branchId) where.locationId = branchId;

  const lessons = await prisma.lesson.findMany({
    where,
    include: {
      subject: { select: { name: true } },
      teacher: { include: { user: { select: { fullName: true } } } },
      room: { select: { name: true } },
      location: { select: { name: true } },
      enrollments: { where: { status: 'ENROLLED' } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const formatted = lessons.map((lesson) => {
    let status: string = lesson.status;
    if (status === 'SCHEDULED' && lesson.startTime <= currentTime && lesson.endTime >= currentTime) {
      status = 'IN_PROGRESS';
    }
    return {
      id: lesson.id,
      subject: lesson.subject?.name || 'General',
      teacher: lesson.teacher.user.fullName,
      teacherId: lesson.teacher.id,
      grade: 'General',
      room: lesson.room?.name || lesson.location?.name || 'TBD',
      branch: lesson.location?.name || 'Main',
      locationId: lesson.locationId,
      date: lesson.date.toISOString(),
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      studentCount: lesson.capacity || 0,
      enrolledCount: lesson.enrollments.length,
      status,
    };
  });

  return ok(res, formatted);
});

export const getScheduleStats = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayLessons, completedLessons, upcomingLessons, cancelledLessons] = await Promise.all([
    prisma.lesson.count({ where: { centerId, date: { gte: today, lt: tomorrow } } }),
    prisma.lesson.count({ where: { centerId, date: { gte: today, lt: tomorrow }, status: 'COMPLETED' } }),
    prisma.lesson.count({ where: { centerId, date: { gte: today, lt: tomorrow }, status: 'SCHEDULED' } }),
    prisma.lesson.count({ where: { centerId, date: { gte: today, lt: tomorrow }, status: 'CANCELLED' } }),
  ]);

  return ok(res, { todayLessons, completedLessons, upcomingLessons, cancelledLessons });
});

export const getScheduleFormData = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const [subjects, teachers, rooms, branches] = await Promise.all([
    prisma.subject.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.teacher.findMany({
      where: { centerId },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { user: { fullName: 'asc' } },
    }),
    prisma.room.findMany({
      where: { centerId, status: 'ACTIVE' },
      select: { id: true, name: true, capacity: true },
      orderBy: { name: 'asc' } }),
    prisma.location.findMany({
      where: { centerId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return ok(res, {
    subjects,
    teachers: teachers.map((t) => ({ id: t.id, userId: t.user.id, name: t.user.fullName })),
    rooms,
    branches,
  });
});

export const createCenterLesson = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { subjectId, teacherId, date, startTime, endTime, roomId, locationId, capacity, notes } = req.body;

  if (!teacherId || !date || !startTime || !endTime) {
    throw ApiError.badRequest('Missing required fields: teacherId, date, startTime, endTime');
  }

  const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, centerId } });
  if (!teacher) throw ApiError.notFound('Teacher not found in this center');

  if (roomId) {
    const room = await prisma.room.findFirst({ where: { id: roomId, centerId } });
    if (!room) throw ApiError.notFound('Room not found in this center');

    const conflict = await prisma.lesson.findFirst({
      where: {
        centerId,
        roomId,
        date: new Date(date),
        status: { not: 'CANCELLED' },
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } },
        ],
      },
    });
    if (conflict) throw ApiError.conflict('Room is already booked for this time slot');
  }

  const teacherConflict = await prisma.lesson.findFirst({
    where: {
      centerId,
      teacherId: teacher.id,
      date: new Date(date),
      status: { not: 'CANCELLED' },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });
  if (teacherConflict) throw ApiError.conflict('Teacher already has a lesson at this time');

  const lesson = await prisma.lesson.create({
    data: {
      centerId,
      teacherId: teacher.id,
      subjectId: subjectId || null,
      date: new Date(date),
      startTime,
      endTime,
      roomId: roomId || null,
      locationId: locationId || null,
      capacity: capacity || null,
      notes: notes || null,
      status: 'SCHEDULED',
    },
    include: {
      subject: { select: { name: true } },
      teacher: { include: { user: { select: { fullName: true } } } },
      room: { select: { name: true } },
      location: { select: { name: true } },
    },
  });

  return ok(res, {
    id: lesson.id,
    subject: lesson.subject?.name || 'General',
    teacher: lesson.teacher.user.fullName,
    room: lesson.room?.name || 'TBD',
    branch: lesson.location?.name || 'Main',
    date: lesson.date.toISOString(),
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    status: lesson.status,
  }, 'Lesson created');
});

export const updateCenterLesson = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const lesson = await prisma.lesson.findFirst({ where: { id, centerId } });
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const { subjectId, teacherId, date, startTime, endTime, roomId, locationId, capacity, notes } = req.body;
  const updateData: any = {};
  if (subjectId !== undefined) updateData.subjectId = subjectId;
  if (teacherId !== undefined) {
    const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, centerId } });
    if (!teacher) throw ApiError.notFound('Teacher not found');
    updateData.teacherId = teacher.id;
  }
  if (date !== undefined) updateData.date = new Date(date);
  if (startTime !== undefined) updateData.startTime = startTime;
  if (endTime !== undefined) updateData.endTime = endTime;
  if (roomId !== undefined) updateData.roomId = roomId || null;
  if (locationId !== undefined) updateData.locationId = locationId || null;
  if (capacity !== undefined) updateData.capacity = capacity;
  if (notes !== undefined) updateData.notes = notes;

  const updated = await prisma.lesson.update({ where: { id }, data: updateData });
  return ok(res, updated, 'Lesson updated');
});

export const cancelCenterLesson = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const lesson = await prisma.lesson.findFirst({ where: { id, centerId } });
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const updated = await prisma.lesson.update({ where: { id }, data: { status: 'CANCELLED' } });
  return ok(res, { id: updated.id, status: updated.status }, 'Lesson cancelled');
});

export const getCenterBranches = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const branches = await prisma.location.findMany({
    where: { centerId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return ok(res, branches);
});

const PORTAL_PAGE_KEYS = [
  'dashboard',
  'rooms',
  'teachers',
  'groups',
  'students',
  'employees',
  'finance',
  'transport',
  'communications',
  'broadcast',
  'reports',
  'profile',
  'settings',
] as const;

const BASIC_PORTAL_PAGE_KEYS = new Set(['dashboard', 'settings']);

const DEFAULT_NAV_ORDER = [...PORTAL_PAGE_KEYS];

const DEFAULT_ESCALATION = {
  highAfter: '2h',
  normalAfter: '24h',
  complaintResolveAfter: '4d',
} as const;

const ESCALATION_OPTIONS = {
  highAfter: new Set(['1h', '2h', '4h']),
  normalAfter: new Set(['12h', '24h', '48h']),
  complaintResolveAfter: new Set(['1d', '2d', '4d', '7d']),
} as const;

const COMPARISON_MODES = new Set(['LAST_MONTH', 'SAME_MONTH_LAST_YEAR', 'TARGET']);

function sanitizeNavOrder(value: unknown): string[] {
  if (!Array.isArray(value)) throw ApiError.badRequest('navigation order must be an array', 'INVALID_NAV_ORDER');
  const allowed = new Set<string>(PORTAL_PAGE_KEYS);
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const key of value) {
    if (typeof key !== 'string' || !allowed.has(key) || seen.has(key)) continue;
    seen.add(key);
    clean.push(key);
  }
  for (const key of PORTAL_PAGE_KEYS) {
    if (!seen.has(key)) clean.push(key);
  }
  return clean;
}

function sanitizeHiddenPages(value: unknown): string[] {
  if (!Array.isArray(value)) throw ApiError.badRequest('hidden pages must be an array', 'INVALID_HIDDEN_PAGES');
  const allowed = new Set<string>(PORTAL_PAGE_KEYS);
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const key of value) {
    if (typeof key !== 'string' || !allowed.has(key) || BASIC_PORTAL_PAGE_KEYS.has(key) || seen.has(key)) continue;
    seen.add(key);
    clean.push(key);
  }
  return clean;
}

function sanitizeEscalation(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') throw ApiError.badRequest('escalation must be an object', 'INVALID_ESCALATION');
  const input = value as Record<string, unknown>;
  const pick = (key: string, fallback: string, allowed: Set<string>): string => {
    const v = input[key];
    if (v === undefined || v === null) return fallback;
    if (typeof v !== 'string' || !allowed.has(v)) {
      throw ApiError.badRequest(`invalid escalation value: ${key}`, 'INVALID_ESCALATION');
    }
    return v;
  };
  return {
    highAfter: pick('highAfter', '2h', ESCALATION_OPTIONS.highAfter),
    normalAfter: pick('normalAfter', '24h', ESCALATION_OPTIONS.normalAfter),
    complaintResolveAfter: pick('complaintResolveAfter', '4d', ESCALATION_OPTIONS.complaintResolveAfter),
  };
}

export const getCenterSettings = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const settings = await prisma.centerSettings.findUnique({ where: { centerId } });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [auditRecentCount] = await Promise.all([
    prisma.activityLog.count({ where: { createdAt: { gte: todayStart } } }),
  ]);

  return ok(res, {
    name: settings?.name ?? 'Center',
    timezone: settings?.timezone ?? 'Africa/Cairo',
    currency: settings?.currency ?? 'EGP',
    radiusMeters: settings?.radiusMeters ?? 100,
    attendanceGraceMinutes: settings?.attendanceGraceMinutes ?? 10,
    navOrder: Array.isArray(settings?.navOrder) ? settings!.navOrder : DEFAULT_NAV_ORDER,
    hiddenPages: Array.isArray(settings?.hiddenPages) ? settings!.hiddenPages : [],
    escalation: settings?.escalation && typeof settings.escalation === 'object' ? settings.escalation : DEFAULT_ESCALATION,
    comparisonMode: settings?.comparisonMode ?? 'LAST_MONTH',
    auditRecentCount,
  });
});

export const updateCenterSettings = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { timezone, currency, radiusMeters, attendanceGraceMinutes, name } = req.body;

  const updateData: Record<string, unknown> = {};
  if (timezone !== undefined) updateData.timezone = timezone;
  if (currency !== undefined) updateData.currency = currency;
  if (radiusMeters !== undefined) updateData.radiusMeters = radiusMeters;
  if (attendanceGraceMinutes !== undefined) updateData.attendanceGraceMinutes = attendanceGraceMinutes;
  if (name !== undefined) updateData.name = name;

  if (req.body.navOrder !== undefined) updateData.navOrder = sanitizeNavOrder(req.body.navOrder);
  if (req.body.hiddenPages !== undefined) updateData.hiddenPages = sanitizeHiddenPages(req.body.hiddenPages);
  if (req.body.escalation !== undefined) updateData.escalation = sanitizeEscalation(req.body.escalation);
  if (req.body.comparisonMode !== undefined) {
    const mode = req.body.comparisonMode;
    if (typeof mode !== 'string' || !COMPARISON_MODES.has(mode)) {
      throw ApiError.badRequest('invalid comparison mode', 'INVALID_COMPARISON_MODE');
    }
    updateData.comparisonMode = mode;
  }

  const settings = await prisma.centerSettings.upsert({
    where: { centerId },
    update: updateData,
    create: { centerId, ...updateData },
  });

  await recordActivity({
    userId: req.user?.id,
    role: req.user?.role,
    action: 'settings_changed',
    entity: 'CenterSettings',
    details: Object.keys(updateData).join(', ') || 'no changes',
    category: 'SETTINGS',
    result: 'SUCCESS',
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const auditRecentCount = await prisma.activityLog.count({ where: { createdAt: { gte: todayStart } } });

  return ok(res, {
    name: settings.name,
    timezone: settings.timezone,
    currency: settings.currency,
    radiusMeters: settings.radiusMeters,
    attendanceGraceMinutes: settings.attendanceGraceMinutes,
    navOrder: Array.isArray(settings.navOrder) ? settings.navOrder : DEFAULT_NAV_ORDER,
    hiddenPages: Array.isArray(settings.hiddenPages) ? settings.hiddenPages : [],
    escalation: settings.escalation && typeof settings.escalation === 'object' ? settings.escalation : DEFAULT_ESCALATION,
    comparisonMode: settings.comparisonMode ?? 'LAST_MONTH',
    auditRecentCount,
  }, 'Settings saved');
});

export const getCenterAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const category = typeof req.query.category === 'string' ? req.query.category : 'ALL';
  const result = typeof req.query.result === 'string' ? req.query.result : 'ALL';
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit ?? '15'), 10) || 15));

  const where: Record<string, unknown> = {};
  if (category && category !== 'ALL') where.category = category;
  if (result && result !== 'ALL') where.result = result;
  if (q) {
    where.OR = [
      { action: { contains: q, mode: 'insensitive' } },
      { details: { contains: q, mode: 'insensitive' } },
      { user: { fullName: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, fullName: true } } },
    }),
    prisma.activityLog.count({ where }),
  ]);

  const rows = items.map((log) => ({
    id: log.id,
    time: log.createdAt.toISOString(),
    action: log.action,
    category: log.category,
    target: log.entity,
    entityId: log.entityId,
    details: log.details ?? '',
    actorName: log.user?.fullName ?? '',
    actorRole: log.role ?? '',
    result: log.result,
  }));

  return ok(res, rows, 'Audit log loaded', {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  // Guard against CSV formula injection in spreadsheet apps.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export const exportCenterAuditLogCsv = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const category = typeof req.query.category === 'string' ? req.query.category : 'ALL';
  const result = typeof req.query.result === 'string' ? req.query.result : 'ALL';

  const where: Record<string, unknown> = {};
  if (category && category !== 'ALL') where.category = category;
  if (result && result !== 'ALL') where.result = result;
  if (q) {
    where.OR = [
      { action: { contains: q, mode: 'insensitive' } },
      { details: { contains: q, mode: 'insensitive' } },
      { user: { fullName: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const items = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 5000,
    include: { user: { select: { fullName: true } } },
  });

  const header = ['time', 'action', 'category', 'target', 'details', 'actor', 'role', 'result'];
  const lines = items.map((log) =>
    [
      log.createdAt.toISOString(),
      log.action,
      log.category,
      log.entity,
      log.details ?? '',
      log.user?.fullName ?? '',
      log.role ?? '',
      log.result,
    ]
      .map(csvCell)
      .join(','),
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
  res.send([header.map(csvCell).join(','), ...lines].join('\n'));
});

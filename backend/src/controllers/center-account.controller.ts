import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { fileUrl } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';

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

  return ok(res, {
    id: center.id,
    name: center.name,
    nameEn: center.nameEn,
    slug: center.slug,
    description: center.description,
    logoUrl: center.logoUrl,
    coverUrl: null,
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
    status: center.status,
    subscriptionStatus: center.subscriptionStatus,
    workingHours: settings ? {
      sunday: { open: '09:00', close: '21:00', closed: false },
      monday: { open: '09:00', close: '21:00', closed: false },
      tuesday: { open: '09:00', close: '21:00', closed: false },
      wednesday: { open: '09:00', close: '21:00', closed: false },
      thursday: { open: '09:00', close: '21:00', closed: false },
      friday: { open: '09:00', close: '21:00', closed: false },
      saturday: { open: '09:00', close: '21:00', closed: false },
    } : null,
    stats: {
      totalTeachers: center._count.teachers,
      totalStudents: center._count.students,
      totalEmployees: center._count.users,
      totalBranches: center.locations.length,
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
    workingHours,
  } = req.body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (nameEn !== undefined) updateData.nameEn = nameEn;
  if (description !== undefined) updateData.description = description;
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

export const getCenterDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

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
    prisma.student.count({ where: { centerId } }),
    prisma.teacher.count({ where: { centerId } }),
    prisma.user.count({ where: { centerId, role: { in: ['CENTER_EMPLOYEE', 'RECEPTIONIST', 'TEACHER_ASSISTANT'] } } }),
    prisma.location.count({ where: { centerId } }),
    prisma.room.count({ where: { centerId, status: 'ACTIVE' } }),
    prisma.lesson.count({
      where: {
        centerId,
        date: { gte: today, lt: tomorrow },
      },
    }),
    prisma.lesson.count({
      where: {
        centerId,
        date: { gte: today, lt: tomorrow },
        status: 'COMPLETED',
      },
    }),
    prisma.lesson.count({
      where: {
        centerId,
        date: { gte: today, lt: tomorrow },
        status: 'SCHEDULED',
      },
    }),
    prisma.lesson.count({
      where: {
        centerId,
        date: { gte: today, lt: tomorrow },
        status: 'CANCELLED',
      },
    }),
    prisma.attendance.groupBy({
      by: ['status'],
      where: {
        centerId,
        markedAt: { gte: today, lt: tomorrow },
      },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: {
        centerId,
        paidAt: { gte: today, lt: tomorrow },
        status: 'PAID',
      },
      _sum: { amount: true },
    }),
    prisma.payment.count({
      where: {
        centerId,
        status: 'PENDING',
      },
    }),
    prisma.payment.count({
      where: {
        centerId,
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateParam = req.query.date as string;
  if (dateParam) {
    today.setTime(new Date(dateParam).getTime());
    tomorrow.setTime(today.getTime() + 86400000);
  }

  const lessons = await prisma.lesson.findMany({
    where: {
      centerId,
      date: { gte: today, lt: tomorrow },
    },
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

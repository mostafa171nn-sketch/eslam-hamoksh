import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { fileUrl } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';
import { hashPassword } from '../utils/password';
import { assertWithinPlanLimit } from '../services/subscription.service';

// Derive the teacher's agreement with the center from their real payment
// settings. No invented commission-percent field exists in the data model, so
// the agreement is represented honestly from the stored rent/pricing settings.
function deriveAgreement(paymentSettings: {
  sessionEnabled: boolean;
  monthlyEnabled: boolean;
  sessionPrice: number;
  monthlyPrice: number;
} | null, hourlyRate: number) {
  const monthly =
    paymentSettings?.monthlyEnabled && (paymentSettings?.monthlyPrice ?? 0) > 0
      ? { type: 'monthly', amount: paymentSettings.monthlyPrice }
      : null;
  const session =
    paymentSettings?.sessionEnabled && (paymentSettings?.sessionPrice ?? 0) > 0
      ? { type: 'session', amount: paymentSettings.sessionPrice }
      : null;
  return monthly ?? session ?? { type: 'session', amount: hourlyRate };
}

export const listCenterTeachers = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const {
    search,
    status,
    subject,
    grade,
    branchId,
    page = 1,
    limit = 20,
  } = req.query as any;

  const where: any = { centerId };
  if (subject) {
    where.subjects = { some: { subjectId: subject } };
  }
  if (grade) {
    where.grades = { some: { gradeId: grade } };
  }
  if (branchId) {
    where.locationId = branchId;
  }

  let teachers = await prisma.teacher.findMany({
    where,
    include: {
      user: { select: { id: true, fullName: true, username: true, phone: true, email: true, photo: true, status: true } },
      subjects: { include: { subject: { select: { name: true } } } },
      grades: { include: { grade: { select: { name: true } } } },
      location: { select: { name: true } },
      ratings: { select: { stars: true } },
      paymentSettings: { select: { sessionEnabled: true, monthlyEnabled: true, sessionPrice: true, monthlyPrice: true } },
    },
  });

  // Apply filters in memory (after fetching) due to Prisma limitations
  if (search) {
    const searchLower = String(search).toLowerCase();
    teachers = teachers.filter(t =>
      t.user.fullName.toLowerCase().includes(searchLower) ||
      t.user.username.toLowerCase().includes(searchLower) ||
      (t.user.phone && t.user.phone.includes(String(search))) ||
      t.subjects.some(s => s.subject.name.toLowerCase().includes(searchLower))
    );
  }
  if (status) {
    teachers = teachers.filter(t => t.user.status === status);
  }

  const total = teachers.length;
  const skip = (Number(page) - 1) * Number(limit);
  const paginatedTeachers = teachers.slice(skip, skip + Number(limit));

  const items = await Promise.all(
    paginatedTeachers.map(async (t) => {
      const [studentCount, lessonCount, groupCount, pendingBookings, openSettlements] = await Promise.all([
        prisma.teacherStudent.count({ where: { teacherId: t.id } }),
        prisma.lesson.count({ where: { teacherId: t.id } }),
        prisma.group.count({ where: { teacherId: t.id, status: { in: ['ACTIVE', 'NEEDS_ROOM'] } } }),
        prisma.roomBooking.count({ where: { teacherId: t.id, status: 'PENDING' } }),
        prisma.settlement.count({ where: { teacherId: t.id, status: { in: ['PENDING', 'CALCULATED'] } } }),
      ]);

      const ratingCount = t.ratings.length;
      const averageRating = ratingCount > 0
        ? t.ratings.reduce((s, r) => s + r.stars, 0) / ratingCount
        : 0;

      const agreement = deriveAgreement(t.paymentSettings, t.hourlyRate);
      const needsAction = pendingBookings > 0 || openSettlements > 0;

      return {
        id: t.id,
        userId: t.user.id,
        fullName: t.user.fullName,
        username: t.user.username,
        phone: t.user.phone,
        email: t.user.email,
        photo: fileUrl(t.user.photo),
        status: t.user.status,
        bio: t.bio,
        yearsExperience: t.yearsExperience,
        hourlyRate: t.hourlyRate,
        createdAt: t.createdAt.toISOString(),
        subjects: t.subjects.map(s => s.subject.name),
        grades: t.grades.map(g => g.grade.name),
        branch: t.location?.name || null,
        location: t.location?.name || null,
        studentCount,
        lessonCount,
        groupCount,
        pendingBookings,
        openSettlements,
        needsAction,
        agreement,
        rating: Number(averageRating.toFixed(1)),
        ratingCount,
      };
    })
  );

  return ok(res, items, 'Teachers loaded', {
    page: Number(page),
    limit: Number(limit),
    total,
    totalPages: Math.ceil(total / Number(limit)),
  });
});

// Aggregated counts for the teachers page queue cards and tabs:
//   - roomRequests: pending room bookings (excluding expired, which we compute as
//     pending one-time bookings whose date has passed)
//   - settlementsDue: settlements needing center decision (PENDING/CALCULATED)
//   - teachersNeedingAction: teachers with any pending booking or open settlement
export const getCenterTeacherQueue = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const now = new Date();

  const [pendingBookings, overdueBookings, settlements, needsActionTeachers] = await Promise.all([
    prisma.roomBooking.findMany({
      where: { centerId, status: 'PENDING' },
      include: {
        teacher: { include: { user: { select: { fullName: true } }, subjects: { include: { subject: { select: { name: true } } } } } },
        room: { select: { name: true } },
        group: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 60,
    }),
    prisma.roomBooking.count({
      where: {
        centerId,
        status: 'PENDING',
        recurrence: 'ONE_TIME',
        date: { lt: now },
      },
    }),
    prisma.settlement.findMany({
      where: { centerId, status: { in: ['PENDING', 'CALCULATED'] } },
      include: { teacher: { include: { user: { select: { fullName: true } } } } },
      orderBy: { createdAt: 'asc' },
      take: 60,
    }),
    prisma.teacher.findMany({
      where: {
        centerId,
        user: { status: 'ACTIVE' },
        OR: [
          { bookings: { some: { status: 'PENDING' } } },
          { settlements: { some: { status: { in: ['PENDING', 'CALCULATED'] } } } },
        ],
      },
      include: {
        user: { select: { id: true, fullName: true, status: true } },
        subjects: { include: { subject: { select: { name: true } } } },
        paymentSettings: { select: { sessionEnabled: true, monthlyEnabled: true, sessionPrice: true, monthlyPrice: true } },
        _count: {
          select: {
            bookings: { where: { status: 'PENDING' } },
            settlements: { where: { status: { in: ['PENDING', 'CALCULATED'] } } },
            students: true,
            groups: { where: { status: { in: ['ACTIVE', 'NEEDS_ROOM'] } } },
          },
        },
      },
      orderBy: { user: { fullName: 'asc' } },
      take: 60,
    }),
  ]);

  return ok(res, {
    roomRequests: pendingBookings.map((b) => ({
      id: b.id,
      room: b.room.name,
      teacherId: b.teacherId,
      teacher: b.teacher.user.fullName,
      subject: b.teacher.subjects[0]?.subject.name ?? null,
      group: b.group?.name ?? null,
      note: b.note,
      dayOfWeek: b.dayOfWeek,
      date: b.date ? b.date.toISOString() : null,
      startTime: b.startTime,
      endTime: b.endTime,
      recurrence: b.recurrence,
      createdAt: b.createdAt.toISOString(),
    })),
    overdueRoomRequests: overdueBookings,
    settlementsDue: settlements.map((s) => ({
      id: s.id,
      teacherId: s.teacherId,
      teacher: s.teacher.user.fullName,
      period: s.period,
      status: s.status,
      grossAmount: s.grossAmount / 100,
      teacherShare: s.teacherShare / 100,
      centerShare: s.centerShare / 100,
      createdAt: s.createdAt.toISOString(),
    })),
    teachersNeedingAction: needsActionTeachers.map((t) => ({
      id: t.id,
      userId: t.user.id,
      fullName: t.user.fullName,
      status: t.user.status,
      subjects: t.subjects.map((s) => s.subject.name),
      agreement: deriveAgreement(t.paymentSettings, t.hourlyRate),
      pendingActions: t._count.bookings + t._count.settlements,
      pendingBookings: t._count.bookings,
      openSettlements: t._count.settlements,
      studentCount: t._count.students,
      groupCount: t._count.groups,
    })),
  });
});

export const getCenterTeachersStats = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const [totalTeachers, totalStudents, totalLessons, ratings] = await Promise.all([
    prisma.teacher.count({ where: { centerId } }),
    prisma.student.count({ where: { centerId } }),
    prisma.lesson.count({ where: { centerId } }),
    prisma.rating.findMany({
      where: { teacher: { centerId } },
      select: { stars: true },
    }),
  ]);

  const activeTeachers = await prisma.teacher.count({
    where: { centerId, user: { status: 'ACTIVE' } },
  });

  const averageRating = ratings.length > 0
    ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length
    : 0;

  return ok(res, {
    totalTeachers,
    activeTeachers,
    totalStudents,
    totalLessons,
    averageRating,
  });
});

export const getCenterTeacher = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;
  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true, username: true, phone: true, email: true, photo: true, status: true } },
      subjects: { include: { subject: { select: { id: true, name: true } } } },
      grades: { include: { grade: { select: { id: true, name: true } } } },
      location: { select: { id: true, name: true } },
      ratings: { select: { stars: true, comment: true, createdAt: true } },
      paymentSettings: { select: { sessionEnabled: true, monthlyEnabled: true, sessionPrice: true, monthlyPrice: true, vodafoneCash: true, instaPay: true } },
    },
  });
  if (!teacher || teacher.centerId !== centerId) {
    throw ApiError.notFound('Teacher not found');
  }

  const now = new Date();

  const [groups, bookings, payments, settlements, conversations, complaints, activity, students] = await Promise.all([
    prisma.group.findMany({
      where: { teacherId: id, status: { in: ['ACTIVE', 'NEEDS_ROOM'] } },
      include: {
        room: { select: { name: true } },
        subject: { select: { name: true } },
        _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.roomBooking.findMany({
      where: { teacherId: id },
      include: {
        room: { select: { name: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.payment.findMany({
      where: { teacherId: id },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.settlement.findMany({
      where: { teacherId: id },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.conversation.findMany({
      where: { teacherId: id },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 40,
    }),
    prisma.complaint.findMany({
      where: { centerId, source: 'TEACHER' },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.activityLog.findMany({
      where: { centerId, entity: 'Teacher', entityId: id },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.student.findMany({
      where: { centerId, teachers: { some: { teacherId: id } } },
      include: { user: { select: { fullName: true } }, grade: { select: { name: true } } },
      orderBy: { user: { fullName: 'asc' } },
    }),
  ]);

  const studentIds = students.map((s) => s.id);

  return ok(res, {
    ...teacher,
    photo: fileUrl(teacher.user.photo),
    agreement: deriveAgreement(teacher.paymentSettings, teacher.hourlyRate),
    createdAt: teacher.createdAt.toISOString(),
    stats: {
      activeBookings: bookings.filter((b) => b.status === 'APPROVED').length,
      groups: groups.length,
      students: studentIds.length,
      dueSettlement: settlements
        .filter((s) => s.status === 'PENDING' || s.status === 'CALCULATED')
        .reduce((sum, s) => sum + s.teacherShare, 0) / 100,
    },
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      room: g.room?.name ?? null,
      subject: g.subject?.name ?? null,
      dayOfWeek: g.dayOfWeek,
      startTime: g.startTime,
      endTime: g.endTime,
      capacity: g.capacity,
      studentCount: g._count.enrollments,
    })),
    bookings: bookings.map((b) => ({
      id: b.id,
      room: b.room.name,
      group: b.group?.name ?? null,
      date: b.date ? b.date.toISOString() : null,
      dayOfWeek: b.dayOfWeek,
      startTime: b.startTime,
      endTime: b.endTime,
      recurrence: b.recurrence,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
    })),
    payments: payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      student: p.student.user.fullName,
      amount: p.amount / 100,
      type: p.type,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
    settlements: settlements.map((s) => ({
      id: s.id,
      period: s.period,
      status: s.status,
      grossAmount: s.grossAmount / 100,
      platformCommission: s.platformCommission / 100,
      teacherShare: s.teacherShare / 100,
      centerShare: s.centerShare / 100,
      netAmount: s.netAmount / 100,
      settledAt: s.settledAt ? s.settledAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
    })),
    conversations: conversations.map((c) => ({
      id: c.id,
      student: c.student.user.fullName,
      updatedAt: c.updatedAt.toISOString(),
      messages: c.messages.map((m) => ({
        id: m.id,
        senderRole: m.senderRole,
        body: m.body,
        read: m.read,
        createdAt: m.createdAt.toISOString(),
      })),
    })),
    complaints: complaints.map((c) => ({
      id: c.id,
      code: c.code,
      subject: c.subject,
      description: c.description,
      severity: c.severity,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    })),
    activity: activity.map((a) => ({
      id: a.id,
      action: a.action,
      details: a.details,
      user: a.user?.fullName ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    students: students.map((s) => ({
      id: s.id,
      fullName: s.user.fullName,
      grade: s.grade?.name ?? null,
    })),
  });
});

export const createCenterTeacher = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { fullName, phone, subjectIds, gradeIds, agreementType, sessionPrice, branchId } = req.body ?? {};

  if (!fullName || !fullName.trim()) {
    throw ApiError.badRequest('Teacher name is required');
  }

  await assertWithinPlanLimit(centerId, 'teachers');

  // Build a unique username + default password from the phone/full name.
  const base = (fullName as string)
    .trim()
    .replace(/\s+/g, '.')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
  const stem = base || 'teacher';
  let username = `${stem}.${centerId.slice(0, 4)}`;
  let counter = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${stem}.${centerId.slice(0, 4)}${counter++}`;
  }
  const defaultPassword = phone && String(phone).replace(/\s+/g, '') ? String(phone).replace(/\s+/g, '') : `Maarej@${Math.floor(Math.random() * 100000)}`;
  const passwordHash = await hashPassword(defaultPassword);

  const user = await prisma.user.create({
    data: {
      fullName: fullName.trim(),
      username,
      passwordHash,
      phone: phone || null,
      role: 'TEACHER',
      status: 'ACTIVE',
      centerId,
    },
  });

  const teacher = await prisma.teacher.create({
    data: {
      userId: user.id,
      centerId,
      locationId: branchId || null,
      hourlyRate: Number(sessionPrice) || 0,
    },
  });

  if (Array.isArray(subjectIds) && subjectIds.length > 0) {
    await prisma.teacherSubject.createMany({
      data: subjectIds.map((subjectId: string) => ({ teacherId: teacher.id, subjectId })),
    });
  }
  if (Array.isArray(gradeIds) && gradeIds.length > 0) {
    await prisma.teacherGrade.createMany({
      data: gradeIds.map((gradeId: string) => ({ teacherId: teacher.id, gradeId })),
    });
  }

  // Persist the agreement (session vs monthly rent) in payment settings.
  await prisma.teacherPaymentSettings.upsert({
    where: { teacherId: teacher.id },
    create: {
      teacherId: teacher.id,
      sessionEnabled: agreementType !== 'monthly',
      monthlyEnabled: agreementType === 'monthly',
      sessionPrice: agreementType === 'monthly' ? 0 : Number(sessionPrice) || 0,
      monthlyPrice: agreementType === 'monthly' ? Number(sessionPrice) || 0 : 0,
    },
    update: {
      sessionEnabled: agreementType !== 'monthly',
      monthlyEnabled: agreementType === 'monthly',
      sessionPrice: agreementType === 'monthly' ? 0 : Number(sessionPrice) || 0,
      monthlyPrice: agreementType === 'monthly' ? Number(sessionPrice) || 0 : 0,
    },
  });

  await recordActivity({
    userId: req.user!.id,
    action: 'created_teacher',
    entity: 'Teacher',
    entityId: teacher.id,
    details: JSON.stringify({ username }),
  });

  return ok(res, {
    id: teacher.id,
    userId: user.id,
    fullName: user.fullName,
    username,
  }, 'Teacher created');
});

export const updateCenterTeacher = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;
  const { fullName, phone, email, bio, yearsExperience, hourlyRate, subjectIds, gradeIds, branchId } = req.body;

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!teacher || teacher.centerId !== centerId) {
    throw ApiError.notFound('Teacher not found');
  }

  // Update user fields
  const userUpdate: any = {};
  if (fullName !== undefined) userUpdate.fullName = fullName;
  if (phone !== undefined) userUpdate.phone = phone;
  if (email !== undefined) userUpdate.email = email;

  if (Object.keys(userUpdate).length > 0) {
    await prisma.user.update({
      where: { id: teacher.userId },
      data: userUpdate,
    });
  }

  // Update teacher fields
  const teacherUpdate: any = {};
  if (bio !== undefined) teacherUpdate.bio = bio;
  if (yearsExperience !== undefined) teacherUpdate.yearsExperience = Number(yearsExperience);
  if (hourlyRate !== undefined) teacherUpdate.hourlyRate = Number(hourlyRate);
  if (branchId !== undefined) teacherUpdate.locationId = branchId;

  if (Object.keys(teacherUpdate).length > 0) {
    await prisma.teacher.update({
      where: { id },
      data: teacherUpdate,
    });
  }

  // Update subjects
  if (subjectIds !== undefined && Array.isArray(subjectIds)) {
    await prisma.teacherSubject.deleteMany({ where: { teacherId: id } });
    if (subjectIds.length > 0) {
      await prisma.teacherSubject.createMany({
        data: subjectIds.map((subjectId: string) => ({ teacherId: id, subjectId })),
        skipDuplicates: true,
      });
    }
  }

  // Update grades
  if (gradeIds !== undefined && Array.isArray(gradeIds)) {
    await prisma.teacherGrade.deleteMany({ where: { teacherId: id } });
    if (gradeIds.length > 0) {
      await prisma.teacherGrade.createMany({
        data: gradeIds.map((gradeId: string) => ({ teacherId: id, gradeId })),
        skipDuplicates: true,
      });
    }
  }

  await recordActivity({
    userId: req.user!.id,
    action: 'updated_teacher',
    entity: 'Teacher',
    entityId: id,
  });

  return ok(res, { id }, 'Teacher updated');
});

export const setCenterTeacherStatus = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;
  const { status } = req.body;

  const teacher = await prisma.teacher.findUnique({ where: { id }, include: { user: true } });
  if (!teacher || teacher.centerId !== centerId) {
    throw ApiError.notFound('Teacher not found');
  }

  await prisma.user.update({
    where: { id: teacher.userId },
    data: { status },
  });

  await recordActivity({
    userId: req.user!.id,
    action: `set_teacher_status_${status.toLowerCase()}`,
    entity: 'Teacher',
    entityId: id,
  });

  return ok(res, { id, status }, 'Teacher status updated');
});

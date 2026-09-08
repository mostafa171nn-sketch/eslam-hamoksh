import type { Request, Response } from 'express';
import { Role, AccountStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { fileUrl } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

// Map the generic account status onto the enrollment status shown in the center
// file (active / frozen / pending). There is no separate FROZEN account enum, so
// a frozen registration is represented honestly by toggling the account to
// INACTIVE and reported back as FROZEN for the UI.
function enrollmentStatus(accountStatus: string): string {
  switch (accountStatus) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'PENDING':
      return 'PENDING';
    default:
      return 'FROZEN';
  }
}

// Financial status for the student list/header. Derived from the recorded
// payments and subscriptions: a student is PAID when they have no unpaid
// balance, DUE when a balance remains, and otherwise PENDING_MATCH when there
// is a payment that still needs review. Kept honest to the stored data.
function deriveFinance(
  payments: { status: string; amount: number }[],
  subs: { status: string; monthlyPrice: number }[],
): { status: string; amountDue: number; totalCollected: number } {
  const totalCollected = payments
    .filter((p) => p.status === 'PAID' || p.status === 'COMPLETED')
    .reduce((s, p) => s + p.amount, 0);
  const pendingMatch = payments.some((p) => p.status === 'PENDING' || p.status === 'REJECTED');

  // Expected monthly commitment from active subscriptions.
  const expected = subs
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + s.monthlyPrice, 0);

  const amountDue = Math.max(0, expected / 100 - totalCollected / 100);

  let status: string;
  if (amountDue > 0) status = 'DUE';
  else if (pendingMatch) status = 'NEEDS_MATCHING';
  else status = totalCollected > 0 ? 'PAID' : 'UNPAID';

  return { status, amountDue, totalCollected };
}

const userSelect = {
  id: true,
  fullName: true,
  username: true,
  phone: true,
  email: true,
  photo: true,
  status: true,
  createdAt: true,
} as const;

export const listCenterStudents = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const { search, financialStatus, registrationStatus, page = 1, limit = 20 } = req.query as any;

  const where: any = { centerId };
  if (search) {
    where.OR = [
      { user: { fullName: { contains: search, mode: 'insensitive' } } },
      { user: { username: { contains: search, mode: 'insensitive' } } },
      { user: { phone: { contains: search } } },
      { studentNumber: { contains: search, mode: 'insensitive' } },
      { parents: { parent: { user: { fullName: { contains: search, mode: 'insensitive' } } } } },
    ];
  }
  if (registrationStatus === 'active') {
    where.user = { status: 'ACTIVE' };
  } else if (registrationStatus === 'frozen') {
    where.user = { status: 'INACTIVE' };
  } else if (registrationStatus === 'pending') {
    where.user = { status: 'PENDING' };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        user: { select: userSelect },
        grade: { select: { name: true } },
        parents: { include: { parent: { include: { user: { select: { fullName: true, phone: true } } } } } },
        teachers: { include: { teacher: { include: { user: { select: { fullName: true } } } } } },
        studentSubjects: { include: { subject: { select: { name: true } } } },
        groupEnrollments: { select: { id: true, groupId: true, status: true, group: { select: { name: true, subject: { select: { name: true } }, stage: true } } } },
        attendance: { select: { status: true, markedAt: true }, orderBy: { markedAt: 'desc' } },
        billingSubscriptions: { select: { status: true, monthlyPrice: true } },
        payments: { select: { status: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.student.count({ where }),
  ]);

  const items = students.map((s) => {
    const grades = s.groupEnrollments
      .filter((e) => e.status === 'ACTIVE')
      .map((e) => e.group.stage)
      .filter(Boolean);
    const finance = deriveFinance(s.payments, s.billingSubscriptions);
    const activeAttendance = s.attendance.find((a) => a.status !== 'PRESENT' && a.status !== 'LATE');

    return {
      id: s.id,
      userId: s.user.id,
      fullName: s.user.fullName,
      username: s.user.username,
      phone: s.user.phone,
      email: s.user.email,
      photo: fileUrl(s.user.photo),
      status: s.user.status,
      studentNumber: s.studentNumber,
      grade: s.grade?.name || grades[0] || null,
      gradeId: s.gradeId,
      branch: null,
      parentId: s.parents[0]?.parentId || null,
      parent: s.parents[0]?.parent.user.fullName || null,
      parentPhone: s.parents[0]?.parent.user.phone || null,
      teachers: s.teachers.map((t) => t.teacher.user.fullName),
      subjects: s.studentSubjects.map((ss) => ss.subject.name),
      groupCount: s.groupEnrollments.filter((e) => e.status === 'ACTIVE').length,
      groups: s.groupEnrollments.filter((e) => e.status === 'ACTIVE').map((e) => ({
        id: e.id,
        groupId: e.groupId,
        name: e.group.name,
        subject: e.group.subject?.name || null,
        stage: e.group.stage || null,
      })),
      enrollmentStatus: enrollmentStatus(s.user.status),
      financialStatus: finance.status,
      amountDue: finance.amountDue,
      totalCollected: finance.totalCollected,
      attendanceRate: s.attendance.length > 0
        ? Math.round((s.attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length / s.attendance.length) * 100)
        : null,
      lastAttendance: s.attendance[0]?.markedAt?.toISOString() || null,
      lastAttendanceStatus: s.attendance[0]?.status || null,
      hasMissingAttendance: s.attendance.some((a) => a.status === 'ABSENT'),
      createdAt: s.createdAt.toISOString(),
    };
  });

  // Financial status filter is applied after the DB query because it is derived
  // from aggregated payments/subscriptions.
  const filtered = financialStatus
    ? items.filter((it) => it.financialStatus === financialStatus)
    : items;

  return ok(res, filtered, 'Students loaded', {
    page: Number(page),
    limit: Number(limit),
    total,
    totalPages: Math.ceil(total / Number(limit)),
  });
});

export const getCenterStudentsStats = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const students = await prisma.student.findMany({
    where: { centerId },
    include: {
      user: { select: { status: true } },
      billingSubscriptions: { select: { status: true, monthlyPrice: true } },
      payments: { select: { status: true, amount: true } },
    },
  });

  const activeStudents = students.filter((s) => s.user.status === 'ACTIVE').length;
  let overdue = 0;
  let needsMatching = 0;
  for (const s of students) {
    const finance = deriveFinance(s.payments, s.billingSubscriptions);
    if (finance.status === 'DUE') overdue++;
    if (finance.status === 'NEEDS_MATCHING') needsMatching++;
  }

  return ok(res, {
    totalStudents: students.length,
    activeStudents,
    pendingEnrollments: students.filter((s) => s.user.status === 'PENDING').length,
    overduePayments: overdue,
    needsMatching,
  });
});

export const getCenterStudent = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: { select: userSelect },
      grade: { select: { name: true } },
      parents: { include: { parent: { include: { user: { select: userSelect } } } } },
      teachers: { include: { teacher: { include: { user: { select: { id: true, fullName: true } } } } } },
      studentSubjects: { include: { subject: { select: { name: true } } } },
      groupEnrollments: {
        where: { status: 'ACTIVE' },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              stage: true,
              subject: { select: { name: true } },
              teacher: { include: { user: { select: { fullName: true } } } },
              room: { select: { name: true } },
              branch: { select: { name: true } },
            },
          },
        },
      },
      attendance: {
        include: {
          lesson: { select: { date: true, startTime: true, subject: { select: { name: true } } } },
        },
        orderBy: { markedAt: 'desc' },
        take: 60,
      },
      payments: {
        include: {
          lesson: { select: { date: true, startTime: true, subject: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      },
      billingSubscriptions: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!student || student.centerId !== centerId) {
    throw ApiError.notFound('Student not found');
  }

  const finance = deriveFinance(student.payments, student.billingSubscriptions);

  const attendanceRate =
    student.attendance.length > 0
      ? Math.round(
          (student.attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length /
            student.attendance.length) *
            100,
        )
      : null;

  return ok(res, {
    id: student.id,
    userId: student.user.id,
    code: student.studentNumber,
    fullName: student.user.fullName,
    username: student.user.username,
    phone: student.user.phone,
    email: student.user.email,
    photo: fileUrl(student.user.photo),
    status: student.user.status,
    enrollmentStatus: enrollmentStatus(student.user.status),
    grade: student.grade?.name || null,
    joinedAt: student.user.createdAt.toISOString(),
    parent: student.parents[0]
      ? {
          id: student.parents[0].parentId,
          fullName: student.parents[0].parent.user.fullName,
          phone: student.parents[0].parent.user.phone,
        }
      : null,
    teachers: student.teachers.map((x) => ({ id: x.teacher.user.id, fullName: x.teacher.user.fullName })),
    subjects: student.studentSubjects.map((ss) => ss.subject.name),
    groups: student.groupEnrollments.map((e) => ({
      enrollmentId: e.id,
      groupId: e.group.id,
      slug: e.group.id,
      name: e.group.name,
      subject: e.group.subject?.name || null,
      stage: e.group.stage || null,
      teacher: e.group.teacher?.user?.fullName || null,
      room: e.group.room?.name || null,
      branch: e.group.branch?.name || null,
      dayOfWeek: null,
    })),
    attendance: student.attendance.map((a) => ({
      id: a.id,
      lessonId: a.lessonId,
      date: a.lesson.date,
      time: a.lesson.startTime,
      subject: a.lesson.subject?.name || null,
      status: a.status,
      method: a.method,
      markedAt: a.markedAt,
    })),
    attendanceRate,
    attendanceCount: student.attendance.length,
    financial: {
      status: finance.status,
      amountDue: finance.amountDue,
      totalCollected: finance.totalCollected,
    },
    payments: student.payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      amount: p.amount,
      status: p.status,
      type: p.type,
      method: p.method,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
      linkedToLesson: Boolean(p.lesson),
      lessonDate: p.lesson?.date || null,
      lessonSubject: p.lesson?.subject?.name || null,
    })),
    lastAttendance: student.attendance[0]
      ? {
          status: student.attendance[0].status,
          markedAt: student.attendance[0].markedAt,
          source: methodSource(student.attendance[0].method),
        }
      : null,
  });
});

function methodSource(method: string): string {
  switch (method) {
    case 'QR':
      return 'qr';
    case 'SYSTEM':
      return 'lesson_collection';
    default:
      return 'manual';
  }
}

export const updateCenterStudent = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;
  const { fullName, phone, email, gradeId, subjectIds } = req.body;

  const student = await prisma.student.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!student || student.centerId !== centerId) {
    throw ApiError.notFound('Student not found');
  }

  const userUpdate: any = {};
  if (fullName !== undefined) userUpdate.fullName = fullName;
  if (phone !== undefined) userUpdate.phone = phone;
  if (email !== undefined) userUpdate.email = email;

  if (Object.keys(userUpdate).length > 0) {
    await prisma.user.update({
      where: { id: student.userId },
      data: userUpdate,
    });
  }

  if (gradeId !== undefined) {
    await prisma.student.update({
      where: { id },
      data: { gradeId },
    });
  }

  if (subjectIds !== undefined && Array.isArray(subjectIds)) {
    await prisma.studentSubject.deleteMany({ where: { studentId: id } });
    if (subjectIds.length > 0) {
      await prisma.studentSubject.createMany({
        data: subjectIds.map((subjectId: string) => ({ studentId: id, subjectId })),
        skipDuplicates: true,
      });
    }
  }

  await recordActivity({
    userId: req.user!.id,
    action: 'updated_student',
    entity: 'Student',
    entityId: id,
  });

  return ok(res, { id }, 'Student updated');
});

export const createCenterStudent = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const { studentName, grade, studentPhone, parentName, parentPhone, groupId } = req.body ?? {};

  if (!studentName || !studentPhone) {
    throw ApiError.badRequest('Student name and phone are required');
  }

  // Create (or reuse) the parent account.
  let parentId: string | null = null;
  if (parentPhone) {
    const parentUser = await prisma.user.findUnique({ where: { username: parentPhone } });
    if (parentUser && parentUser.role === Role.PARENT) {
      const existing = await prisma.parent.findUnique({ where: { userId: parentUser.id } });
      parentId = existing?.id ?? null;
    } else {
      const user = await prisma.user.create({
        data: {
          username: parentPhone,
          passwordHash: '$2a$10$placeholder',
          fullName: parentName || parentPhone,
          phone: parentPhone,
          role: Role.PARENT,
          status: AccountStatus.ACTIVE,
          centerId,
        },
      });
      const parent = await prisma.parent.create({
        data: { userId: user.id, centerId },
      });
      parentId = parent.id;
    }
  }

  // Create the student account.
  let username = studentPhone;
  let base = studentPhone;
  let n = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}-s${n++}`;
  }

  const gradeRow = grade ? await prisma.grade.findFirst({ where: { name: grade } }) : null;

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: '$2a$10$placeholder',
      fullName: studentName,
      phone: studentPhone,
      role: Role.STUDENT,
      status: AccountStatus.ACTIVE,
      centerId,
    },
  });

  const student = await prisma.student.create({
    data: {
      userId: user.id,
      centerId,
      gradeId: gradeRow?.id ?? null,
    },
  });

  // Link parent to the new student.
  if (parentId) {
    await prisma.parentStudent.create({
      data: { parentId, studentId: student.id },
    });
  }

  // Enroll in the chosen group.
  if (groupId) {
    const group = await prisma.group.findFirst({ where: { id: groupId, centerId } });
    if (group) {
      await prisma.groupEnrollment.create({
        data: { groupId, studentId: student.id, status: 'ACTIVE' },
      });
    }
  }

  // Assign a stable demo student number.
  const candidate = `ST-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`;
  let studentNumber = candidate;
  while (!studentNumber || (await prisma.student.findUnique({ where: { studentNumber } }))) {
    studentNumber = `ST-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  }
  await prisma.student.update({ where: { id: student.id }, data: { studentNumber } });

  await recordActivity({
    userId: req.user!.id,
    action: 'created_student',
    entity: 'Student',
    entityId: student.id,
  });

  return ok(res, { id: student.id }, 'Student created');
});

export const updateStudentEnrollmentStatus = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;
  const { status } = req.body ?? {};

  const student = await prisma.student.findUnique({ where: { id }, include: { user: true } });
  if (!student || student.centerId !== centerId) {
    throw ApiError.notFound('Student not found');
  }

  const next = status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
  await prisma.user.update({ where: { id: student.userId }, data: { status: next } });

  await recordActivity({
    userId: req.user!.id,
    action: status === 'ACTIVE' ? 'reactivated_student' : 'froze_student',
    entity: 'Student',
    entityId: id,
  });

  return ok(res, { id, status: next }, 'Enrollment status updated');
});

export const getStudentFormData = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const [groups, grades] = await Promise.all([
    prisma.group.findMany({
      where: { centerId },
      select: { id: true, name: true, stage: true, subject: { select: { name: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.grade.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return ok(res, {
    groups: groups.map((g) => ({
      id: g.id,
      name: [g.subject?.name, g.stage].filter(Boolean).join(' · ') || g.name,
    })),
    grades: grades.map((g) => ({ id: g.id, name: g.name })),
  });
});

export const remindOverduePayments = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const students = await prisma.student.findMany({
    where: { centerId },
    include: {
      user: { select: { fullName: true } },
      parents: { include: { parent: { include: { user: { select: { fullName: true } } } } } },
      billingSubscriptions: { select: { status: true, monthlyPrice: true } },
      payments: { select: { status: true, amount: true } },
    },
  });

  const overdue = students.filter((s) => {
    const f = deriveFinance(s.payments, s.billingSubscriptions);
    return f.status === 'DUE';
  });

  for (const s of overdue) {
    const parentName = s.parents[0]?.parent.user.fullName || s.user.fullName;
    await recordActivity({
      userId: req.user!.id,
      action: 'sent_payment_reminder',
      entity: 'Student',
      entityId: s.id,
      details: `Payment reminder prepared for parent ${parentName}`,
    });
  }

  return ok(res, { count: overdue.length }, 'Payment reminders prepared');
});

export const sendStudentMessage = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;
  const { message } = req.body ?? {};

  if (!message || !String(message).trim()) {
    throw ApiError.badRequest('Message is required');
  }

  const student = await prisma.student.findUnique({ where: { id }, include: { user: true } });
  if (!student || student.centerId !== centerId) {
    throw ApiError.notFound('Student not found');
  }

  await recordActivity({
    userId: req.user!.id,
    action: 'sent_student_message',
    entity: 'Student',
    entityId: id,
    details: String(message).slice(0, 500),
  });

  return ok(res, { id }, 'Message recorded');
});

export const getStudentCommunications = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }
  const { id } = req.params;

  const student = await prisma.student.findUnique({ where: { id }, select: { id: true, centerId: true } });
  if (!student || student.centerId !== centerId) {
    throw ApiError.notFound('Student not found');
  }

  const logs = await prisma.activityLog.findMany({
    where: {
      centerId,
      entity: 'Student',
      entityId: id,
      action: 'sent_student_message',
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return ok(res, logs.map((l) => ({
    id: l.id,
    body: l.details || '',
    authorName: l.role || 'Center',
    createdAt: l.createdAt,
  })));
});

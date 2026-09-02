import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { fileUrl } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

export const listCenterStudents = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const { search, status, page = 1, limit = 20 } = req.query as any;

  const where: any = { centerId };
  if (status) {
    where.user = { status };
  }
  if (search) {
    where.OR = [
      { user: { fullName: { contains: search, mode: 'insensitive' } } },
      { user: { username: { contains: search, mode: 'insensitive' } } },
      { user: { phone: { contains: search } } },
      { studentNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, username: true, phone: true, email: true, photo: true, status: true } },
        grade: { select: { name: true } },
        parents: { include: { parent: { include: { user: { select: { fullName: true } } } } } },
        teachers: { include: { teacher: { include: { user: { select: { fullName: true } } } } } },
        studentSubjects: { include: { subject: { select: { name: true } } } },
        attendance: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.student.count({ where }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const items = await Promise.all(
    students.map(async (s) => {
      const presentCount = s.attendance.filter(a => a.status === 'PRESENT').length;
      const totalAttendance = s.attendance.length;
      const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

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
        grade: s.grade?.name || null,
        gradeId: s.gradeId,
        branch: null,
        parent: s.parents[0]?.parent.user.fullName || null,
        parentId: s.parents[0]?.parentId || null,
        teachers: s.teachers.map(t => t.teacher.user.fullName),
        subjects: s.studentSubjects.map(ss => ss.subject.name),
        attendanceRate,
        enrollmentStatus: 'ENROLLED',
        paymentStatus: 'PAID',
        createdAt: s.createdAt.toISOString(),
      };
    })
  );

  return ok(res, items, 'Students loaded', {
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

  const [totalStudents, activeStudents, pendingSubscriptions, overduePayments] = await Promise.all([
    prisma.student.count({ where: { centerId } }),
    prisma.student.count({ where: { centerId, user: { status: 'ACTIVE' } } }),
    prisma.billingSubscription.count({ where: { centerId, status: 'PENDING' } }),
    prisma.payment.count({ where: { centerId, status: 'REJECTED' } }),
  ]);

  return ok(res, {
    totalStudents,
    activeStudents,
    pendingEnrollments: pendingSubscriptions,
    overduePayments,
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
      user: true,
      grade: { select: { name: true } },
      parents: { include: { parent: { include: { user: true } } } },
      teachers: { include: { teacher: { include: { user: true } } } },
      studentSubjects: { include: { subject: { select: { name: true } } } },
    },
  });
  if (!student || student.centerId !== centerId) {
    throw ApiError.notFound('Student not found');
  }
  return ok(res, {
    ...student,
    photo: fileUrl(student.user.photo),
  });
});

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

  // Update user fields
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

  // Update student fields
  if (gradeId !== undefined) {
    await prisma.student.update({
      where: { id },
      data: { gradeId },
    });
  }

  // Update subjects
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

import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { fileUrl } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

export const listCenterTeachers = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) {
    throw ApiError.unauthorized();
  }

  const { search, status, subject, grade, page = 1, limit = 20 } = req.query as any;

  const where: any = { centerId };
  if (subject) {
    where.subjects = { some: { subjectId: subject } };
  }
  if (grade) {
    where.grades = { some: { gradeId: grade } };
  }

  let teachers = await prisma.teacher.findMany({
    where,
    include: {
      user: { select: { id: true, fullName: true, username: true, phone: true, email: true, photo: true, status: true } },
      subjects: { include: { subject: { select: { name: true } } } },
      grades: { include: { grade: { select: { name: true } } } },
      location: { select: { name: true } },
      ratings: { select: { stars: true } },
    },
  });

  // Apply filters in memory (after fetching) due to Prisma limitations
  if (search) {
    const searchLower = String(search).toLowerCase();
    teachers = teachers.filter(t => 
      t.user.fullName.toLowerCase().includes(searchLower) ||
      t.user.username.toLowerCase().includes(searchLower) ||
      (t.user.phone && t.user.phone.includes(String(search)))
    );
  }
  if (status) {
    teachers = teachers.filter(t => t.user.status === status);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const total = teachers.length;
  const skip = (Number(page) - 1) * Number(limit);
  const paginatedTeachers = teachers.slice(skip, skip + Number(limit));

  const items = await Promise.all(
    paginatedTeachers.map(async (t) => {
      const [studentCount, lessonCount, todayLessons] = await Promise.all([
        prisma.teacherStudent.count({ where: { teacherId: t.id } }),
        prisma.lesson.count({ where: { teacherId: t.id } }),
        prisma.lesson.count({
          where: {
            teacherId: t.id,
            date: { gte: today, lt: tomorrow },
          },
        }),
      ]);

      const ratingCount = t.ratings.length;
      const averageRating = ratingCount > 0
        ? t.ratings.reduce((s, r) => s + r.stars, 0) / ratingCount
        : 0;

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
        subjects: t.subjects.map(s => s.subject.name),
        grades: t.grades.map(g => g.grade.name),
        branch: t.location?.name || null,
        location: t.location?.name || null,
        studentCount,
        lessonCount,
        todayLessons,
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
    },
  });
  if (!teacher || teacher.centerId !== centerId) {
    throw ApiError.notFound('Teacher not found');
  }
  return ok(res, {
    ...teacher,
    photo: fileUrl(teacher.user.photo),
  });
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

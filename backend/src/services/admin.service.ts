import { AccountStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { ApiError } from '../utils/ApiError';
import { hashPassword } from '../utils/password';
import { fileUrl } from '../middleware/upload';
import { recordActivity } from './activity.service';
import { assertWithinPlanLimit } from './subscription.service';
import { userRepository } from '../repositories/user.repository';
import { centerRepository } from '../repositories/center.repository';
import { catalogRepository } from '../repositories/catalog.repository';
import { teacherRepository } from '../repositories/teacher.repository';
import { studentRepository } from '../repositories/student.repository';
import { parentRepository } from '../repositories/parent.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { lessonRepository } from '../repositories/lesson.repository';
import { attendanceRepository } from '../repositories/attendance.repository';

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

export async function createAdminAccount(input: {
  username: string;
  password: string;
  fullName: string;
  phone: string;
  email?: string;
}) {
  const existing = await userRepository.findByUsername(input.username);
  if (existing) throw ApiError.conflict('This username is already taken.', 'USERNAME_TAKEN');

  const user = await userRepository.create({
    username: input.username,
    passwordHash: await hashPassword(input.password),
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
    role: 'CENTER_ADMIN',
  });
  return { id: user.id, username: user.username, fullName: user.fullName, role: user.role };
}

export async function listUsers(
  query: { role?: Role; search?: string; status?: string; page?: number; limit?: number },
) {
  const { role, search, status, page = 1, limit = 20 } = query;

  const where: any = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }

  const [total, users] = await Promise.all([
    userRepository.count(where),
    userRepository.findMany({
      where,
      select: {
        id: true,
        username: true,
        fullName: true,
        phone: true,
        photo: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    data: users.map((u) => ({ ...u, photo: fileUrl(u.photo) })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function setUserStatus(userId: string, status: AccountStatus, actorId: string) {
  const user = await userRepository.findById(userId);
  if (!user) throw ApiError.notFound('User not found.');
  if (
    (user.role === 'CENTER_ADMIN' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') &&
    status !== 'ACTIVE'
  ) {
    throw ApiError.badRequest('Administrator accounts cannot be deactivated this way.', 'ADMIN_PROTECTED');
  }

  const updated = await userRepository.update(userId, { status });

  await recordActivity({
    userId: actorId,
    role: 'CENTER_ADMIN',
    action: `set_user_status_${status.toLowerCase()}`,
    entity: 'User',
    entityId: userId,
  });

  return { id: updated.id, status: updated.status };
}

export async function updateUserByAdmin(
  userId: string,
  actorId: string,
  data: { fullName?: string; phone?: string; email?: string; role?: Role; password?: string },
) {
  const user = await userRepository.findById(userId);
  if (!user) throw ApiError.notFound('User not found.');

  if (data.role && data.role !== user.role) {
    const adminRoles = ['CENTER_ADMIN', 'SUPER_ADMIN'];
    if (adminRoles.includes(user.role) || adminRoles.includes(data.role)) {
      throw ApiError.badRequest('Administrator roles cannot be changed.', 'ROLE_CHANGE_FORBIDDEN');
    }
  }

  const updated = await userRepository.update(userId, {
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.password ? { passwordHash: await hashPassword(data.password) } : {}),
    });

  await recordActivity({
    userId: actorId,
    role: 'CENTER_ADMIN',
    action: 'edited_user',
    entity: 'User',
    entityId: userId,
  });

  return { id: updated.id, username: updated.username, role: updated.role, status: updated.status };
}

// ---------------------------------------------------------------------------
// Catalog management
// ---------------------------------------------------------------------------

export async function createSubject(name: string, icon?: string, description?: string) {
  const existing = await prisma.subject.findUnique({ where: { name } });
  if (existing) throw ApiError.conflict('This subject already exists.', 'DUPLICATE');
  return catalogRepository.createSubject({ name, icon, description } as any);
}

export async function updateSubject(id: string, data: { name?: string; icon?: string; description?: string }) {
  const existing = await catalogRepository.findSubjectById(id);
  if (!existing) throw ApiError.notFound('Subject not found.');
  if (data.name) {
    const dup = await prisma.subject.findUnique({ where: { name: data.name } });
    if (dup && dup.id !== id) throw ApiError.conflict('This subject already exists.', 'DUPLICATE');
  }
  return catalogRepository.updateSubject(id, data as any);
}

export async function deleteSubject(id: string) {
  const existing = await catalogRepository.findSubjectById(id);
  if (!existing) throw ApiError.notFound('Subject not found.');
  // Soft deletion is not used for catalog; subjects are only removed if unused.
  return catalogRepository.deleteSubject(id);
}

export async function listSubjects() {
  return catalogRepository.findManySubjects({ orderBy: { name: 'asc' } });
}

export async function createGrade(name: string, level?: number) {
  const existing = await prisma.grade.findUnique({ where: { name } });
  if (existing) throw ApiError.conflict('This grade already exists.', 'DUPLICATE');
  return catalogRepository.createGrade({ name, level: level ?? 1 } as any);
}

export async function updateGrade(id: string, data: { name?: string; level?: number }) {
  const existing = await catalogRepository.findGradeById(id);
  if (!existing) throw ApiError.notFound('Grade not found.');
  if (data.name) {
    const dup = await prisma.grade.findUnique({ where: { name: data.name } });
    if (dup && dup.id !== id) throw ApiError.conflict('This grade already exists.', 'DUPLICATE');
  }
  return catalogRepository.updateGrade(id, data as any);
}

export async function deleteGrade(id: string) {
  const existing = await catalogRepository.findGradeById(id);
  if (!existing) throw ApiError.notFound('Grade not found.');
  return catalogRepository.deleteGrade(id);
}

export async function listGrades() {
  return catalogRepository.findManyGrades({ orderBy: { level: 'asc' } });
}

export async function createLocation(name: string, address?: string) {
  const existing = await prisma.location.findFirst({ where: { name, centerId: currentCenterId() ?? undefined } });
  if (existing) throw ApiError.conflict('This location already exists.', 'DUPLICATE');
  const centerId = currentCenterId();
  if (centerId) {
    await assertWithinPlanLimit(centerId, 'rooms');
  }
  return catalogRepository.createLocation({ name, address } as any);
}

export async function updateLocation(id: string, data: { name?: string; address?: string }) {
  const existing = await catalogRepository.findLocationById(id);
  if (!existing) throw ApiError.notFound('Location not found.');
  if (data.name) {
    const dup = await prisma.location.findFirst({
      where: { name: data.name, centerId: currentCenterId() ?? undefined, NOT: { id } },
    });
    if (dup) throw ApiError.conflict('This location already exists.', 'DUPLICATE');
  }
  return catalogRepository.updateLocation(id, data as any);
}

export async function deleteLocation(id: string) {
  const existing = await catalogRepository.findLocationById(id);
  if (!existing) throw ApiError.notFound('Location not found.');
  return catalogRepository.deleteLocation(id);
}

export async function listLocations() {
  return prisma.location.findMany({ orderBy: { name: 'asc' } });
}

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------

export async function adminDashboardStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const [
    totalTeachers,
    totalStudents,
    totalParents,
    totalLessons,
    activeLessons,
    completedLessons,
    upcomingLessons,
    totalExams,
    totalAssignments,
    avgRating,
    newUsersThisMonth,
  ] = await Promise.all([
    teacherRepository.count({}),
    studentRepository.count({}),
    parentRepository.count({}),
    lessonRepository.count({}),
    lessonRepository.count({ status: { in: ['SCHEDULED', 'RESCHEDULED'] } }),
    lessonRepository.count({ status: 'COMPLETED' }),
    lessonRepository.count({ date: { gte: now }, status: 'SCHEDULED' }),
    prisma.exam.count(),
    prisma.assignment.count(),
    prisma.rating.aggregate({ _avg: { stars: true } }),
    userRepository.count({
      role: { notIn: ['CENTER_ADMIN', 'SUPER_ADMIN'] },
      createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
    }),
  ]);

  return {
    totalTeachers,
    totalStudents,
    totalParents,
    totalLessons,
    activeLessons,
    completedLessons,
    upcomingLessons,
    totalExams,
    totalAssignments,
    averageTeacherRating: Number((avgRating._avg.stars ?? 0).toFixed(1)),
    newUsersThisMonth,
    todayLessons: await lessonRepository.count({ date: { gte: todayStart, lt: todayEnd } }),
  };
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export async function analyticsData(query: { from?: string; to?: string }) {
  const from = query.from ? new Date(query.from) : new Date('1970-01-01');
  const to = query.to ? new Date(query.to) : new Date('2999-12-31');

  const [
    studentsPerGrade,
    usersPerMonth,
    teachersPerSubject,
    studentsPerTeacher,
    teacherRatings,
    lessonsPerMonth,
    subjectPopularity,
    examStats,
    assignmentStats,
  ] = await Promise.all([
    prisma.student.groupBy({
      by: ['gradeId'],
      _count: { _all: true },
      where: { gradeId: { not: null } },
    }),
    prisma.user.groupBy({
      by: ['createdAt'],
      _count: { _all: true },
      where: { createdAt: { gte: from, lte: to }, role: { notIn: ['CENTER_ADMIN', 'SUPER_ADMIN'] } },
    }),
    prisma.teacherSubject.groupBy({
      by: ['subjectId'],
      _count: { _all: true },
    }),
    prisma.teacherStudent.groupBy({
      by: ['teacherId'],
      _count: { _all: true },
    }),
    prisma.rating.groupBy({ by: ['teacherId'], _avg: { stars: true }, _count: { _all: true } }),
    prisma.lesson.groupBy({
      by: ['date'],
      _count: { _all: true },
      where: { date: { gte: from, lte: to } },
    }),
    prisma.lesson.groupBy({
      by: ['subjectId'],
      _count: { _all: true },
      where: { subjectId: { not: null } },
    }),
    prisma.examAttempt.aggregate({
      _avg: { percentage: true },
      _max: { percentage: true },
      _min: { percentage: true },
      _count: { _all: true },
    }),
    prisma.assignmentSubmission.aggregate({
      _avg: { grade: true },
      _count: { _all: true },
    }),
  ]);

  const grades = await catalogRepository.findManyGrades({ select: { id: true, name: true } });
  const subjects = await catalogRepository.findManySubjects({ select: { id: true, name: true } });
  const teachers = await prisma.teacher.findMany({
    select: { id: true, user: { select: { fullName: true } } },
  });

  const gradeMap = new Map(grades.map((g) => [g.id, g.name]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t.user.fullName]));

  // Aggregate users per month
  const monthlyCounts = new Map<string, number>();
  for (const row of usersPerMonth) {
    const key = row.createdAt.toISOString().slice(0, 7);
    monthlyCounts.set(key, (monthlyCounts.get(key) ?? 0) + row._count._all);
  }
  const studentGrowth = [...monthlyCounts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));

  // Aggregate lessons per month + busy days + busy hours
  const lessonsPerMonthMap = new Map<string, number>();
  const busyDays = new Array(7).fill(0);
  const busyHours = new Array(24).fill(0);
  for (const row of lessonsPerMonth) {
    const key = row.date.toISOString().slice(0, 7);
    lessonsPerMonthMap.set(key, (lessonsPerMonthMap.get(key) ?? 0) + row._count._all);
    busyDays[row.date.getDay()] += row._count._all;
    const h = parseInt(row.date.toISOString().slice(11, 13), 10);
    busyHours[h] += row._count._all;
  }

  const cancelledLessons = await lessonRepository.count({ status: 'CANCELLED' });
  const completedLessonCount = await lessonRepository.count({ status: 'COMPLETED' });

  return {
    studentsPerGrade: studentsPerGrade.map((r) => ({
      grade: gradeMap.get(r.gradeId!) ?? 'Unknown',
      count: r._count._all,
    })),
    studentGrowth,
    totalStudents: await studentRepository.count({}),
    activeStudents: await userRepository.count({ role: 'STUDENT', status: 'ACTIVE' }),
    teachersPerSubject: teachersPerSubject.map((r) => ({
      subject: subjectMap.get(r.subjectId) ?? 'Unknown',
      count: r._count._all,
    })),
    studentsPerTeacher: studentsPerTeacher.map((r) => ({
      teacher: teacherMap.get(r.teacherId) ?? 'Unknown',
      count: r._count._all,
    })),
    teacherRatings: teacherRatings.map((r) => ({
      teacher: teacherMap.get(r.teacherId) ?? 'Unknown',
      average: Number((r._avg.stars ?? 0).toFixed(1)),
      count: r._count._all,
    })),
    lessonsPerMonth: [...lessonsPerMonthMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count })),
    busyDays: busyDays.map((count, i) => ({ day: i, count })),
    busyHours: busyHours.map((count, i) => ({ hour: i, count })),
    cancelledLessons,
    completedLessons: completedLessonCount,
    subjectPopularity: subjectPopularity.map((r) => ({
      subject: subjectMap.get(r.subjectId!) ?? 'Unknown',
      count: r._count._all,
    })),
    exams: {
      total: await prisma.exam.count(),
      attempts: examStats._count._all,
      average: examStats._avg.percentage ? Math.round(examStats._avg.percentage) : 0,
      highest: examStats._max.percentage ? Math.round(examStats._max.percentage) : 0,
      lowest: examStats._min.percentage ? Math.round(examStats._min.percentage) : 0,
      passRate: await computePassRate(from, to),
    },
    assignments: {
      total: await prisma.assignment.count({ where: { createdAt: { gte: from, lte: to } } }),
      submitted: await prisma.assignmentSubmission.count({
        where: { submittedAt: { gte: from, lte: to }, status: { in: ['SUBMITTED', 'GRADED'] } },
      }),
      late: await prisma.assignmentSubmission.count({ where: { status: 'LATE' } }),
      averageGrade: assignmentStats._avg.grade ? Math.round(assignmentStats._avg.grade) : 0,
    },
  };
}

async function computePassRate(from: Date, to: Date) {
  const attempts = await prisma.examAttempt.findMany({
    where: { submittedAt: { gte: from, lte: to } },
    select: { percentage: true },
  });
  if (attempts.length === 0) return 0;
  const passed = attempts.filter((a) => (a.percentage ?? 0) >= 50).length;
  return Math.round((passed / attempts.length) * 100);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface ReportFilters {
  from?: string;
  to?: string;
  teacherId?: string;
  studentId?: string;
  gradeId?: string;
  subjectId?: string;
}

export async function reportMonthlyStudents(filters: ReportFilters) {
  const from = filters.from ? new Date(filters.from) : new Date('1970-01-01');
  const to = filters.to ? new Date(filters.to) : new Date('2999-12-31');

  const where: any = { createdAt: { gte: from, lte: to }, role: 'STUDENT' };
  if (filters.gradeId) {
    where.student = { gradeId: filters.gradeId };
  }

  const users = await userRepository.findMany({
    where,
    select: { createdAt: true },
  });
  const perMonth = new Map<string, number>();
  for (const u of users) {
    const key = u.createdAt.toISOString().slice(0, 7);
    perMonth.set(key, (perMonth.get(key) ?? 0) + 1);
  }
  return [...perMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));
}

export async function reportTeacherPerformance(filters: ReportFilters) {
  const from = filters.from ? new Date(filters.from) : new Date('1970-01-01');
  const to = filters.to ? new Date(filters.to) : new Date('2999-12-31');

  const teachers = await prisma.teacher.findMany({
    where: filters.teacherId ? { id: filters.teacherId } : {},
    select: {
      id: true,
      user: { select: { fullName: true } },
      _count: { select: { students: true, lessons: true, assignments: true, exams: true } },
      ratings: { select: { stars: true, createdAt: true } },
      lessons: { where: { createdAt: { gte: from, lte: to } }, select: { status: true } },
    },
  });

  return teachers.map((t) => {
    const activeRatings = t.ratings.filter((r) => r.createdAt >= from && r.createdAt <= to);
    const avg =
      activeRatings.length > 0
        ? activeRatings.reduce((a, b) => a + b.stars, 0) / activeRatings.length
        : 0;
    const lessons = t.lessons;
    return {
      teacher: t.user.fullName,
      totalStudents: t._count.students,
      lessonsInRange: lessons.length,
      completedLessons: lessons.filter((l) => l.status === 'COMPLETED').length,
      cancelledLessons: lessons.filter((l) => l.status === 'CANCELLED').length,
      totalAssignments: t._count.assignments,
      totalExams: t._count.exams,
      averageRating: Number(avg.toFixed(1)),
    };
  });
}

export async function reportSubjectPopularity(filters: ReportFilters) {
  const from = filters.from ? new Date(filters.from) : new Date('1970-01-01');
  const to = filters.to ? new Date(filters.to) : new Date('2999-12-31');

  const [teachers, lessons, students, assignments, exams] = await Promise.all([
    prisma.teacherSubject.groupBy({ by: ['subjectId'], _count: { _all: true } }),
    prisma.lesson.groupBy({
      by: ['subjectId'],
      _count: { _all: true },
      where: { subjectId: { not: null } },
    }),
    prisma.studentSubject.groupBy({ by: ['subjectId'], _count: { _all: true } }),
    prisma.assignment.groupBy({
      by: ['subjectId'],
      _count: { _all: true },
      where: { subjectId: { not: null }, createdAt: { gte: from, lte: to } },
    }),
    prisma.exam.groupBy({
      by: ['subjectId'],
      _count: { _all: true },
      where: { subjectId: { not: null }, createdAt: { gte: from, lte: to } },
    }),
  ]);

  const subjects = await catalogRepository.findManySubjects({ select: { id: true, name: true } });
  const map = new Map(subjects.map((s) => [s.id, s.name]));

  const all = new Map<string, Record<string, string | number>>();
  for (const r of teachers) set('teachers', r);
  for (const r of lessons) set('lessons', r);
  for (const r of students) set('students', r);
  for (const r of assignments) set('assignments', r);
  for (const r of exams) set('exams', r);

  function set(key: string, row: { subjectId: string | null; _count: { _all: number } }) {
    const id = row.subjectId ?? '';
    const entry = all.get(id) ?? {
      subject: map.get(id) ?? 'Unknown',
      teachers: 0,
      lessons: 0,
      students: 0,
      assignments: 0,
      exams: 0,
    };
    entry[key] = row._count._all;
    all.set(id, entry);
  }

  return [...all.values()].sort((a, b) => Number(b.students) - Number(a.students));
}

export async function reportLessonActivity(filters: ReportFilters) {
  const from = filters.from ? new Date(filters.from) : new Date('1970-01-01');
  const to = filters.to ? new Date(filters.to) : new Date('2999-12-31');

  const where: any = { date: { gte: from, lte: to } };
  if (filters.teacherId) where.teacherId = filters.teacherId;
  if (filters.studentId) where.studentId = filters.studentId;
  if (filters.subjectId) where.subjectId = filters.subjectId;

  const [total, byStatus, byDay, lessons] = await Promise.all([
    lessonRepository.count(where),
    prisma.lesson.groupBy({ by: ['status'], _count: { _all: true }, where }),
    prisma.lesson.groupBy({ by: ['date'], _count: { _all: true }, where }),
    lessonRepository.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 50,
      select: { id: true, date: true, startTime: true, endTime: true, status: true },
    }),
  ]);

  return {
    total,
    byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
    perDay: byDay.map((r) => ({ date: r.date, count: r._count._all })),
    recent: lessons,
  };
}

export async function reportExamPerformance(filters: ReportFilters) {
  const from = filters.from ? new Date(filters.from) : new Date('1970-01-01');
  const to = filters.to ? new Date(filters.to) : new Date('2999-12-31');

  const examWhere: any = { createdAt: { gte: from, lte: to } };
  if (filters.teacherId) examWhere.teacherId = filters.teacherId;
  if (filters.subjectId) examWhere.subjectId = filters.subjectId;

  const exams = await prisma.exam.findMany({
    where: examWhere,
    include: {
      attempts: { where: { status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] } } },
    },
  });

  return exams.map((e) => {
    const percentages = e.attempts.map((a) => a.percentage ?? 0);
    const avg = percentages.length ? Math.round(percentages.reduce((x, y) => x + y, 0) / percentages.length) : 0;
    const pass = percentages.length ? Math.round((percentages.filter((p) => p >= 50).length / percentages.length) * 100) : 0;
    return {
      exam: e.name,
      startTime: e.startTime,
      attempts: e.attempts.length,
      average: avg,
      highest: percentages.length ? Math.round(Math.max(...percentages)) : 0,
      lowest: percentages.length ? Math.round(Math.min(...percentages)) : 0,
      passRate: pass,
    };
  });
}

export async function reportAssignments(filters: ReportFilters) {
  const from = filters.from ? new Date(filters.from) : new Date('1970-01-01');
  const to = filters.to ? new Date(filters.to) : new Date('2999-12-31');

  const where: any = { createdAt: { gte: from, lte: to } };
  if (filters.teacherId) where.teacherId = filters.teacherId;
  if (filters.subjectId) where.subjectId = filters.subjectId;

  const [total, submitted, graded, late, avgGrade, submissions] = await Promise.all([
    prisma.assignment.count({ where }),
    prisma.assignmentSubmission.count({ where: { assignment: where, status: { in: ['SUBMITTED', 'GRADED'] } } }),
    prisma.assignmentSubmission.count({ where: { assignment: where, status: 'GRADED' } }),
    prisma.assignmentSubmission.count({ where: { assignment: where, status: 'LATE' } }),
    prisma.assignmentSubmission.aggregate({ where: { assignment: where }, _avg: { grade: true } }),
    prisma.assignment.findMany({ where, select: { students: { select: { studentId: true } } } }),
  ]);

  const expectedSubmissions = submissions.reduce((acc, s) => acc + s.students.length, 0);

  return {
    totalAssignments: total,
    submitted,
    graded,
    late,
    missing: expectedSubmissions - submitted,
    expectedSubmissions,
    averageGrade: avgGrade._avg.grade ? Math.round(avgGrade._avg.grade) : 0,
  };
}

// ---------------------------------------------------------------------------
// Activity logs
// ---------------------------------------------------------------------------

export async function listActivityLogs(page = 1, limit = 50) {
  const [total, logs] = await Promise.all([
    prisma.activityLog.count(),
    prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { fullName: true, username: true } } },
    }),
  ]);
  return {
    data: logs.map((l) => ({
      id: l.id,
      user: l.user ? { fullName: l.user.fullName, username: l.user.username } : null,
      role: l.role,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      details: l.details,
      createdAt: l.createdAt,
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function listTeachersForAdmin(page = 1, limit = 20, search?: string) {
  const where = search
    ? { user: { fullName: { contains: search, mode: 'insensitive' as const } } }
    : {};
  const [total, teachers] = await Promise.all([
    prisma.teacher.count({ where }),
    prisma.teacher.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, username: true, phone: true, photo: true, status: true } },
        location: true,
        subjects: { include: { subject: true } },
        grades: { include: { grade: true } },
        _count: { select: { students: true, lessons: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return {
    data: teachers.map((t) => ({
      id: t.id,
      userId: t.user.id,
      fullName: t.user.fullName,
      username: t.user.username,
      phone: t.user.phone,
      photo: fileUrl(t.user.photo),
      status: t.user.status,
      location: t.location,
      subjects: t.subjects.map((s) => s.subject.name),
      grades: t.grades.map((g) => g.grade.name),
      hourlyRate: t.hourlyRate,
      yearsExperience: t.yearsExperience,
      students: t._count.students,
      lessons: t._count.lessons,
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

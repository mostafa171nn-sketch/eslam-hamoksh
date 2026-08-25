import { ApiError } from '../utils/ApiError';
import type { Center, CenterStatus, SubscriptionStatus } from '@prisma/client';
import { centerRepository } from '../repositories/center.repository';
import { userRepository } from '../repositories/user.repository';
import { teacherRepository } from '../repositories/teacher.repository';
import { studentRepository } from '../repositories/student.repository';
import { parentRepository } from '../repositories/parent.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { billingSubscriptionRepository } from '../repositories/billing-subscription.repository';
import { lessonRepository } from '../repositories/lesson.repository';
import { attendanceRepository } from '../repositories/attendance.repository';
import { catalogRepository } from '../repositories/catalog.repository';

export interface CenterFilter {
  q?: string;
  city?: string;
  subject?: string;
  grade?: string;
  status?: CenterStatus;
  subscriptionStatus?: SubscriptionStatus;
  planId?: string;
  page?: number;
  limit?: number;
}

export async function listCenters(filter: CenterFilter = {}) {
  const page = filter.page ?? 1;
  const limit = filter.limit ?? 20;
  const where: Record<string, unknown> = {};
  if (filter.q) {
    where.OR = [
      { name: { contains: filter.q, mode: 'insensitive' } },
      { city: { contains: filter.q, mode: 'insensitive' } },
      { address: { contains: filter.q, mode: 'insensitive' } },
    ];
  }
  if (filter.city) where.city = { contains: filter.city, mode: 'insensitive' };
  const teacherSome: Record<string, unknown> = {};
  if (filter.subject) teacherSome.subjects = { some: { subjectId: filter.subject } };
  if (filter.grade) teacherSome.grades = { some: { gradeId: filter.grade } };
  if (Object.keys(teacherSome).length) where.teachers = { some: teacherSome };
  if (filter.status) where.status = filter.status;
  if (filter.subscriptionStatus) where.subscriptionStatus = filter.subscriptionStatus;
  if (filter.planId) where.planId = filter.planId;

  const [items, total] = await Promise.all([
    centerRepository.findMany({
      where,
      include: {
        plan: { select: { id: true, name: true } },
        _count: {
          select: { teachers: true, students: true, parents: true, lessons: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    centerRepository.count(where),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getCenter(id: string): Promise<Center | null> {
  return centerRepository.findByIdWithPlan(id);
}

export async function findCenterAdmin(centerId: string) {
  return userRepository.findFirst({
    centerId,
    role: 'CENTER_ADMIN',
  } as any);
}

export async function approveCenter(id: string, adminId: string) {
  const center = await centerRepository.findById(id);
  if (!center) throw ApiError.notFound('Center not found.');
  if (center.status === 'REJECTED') {
    throw ApiError.badRequest('A rejected center cannot be approved.', 'CENTER_REJECTED');
  }

  return centerRepository.approveWithAdmin(
    id,
    {
      status: 'ACTIVE',
      requiresApproval: false,
      subscriptionStatus: center.subscriptionStatus === 'PENDING' ? 'ACTIVE' : center.subscriptionStatus,
      approvedById: adminId,
      approvedAt: new Date(),
    },
    { centerId: id, role: 'CENTER_ADMIN', status: 'PENDING' },
    { status: 'ACTIVE' },
  );
}

export async function rejectCenter(id: string, reason?: string) {
  const center = await centerRepository.findById(id);
  if (!center) throw ApiError.notFound('Center not found.');
  return centerRepository.update(id, {
    status: 'REJECTED', requiresApproval: false, rejectedReason: reason ?? null,
  } as any);
}

export async function suspendCenter(id: string) {
  const center = await centerRepository.findById(id);
  if (!center) throw ApiError.notFound('Center not found.');
  return centerRepository.update(id, {
    status: 'SUSPENDED', subscriptionStatus: 'SUSPENDED',
  } as any);
}

export async function reactivateCenter(id: string) {
  const center = await centerRepository.findById(id);
  if (!center) throw ApiError.notFound('Center not found.');
  return centerRepository.update(id, {
    status: 'ACTIVE', subscriptionStatus: 'ACTIVE',
  } as any);
}

export interface PlatformStatistics {
  centers: { total: number; active: number; pending: number; suspended: number; rejected: number };
  users: { total: number; teachers: number; students: number; parents: number; admins: number };
  lessons: { total: number };
  revenue: { total: number };
  subscriptions: { active: number };
}

export async function platformStatistics(): Promise<PlatformStatistics> {
  const [centers, users, lessons, revenue, subs] = await Promise.all([
    centerRepository.groupBy({ by: ['status'], _count: { _all: true } }),
    userRepository.groupBy({ by: ['role'], _count: { _all: true } }),
    lessonRepository.count({}),
    paymentRepository.aggregate({ _sum: { amount: true }, where: { status: 'PAID' } }),
    billingSubscriptionRepository.count({ status: 'ACTIVE' }),
  ]);

  const centerCounts: Record<string, number> = {};
  for (const c of centers as any[]) centerCounts[c.status] = c._count._all;
  const userCounts: Record<string, number> = {};
  for (const u of users as any[]) userCounts[u.role] = u._count._all;

  return {
    centers: {
      total: Object.values(centerCounts).reduce((a, b) => a + b, 0),
      active: centerCounts['ACTIVE'] ?? 0,
      pending: centerCounts['PENDING'] ?? 0,
      suspended: centerCounts['SUSPENDED'] ?? 0,
      rejected: centerCounts['REJECTED'] ?? 0,
    },
    users: {
      total: Object.values(userCounts).reduce((a, b) => a + b, 0),
      teachers: userCounts['TEACHER'] ?? 0,
      students: userCounts['STUDENT'] ?? 0,
      parents: userCounts['PARENT'] ?? 0,
      admins: (userCounts['CENTER_ADMIN'] ?? 0) + (userCounts['SUPER_ADMIN'] ?? 0),
    },
    lessons: { total: lessons },
    revenue: { total: (revenue as any)._sum?.amount ?? 0 },
    subscriptions: { active: subs },
  };
}

export interface CenterStatistics {
  teachers: number;
  students: number;
  parents: number;
  lessons: { total: number; upcoming: number; completed: number };
  attendance: { total: number; present: number; absent: number };
  payments: { total: number; paid: number; pending: number };
  revenue: number;
}

export async function centerStatistics(centerId: string): Promise<CenterStatistics> {
  const [teachers, students, parents, lessons, attendance, payments, revenue] = await Promise.all([
    teacherRepository.count({ centerId }),
    studentRepository.count({ centerId }),
    parentRepository.count({ centerId }),
    lessonRepository.groupBy({
      by: ['status'],
      where: { centerId },
      _count: { _all: true },
    }),
    attendanceRepository.groupBy({
      by: ['status'],
      where: { centerId },
      _count: { _all: true },
    }),
    paymentRepository.groupBy({
      by: ['status'],
      where: { centerId },
      _count: { _all: true },
    }),
    paymentRepository.aggregate({ _sum: { amount: true }, where: { centerId, status: 'PAID' } }),
  ]);

  const lessonCounts: Record<string, number> = {};
  for (const l of lessons as any[]) lessonCounts[l.status] = l._count._all;
  const attCounts: Record<string, number> = {};
  for (const a of attendance as any[]) attCounts[a.status] = a._count._all;
  const payCounts: Record<string, number> = {};
  for (const p of payments as any[]) payCounts[p.status] = p._count._all;

  return {
    teachers,
    students,
    parents,
    lessons: {
      total: Object.values(lessonCounts).reduce((a, b) => a + b, 0),
      upcoming: lessonCounts['SCHEDULED'] ?? 0,
      completed: lessonCounts['COMPLETED'] ?? 0,
    },
    attendance: {
      total: Object.values(attCounts).reduce((a, b) => a + b, 0),
      present: attCounts['PRESENT'] ?? 0,
      absent: attCounts['ABSENT'] ?? 0,
    },
    payments: {
      total: Object.values(payCounts).reduce((a, b) => a + b, 0),
      paid: payCounts['PAID'] ?? 0,
      pending: payCounts['PENDING'] ?? 0,
    },
    revenue: (revenue as any)._sum?.amount ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Public center view helpers (used by center.controller.ts)
// ---------------------------------------------------------------------------

export async function getPublicCenterById(id: string) {
  const centers = await centerRepository.findMany({
    where: { id },
    include: {
      locations: { select: { id: true, name: true, address: true } },
      plan: { select: { name: true } },
      _count: { select: { teachers: true, students: true } },
    },
  });
  return centers[0] ?? null;
}

export async function getCenterPublicMetadata(centerId: string) {
  const [locations, subjects, grades] = await Promise.all([
    catalogRepository.findLocationsByCenter(centerId),
    catalogRepository.findTeacherSubjectsByCenter(centerId),
    catalogRepository.findTeacherGradesByCenter(centerId),
  ]);
  return {
    locations,
    subjects: subjects.map((s: any) => s.subject),
    grades: grades.map((g: any) => g.grade),
  };
}

export async function getCenterPublicMetadataExtended(centerId: string) {
  const [subjects, grades] = await Promise.all([
    catalogRepository.findTeacherSubjectsByCenterWithIcons(centerId),
    catalogRepository.findTeacherGradesByCenterExtended(centerId),
  ]);
  return {
    subjects: subjects.map((s: any) => s.subject),
    grades: grades.map((g: any) => g.grade),
  };
}

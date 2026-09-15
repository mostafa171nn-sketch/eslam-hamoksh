import { ApiError } from '../utils/ApiError';
import type { Center, CenterStatus, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
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

/**
 * Public center search with set-based enrichment.
 *
 * Instead of the previous per-center loop (getCenterPublicMetadata ×3 queries +
 * getCenterRatingSummary ×1 query for each listed center → ~1 + 4×N total), the
 * page of centers is enriched with a small, page-size-independent batch of
 * queries: one `IN (...)` fetch per dimension (locations, subjects, grades) plus
 * a single `groupBy` for the rating summaries. Total DB statements therefore
 * stay at 5 regardless of `limit` (1 + count in `listCenters`, then 4).
 *
 * The response contract is unchanged: list fields come from `listCenters`
 * (which already includes plan + `_count`), and this helper only attaches
 * `locations`, `subjects`, `grades`, `ratingAverage` and `ratingCount` (each
 * truncated to the same caps the previous per-center queries applied — 20).
 */
export async function listPublicCenters(filter: CenterFilter = {}) {
  const { items, total, page, limit, totalPages } = await listCenters(filter);
  if (items.length === 0) return { items, total, page, limit, totalPages };

  const ids = items.map((c) => c.id);

  const [locations, subjectRows, gradeRows, ratingRows] = await Promise.all([
    prisma.location.findMany({
      where: { centerId: { in: ids } },
      select: { centerId: true, id: true, name: true, address: true },
      orderBy: { name: 'asc' },
    }),
    prisma.teacherSubject.findMany({
      where: { teacher: { centerId: { in: ids } } },
      select: {
        teacher: { select: { centerId: true } },
        subject: { select: { id: true, name: true } },
      },
    }),
    prisma.teacherGrade.findMany({
      where: { teacher: { centerId: { in: ids } } },
      select: {
        teacher: { select: { centerId: true } },
        grade: { select: { id: true, name: true } },
      },
    }),
    prisma.centerRating.groupBy({
      by: ['centerId'],
      where: { centerId: { in: ids } },
      _avg: { stars: true },
      _count: { stars: true },
    }),
  ]);

  const locationsByCenter = new Map<string, { id: string; name: string; address: string | null }[]>();
  for (const loc of locations) {
    const cid = loc.centerId;
    if (!cid) continue;
    const arr = locationsByCenter.get(cid) ?? [];
    arr.push({ id: loc.id, name: loc.name, address: loc.address });
    locationsByCenter.set(cid, arr);
  }

  // (teacherId, subjectId) is the table's composite key, so no duplicates exist
  // at the DB level; the set keyed by subject id below is only defensive.
  const subjectsByCenter = new Map<string, { id: string; name: string }[]>();
  for (const row of subjectRows as Array<{ teacher: { centerId: string }; subject: { id: string; name: string } }>) {
    const arr = subjectsByCenter.get(row.teacher.centerId) ?? [];
    if (!arr.some((s) => s.id === row.subject.id)) arr.push({ id: row.subject.id, name: row.subject.name });
    subjectsByCenter.set(row.teacher.centerId, arr);
  }

  const gradesByCenter = new Map<string, { id: string; name: string }[]>();
  for (const row of gradeRows as Array<{ teacher: { centerId: string }; grade: { id: string; name: string } }>) {
    const arr = gradesByCenter.get(row.teacher.centerId) ?? [];
    if (!arr.some((g) => g.id === row.grade.id)) arr.push({ id: row.grade.id, name: row.grade.name });
    gradesByCenter.set(row.teacher.centerId, arr);
  }

  const ratingByCenter = new Map<string, { average: number; count: number }>();
  for (const r of ratingRows) {
    ratingByCenter.set(r.centerId, {
      average: Number((r._avg.stars ?? 0).toFixed(1)),
      count: r._count.stars,
    });
  }

  return {
    items: items.map((c) => ({
      ...c,
      locations: locationsByCenter.get(c.id) ?? [],
      subjects: (subjectsByCenter.get(c.id) ?? []).slice(0, 20),
      grades: (gradesByCenter.get(c.id) ?? []).slice(0, 20),
      ratingAverage: ratingByCenter.get(c.id)?.average ?? 0,
      ratingCount: ratingByCenter.get(c.id)?.count ?? 0,
    })),
    total,
    page,
    limit,
    totalPages,
  };
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

/**
 * Batch variant of `centerStatistics` for the admin center-listing endpoint.
 *
 * The naive per-center loop fires 7 independent DB queries per center
 * (up to 200 centers → 1,400 round-trips per page of the admin listing).
 * This collapses them into a fixed 4 queries for any number of centers by
 * grouping on `centerId` across all three aggregation tables, then merges the
 * result with the `_count` values the parent listing already fetched.
 * The produced shape is byte-for-byte identical to `centerStatistics`.
 */
export async function batchCenterStatistics(
  centers: Array<{
    id: string;
    _count: { teachers: number; students: number; parents: number; lessons: number };
  }>,
): Promise<Record<string, CenterStatistics>> {
  const ids = centers.map((c) => c.id);
  if (ids.length === 0) return {};

  const [lessons, attendance, payments, revenue] = await Promise.all([
    prisma.lesson.groupBy({
      by: ['centerId', 'status'],
      where: { centerId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.attendance.groupBy({
      by: ['centerId', 'status'],
      where: { centerId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.payment.groupBy({
      by: ['centerId', 'status'],
      where: { centerId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.payment.groupBy({
      by: ['centerId'],
      where: { centerId: { in: ids }, status: 'PAID' },
      _sum: { amount: true },
    }),
  ]);

  const lessonByCenter = new Map<string, Record<string, number>>();
  for (const row of lessons) {
    const m = lessonByCenter.get(row.centerId!) ?? {};
    m[row.status!] = row._count._all;
    lessonByCenter.set(row.centerId!, m);
  }
  const attendanceByCenter = new Map<string, Record<string, number>>();
  for (const row of attendance) {
    const m = attendanceByCenter.get(row.centerId!) ?? {};
    m[row.status!] = row._count._all;
    attendanceByCenter.set(row.centerId!, m);
  }
  const paymentsByCenter = new Map<string, Record<string, number>>();
  for (const row of payments) {
    const m = paymentsByCenter.get(row.centerId!) ?? {};
    m[row.status!] = row._count._all;
    paymentsByCenter.set(row.centerId!, m);
  }
  const revenueByCenter = new Map(revenue.map((r) => [r.centerId!, r._sum.amount ?? 0]));

  const result: Record<string, CenterStatistics> = {};
  for (const c of centers) {
    const lessonsMap = lessonByCenter.get(c.id) ?? {};
    const attendanceMap = attendanceByCenter.get(c.id) ?? {};
    const paymentsMap = paymentsByCenter.get(c.id) ?? {};
    const attendanceTotal = Object.values(attendanceMap).reduce((a, b) => a + b, 0);
    const paymentsTotal = Object.values(paymentsMap).reduce((a, b) => a + b, 0);
    result[c.id] = {
      teachers: c._count.teachers,
      students: c._count.students,
      parents: c._count.parents,
      lessons: {
        total: c._count.lessons,
        upcoming: lessonsMap['SCHEDULED'] ?? 0,
        completed: lessonsMap['COMPLETED'] ?? 0,
      },
      attendance: {
        total: attendanceTotal,
        present: attendanceMap['PRESENT'] ?? 0,
        absent: attendanceMap['ABSENT'] ?? 0,
      },
      payments: {
        total: paymentsTotal,
        paid: paymentsMap['PAID'] ?? 0,
        pending: paymentsMap['PENDING'] ?? 0,
      },
      revenue: revenueByCenter.get(c.id) ?? 0,
    };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public center view helpers (used by center.controller.ts)
// ---------------------------------------------------------------------------

export async function getPublicCenterById(id: string) {
  // Public center detail loads exactly one row; use findUnique (PK lookup)
  // instead of loading a possibly-large findMany collection only to take [0].
  return prisma.center.findUnique({
    where: { id },
    include: {
      locations: { select: { id: true, name: true, address: true } },
      plan: { select: { name: true } },
      _count: { select: { teachers: true, students: true } },
    },
  });
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

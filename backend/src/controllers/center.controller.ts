import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  approveCenter,
  batchCenterStatistics,
  centerStatistics,
  getCenter,
  getPublicCenterById,
  getCenterPublicMetadataExtended,
  listCenters,
  listPublicCenters,
  platformStatistics,
  reactivateCenter,
  rejectCenter,
  suspendCenter,
} from '../services/center-admin.service';
import { getCenterRatingSummary } from '../services/rating.service';
import { fileUrl } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';

function publicCenterView(center: any) {
  return {
    id: center.id,
    name: center.name,
    nameEn: center.nameEn ?? null,
    slug: center.slug,
    city: center.city,
    address: center.address,
    latitude: center.latitude ?? null,
    longitude: center.longitude ?? null,
    description: center.description,
    logoUrl: center.logoUrl,
    photoUrl: center.logoUrl ?? null,
    status: center.status,
    subscriptionStatus: center.subscriptionStatus,
    branches: center.locations?.map((l: any) => ({ id: l.id, name: l.name, address: l.address })) ?? [],
    subjects: center.subjects ?? [],
    grades: center.grades ?? [],
    teacherCount: center._count?.teachers ?? 0,
    studentCount: center._count?.students ?? 0,
    centerEmail: center.email ?? null,
    centerPhone: center.phone ?? null,
    ratingAverage: center.ratingAverage ?? 0,
    ratingCount: center.ratingCount ?? 0,
  };
}

// --- Public (no auth) -------------------------------------------------------

export const searchCenters = asyncHandler(async (req: Request, res: Response) => {
  const { q, city, subject, grade, page, limit } = req.validatedQuery as any;
  // `subject` + `grade` are forwarded to `listCenters`, which filters centers by
  // a matching teacher carrying that subject/grade. Previously both were
  // silently dropped and only q/city applied.
  const result = await listPublicCenters({
    q,
    city,
    subject,
    grade,
    status: 'ACTIVE',
    subscriptionStatus: 'ACTIVE',
    page,
    limit,
  });
  const items = result.items.map((c: any) => publicCenterView(c));
  return ok(res, { items, total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages });
});

export const getPublicCenter = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams as any;
  const center = await getPublicCenterById(id);
  if (!center || center.status !== 'ACTIVE' || center.subscriptionStatus !== 'ACTIVE') {
    throw ApiError.notFound('Center not found.');
  }
  const [meta, rating] = await Promise.all([
    getCenterPublicMetadataExtended(id),
    getCenterRatingSummary(id),
  ]);
  return ok(
    res,
    publicCenterView({
      ...center,
      ...meta,
      teachers: undefined,
      ratingAverage: rating.average,
      ratingCount: rating.count,
    }),
  );
});

/**
 * Public listing of the teachers that belong to ONE specific center. Only
 * active teachers of an active, subscribed center are returned so the count on
 * the page always matches this exact list.
 */
export const getPublicCenterTeachers = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams as any;

  const center = await prisma.center.findUnique({
    where: { id },
    select: { id: true, status: true, subscriptionStatus: true },
  });
  if (!center || center.status !== 'ACTIVE' || center.subscriptionStatus !== 'ACTIVE') {
    throw ApiError.notFound('Center not found.');
  }

  const teachers = await prisma.teacher.findMany({
    where: {
      centerId: id,
      user: { status: 'ACTIVE' },
    },
    select: {
      id: true,
      bio: true,
      yearsExperience: true,
      hourlyRate: true,
      createdAt: true,
      user: { select: { id: true, fullName: true, photo: true } },
      location: { select: { id: true, name: true } },
      subjects: { select: { subject: { select: { id: true, name: true } } } },
      grades: { select: { grade: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const teacherIds = teachers.map((t) => t.id);
  const ratingRows = teacherIds.length
    ? await prisma.rating.groupBy({
        by: ['teacherId'],
        where: { teacherId: { in: teacherIds } },
        _avg: { stars: true },
        _count: { stars: true },
      })
    : [];
  const ratingById = new Map(
    ratingRows.map((r) => [
      r.teacherId,
      { average: Number((r._avg.stars ?? 0).toFixed(1)), count: r._count.stars },
    ]),
  );

  const items = teachers.map((t) => {
    const rating = ratingById.get(t.id);
    return {
      id: t.id,
      userId: t.user.id,
      fullName: t.user.fullName,
      photo: fileUrl(t.user.photo),
      bio: t.bio,
      yearsExperience: t.yearsExperience,
      hourlyRate: t.hourlyRate,
      location: t.location,
      subjects: t.subjects.map((s) => s.subject),
      grades: t.grades.map((g) => g.grade),
      rating: rating?.average ?? 0,
      ratingCount: rating?.count ?? 0,
      centerId: id,
    };
  });

  return ok(res, items, 'Center teachers loaded.');
});

// --- Super admin ------------------------------------------------------------

export const listAllCenters = asyncHandler(async (req: Request, res: Response) => {
  const { q, status, subscriptionStatus, planId, page, limit } = req.validatedQuery as any;
  const result = await listCenters({ q, status, subscriptionStatus, planId, page, limit });

  const statsMap = await batchCenterStatistics(
    result.items.map((c) => c as unknown as { id: string; _count: { teachers: number; students: number; parents: number; lessons: number } }),
  );
  const items = result.items.map((c: any) => ({ ...c, statistics: statsMap[c.id] }));
  return ok(res, { items, total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages });
});

export const getCenterForAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams as any;
  const center = await getCenter(id);
  if (!center) throw ApiError.notFound('Center not found.');
  const statistics = await centerStatistics(id);
  return ok(res, { center, statistics });
});

export const approveCenterHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams as any;
  const center = await approveCenter(id, req.user!.id);
  return ok(res, { center }, 'Center approved.');
});

export const rejectCenterHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams as any;
  const { reason } = req.validatedBody as any;
  const center = await rejectCenter(id, reason);
  return ok(res, { center }, 'Center rejected.');
});

export const suspendCenterHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams as any;
  const center = await suspendCenter(id);
  return ok(res, { center }, 'Center suspended.');
});

export const reactivateCenterHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams as any;
  const center = await reactivateCenter(id);
  return ok(res, { center }, 'Center reactivated.');
});

export const platformStatsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await platformStatistics();
  return ok(res, stats);
});

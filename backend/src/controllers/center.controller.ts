import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  approveCenter,
  centerStatistics,
  getCenter,
  getPublicCenterById,
  getCenterPublicMetadata,
  getCenterPublicMetadataExtended,
  listCenters,
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
  const result = await listCenters({
    q,
    city,
    status: 'ACTIVE',
    subscriptionStatus: 'ACTIVE',
    page,
    limit,
  });
  // Attach lightweight public metadata per center.
  const items = await Promise.all(
    result.items.map(async (c: any) => {
      const [meta, rating] = await Promise.all([
        getCenterPublicMetadata(c.id),
        getCenterRatingSummary(c.id),
      ]);
      return publicCenterView({
        ...c,
        ...meta,
        ratingAverage: rating.average,
        ratingCount: rating.count,
      });
    }),
  );
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
      ratings: { select: { stars: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const items = teachers.map((t) => {
    const count = t.ratings.length;
    const avg = count ? t.ratings.reduce((s, r) => s + r.stars, 0) / count : 0;
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
      rating: Number(avg.toFixed(1)),
      ratingCount: count,
      centerId: id,
    };
  });

  return ok(res, items, 'Center teachers loaded.');
});

// --- Super admin ------------------------------------------------------------

export const listAllCenters = asyncHandler(async (req: Request, res: Response) => {
  const { q, status, subscriptionStatus, planId, page, limit } = req.validatedQuery as any;
  const result = await listCenters({ q, status, subscriptionStatus, planId, page, limit });

  const items = await Promise.all(
    result.items.map(async (c: any) => {
      const stats = await centerStatistics(c.id);
      return { ...c, statistics: stats };
    }),
  );
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

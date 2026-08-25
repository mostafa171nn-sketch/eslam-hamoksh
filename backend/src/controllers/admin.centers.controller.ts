import type { Request, Response } from 'express';
import {
  approveCenter,
  centerStatistics,
  findCenterAdmin,
  getCenter,
  listCenters,
  rejectCenter,
  suspendCenter,
  reactivateCenter,
} from '../services/center-admin.service';
import {
  listRegistrationRequests,
  getRegistrationRequest,
  approveRegistrationRequest,
  rejectRegistrationRequest,
} from '../services/center-registration.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';

export const adminCentersListHandler = asyncHandler(async (req: Request, res: Response) => {
  const { q, status, page, limit } = req.query as any;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));

  const result = await listCenters({ q, status, page: pageNum, limit: limitNum });

  const items = await Promise.all(
    result.items.map(async (center: any) => {
      const admin = await findCenterAdmin(center.id);
      return {
        id: center.id,
        name: center.name,
        nameEn: center.nameEn,
        email: center.email,
        phone: center.phone,
        city: center.city,
        address: center.address,
        slug: center.slug,
        status: center.status,
        subscriptionStatus: center.subscriptionStatus,
        createdAt: center.createdAt,
        admin,
      };
    }),
  );

  return ok(
    res,
    { items, total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
  );
});

export const adminCentersDetailHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const center = await getCenter(id);
  if (!center) throw ApiError.notFound('Center not found.');
  const admin = await findCenterAdmin(id);
  const statistics = await centerStatistics(id);
  return ok(res, { center, admin, statistics });
});

export const adminCentersApproveHandler = asyncHandler(async (req: Request, res: Response) => {
  const center = await approveCenter(req.params.id, req.user!.id);
  return ok(res, { center }, 'Center approved.');
});

export const adminCentersRejectHandler = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = (req.validatedBody || req.body) || {};
  const center = await rejectCenter(req.params.id, reason);
  return ok(res, { center }, 'Center rejected.');
});

export const adminCentersSuspendHandler = asyncHandler(async (req: Request, res: Response) => {
  const center = await suspendCenter(req.params.id);
  return ok(res, { center }, 'Center suspended.');
});

export const adminCentersReactivateHandler = asyncHandler(async (req: Request, res: Response) => {
  const center = await reactivateCenter(req.params.id);
  return ok(res, { center }, 'Center activated.');
});

// ── Registration Requests ────────────────────────────────────────────────

export const listRegistrationRequestsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { status, page, limit } = req.query as any;
  const result = await listRegistrationRequests({
    status,
    page: Number(page) || 1,
    limit: Number(limit) || 20,
  });
  return ok(res, result.items, 'Registration requests loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const getRegistrationRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const request = await getRegistrationRequest(req.params.id);
  if (!request) throw ApiError.notFound('Registration request not found.');
  return ok(res, request, 'Registration request loaded.');
});

export const approveRegistrationRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { reviewNotes } = (req.validatedBody || req.body) || {};
  const result = await approveRegistrationRequest(req.params.id, req.user!.id, reviewNotes);
  return ok(res, result, 'Registration request approved.');
});

export const rejectRegistrationRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { reason, reviewNotes } = (req.validatedBody || req.body) || {};
  const result = await rejectRegistrationRequest(req.params.id, req.user!.id, reason, reviewNotes);
  return ok(res, result, 'Registration request rejected.');
});

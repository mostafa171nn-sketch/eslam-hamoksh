import type { Request, Response } from 'express';
import {
  rateTeacher,
  rateCenter,
  getCenterRatingSummary,
  getMyCenterRating,
  listTeacherReviews,
} from '../services/rating.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';
import { teacherRepository } from '../repositories/teacher.repository';
import { ApiError } from '../utils/ApiError';

export const rateTeacherHandler = asyncHandler(async (req: Request, res: Response) => {
  const rating = await rateTeacher(
    { userId: req.user!.id, role: req.user!.role },
    req.params.teacherId,
    Number(req.validatedBody.stars),
    req.validatedBody.comment,
  );
  return created(res, rating, 'Rating submitted.');
});

export const teacherReviewsHandler = asyncHandler(async (req: Request, res: Response) => {
  const teacher = await teacherRepository.findById(req.params.teacherId);
  if (!teacher) {
    throw ApiError.notFound('Teacher not found.');
  }
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const result = await listTeacherReviews(req.params.teacherId, page, limit);
  return ok(res, result.data, 'Reviews loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

// --- Center ratings ---------------------------------------------------------

/** The routes mount these handlers under `/:id/...`, so the center id is `validatedParams.id`. */
function requestedCenterId(req: Request): string {
  const id = (req as Request & { validatedParams?: { id?: string } }).validatedParams?.id;
  if (!id) {
    throw ApiError.badRequest('Center id is required.');
  }
  return id;
}

export const rateCenterHandler = asyncHandler(async (req: Request, res: Response) => {
  const rating = await rateCenter(
    { userId: req.user!.id, role: req.user!.role },
    requestedCenterId(req),
    Number(req.validatedBody.stars),
    req.validatedBody.comment,
  );
  return created(res, rating, 'Rating submitted.');
});

export const centerRatingSummaryHandler = asyncHandler(async (req: Request, res: Response) => {
  const summary = await getCenterRatingSummary(requestedCenterId(req));
  return ok(res, summary, 'Center rating loaded.');
});

export const myCenterRatingHandler = asyncHandler(async (req: Request, res: Response) => {
  const rating = await getMyCenterRating(req.user!.id, requestedCenterId(req));
  return ok(res, rating, 'Your rating loaded.');
});

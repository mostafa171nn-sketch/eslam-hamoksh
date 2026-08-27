import type { Request, Response } from 'express';
import { resolveRoleEntity } from '../services/lesson.service';
import * as followService from '../services/student-center-follow.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';
import { ApiError } from '../utils/ApiError';

export const followCenterHandler = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = await resolveRoleEntity(req.user!.id, req.user!.role);
  if (!studentId) throw ApiError.notFound('Student profile not found.');
  const centerId = req.params.centerId || req.body.centerId;
  if (!centerId) throw ApiError.badRequest('Center ID is required.');
  const follow = await followService.followCenter(studentId, centerId);
  return created(res, follow, 'Center followed.');
});

export const unfollowCenterHandler = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = await resolveRoleEntity(req.user!.id, req.user!.role);
  if (!studentId) throw ApiError.notFound('Student profile not found.');
  const centerId = req.params.centerId;
  if (!centerId) throw ApiError.badRequest('Center ID is required.');
  await followService.unfollowCenter(studentId, centerId);
  return ok(res, null, 'Center unfollowed.');
});

export const listFollowedCentersHandler = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = await resolveRoleEntity(req.user!.id, req.user!.role);
  if (!studentId) throw ApiError.notFound('Student profile not found.');
  const centers = await followService.listFollowedCenters(studentId);
  return ok(res, centers, 'Followed centers loaded.');
});

export const checkFollowHandler = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = await resolveRoleEntity(req.user!.id, req.user!.role);
  if (!studentId) throw ApiError.notFound('Student profile not found.');
  const centerId = req.params.centerId;
  const isFollowing = await followService.isFollowing(studentId, centerId);
  return ok(res, { isFollowing }, 'Follow status loaded.');
});

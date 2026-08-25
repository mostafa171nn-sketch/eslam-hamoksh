import type { Request, Response } from 'express';
import {
  getTeacherByUserId,
  getTeacherPublicProfile,
  getTeacherStats,
  getTeacherStudents,
  searchTeachers,
  updateAvailability,
  updateTeacherPhoto,
  updateTeacherProfile,
} from '../services/teacher.service';
import { resolveRoleEntity, getAvailableSlots } from '../services/lesson.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';

export async function requireTeacherActor(req: Request) {
  const teacher = await getTeacherByUserId(req.user!.id);
  if (!teacher) throw ApiError.notFound('Teacher profile not found.');
  return teacher;
}

export const searchTeachersHandler = asyncHandler(async (req: Request, res: Response) => {
  const q = (req as Request & { validatedQuery?: Record<string, unknown> }).validatedQuery ?? req.query;
  const result = await searchTeachers({
    subjectId: q.subjectId as string | undefined,
    gradeId: q.gradeId as string | undefined,
    day: q.day !== undefined && q.day !== '' ? Number(q.day) : undefined,
    time: q.time as string | undefined,
    locationId: q.locationId as string | undefined,
    centerId: q.centerId as string | undefined,
    maxPrice: q.maxPrice !== undefined && q.maxPrice !== '' ? Number(q.maxPrice) : undefined,
    minRating: q.minRating !== undefined && q.minRating !== '' ? Number(q.minRating) : undefined,
    name: q.name as string | undefined,
    page: q.page !== undefined && q.page !== '' ? Number(q.page) : 1,
    limit: q.limit !== undefined && q.limit !== '' ? Number(q.limit) : 20,
  });
  return ok(res, result.data, 'Teachers loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const getTeacherProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  let viewerStudentId: string | undefined;
  if (req.user?.role === 'STUDENT') {
    const me = await resolveRoleEntity(req.user.id, 'STUDENT');
    viewerStudentId = me.studentId ?? undefined;
  }
  const profile = await getTeacherPublicProfile(req.params.id, viewerStudentId);
  return ok(res, profile, 'Teacher profile loaded.');
});

export const availableSlotsHandler = asyncHandler(async (req: Request, res: Response) => {
  let viewerStudentId: string | undefined;
  if (req.user?.role === 'STUDENT') {
    const me = await resolveRoleEntity(req.user.id, 'STUDENT');
    viewerStudentId = me.studentId ?? undefined;
  }
  const q = (req as Request & { validatedQuery?: Record<string, unknown> }).validatedQuery ?? req.query;
  const slots = await getAvailableSlots(
    req.params.id,
    q.from as string | undefined,
    q.to as string | undefined,
    viewerStudentId,
  );
  return ok(res, slots, 'Available slots loaded.');
});

export const updateTeacherProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  const updated = await updateTeacherProfile(req.user!.id, req.validatedBody);
  return ok(res, updated, 'Profile updated successfully.');
});

export const updateTeacherPhotoHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded.');
  const url = await updateTeacherPhoto(req.user!.id, req.file.filename);
  return ok(res, { photo: url }, 'Photo updated successfully.');
});

export const updateAvailabilityHandler = asyncHandler(async (req: Request, res: Response) => {
  const availability = await updateAvailability(req.user!.id, req.validatedBody.availability);
  return ok(res, availability, 'Availability updated successfully.');
});

export const teacherStatsHandler = asyncHandler(async (req: Request, res: Response) => {
  const teacher = await requireTeacherActor(req);
  const stats = await getTeacherStats(teacher.id);
  return ok(res, stats, 'Dashboard loaded.');
});

export const teacherStudentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const teacher = await requireTeacherActor(req);
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const result = await getTeacherStudents(teacher.id, page, limit);
  return ok(res, result.data, 'Students loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

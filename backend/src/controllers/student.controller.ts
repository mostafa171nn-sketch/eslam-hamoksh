import type { Request, Response } from 'express';
import {
  connectStudentToParent,
  getMyTeachers,
  getStudentDashboard,
  removeStudentFromParent,
  updateStudentPhoto,
  updateStudentProfile,
} from '../services/student.service';
import {
  getChildDashboard,
  getChildProfile,
  getParentDashboard,
  listParentStudents,
  updateParentPhoto,
  updateParentProfile,
} from '../services/parent.service';
import { resolveRoleEntity } from '../services/lesson.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';

export const studentDashboardHandler = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = await resolveRoleEntity(req.user!.id, req.user!.role);
  if (!studentId) throw ApiError.notFound('Student profile not found.');
  const data = await getStudentDashboard(studentId);
  return ok(res, data, 'Dashboard loaded.');
});

export const myTeachersHandler = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = await resolveRoleEntity(req.user!.id, req.user!.role);
  if (!studentId) throw ApiError.notFound('Student profile not found.');
  const teachers = await getMyTeachers(studentId);
  return ok(res, teachers, 'Your teachers loaded.');
});

export const updateStudentProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  const updated = await updateStudentProfile(req.user!.id, req.validatedBody);
  return ok(res, updated, 'Profile updated successfully.');
});

export const updateStudentPhotoHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded.');
  const url = await updateStudentPhoto(req.user!.id, req.file.filename);
  return ok(res, { photo: url }, 'Photo updated successfully.');
});

export const parentDashboardHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getParentDashboard(req.user!.id);
  return ok(res, data, 'Dashboard loaded.');
});

export const listChildrenHandler = asyncHandler(async (req: Request, res: Response) => {
  const children = await listParentStudents(req.user!.id);
  return ok(res, children, 'Children loaded.');
});

export const connectChildHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await connectStudentToParent(req.user!.id, req.params.studentId);
  return ok(res, result, 'Student linked to your account.');
});

export const removeChildHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await removeStudentFromParent(req.user!.id, req.params.studentId);
  return ok(res, result, 'Student unlinked.');
});

export const childDashboardHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getChildDashboard(req.user!.id, req.params.studentId);
  return ok(res, data, 'Child dashboard loaded.');
});

export const childProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getChildProfile(req.user!.id, req.params.studentId);
  return ok(res, data, 'Child profile loaded.');
});

export const updateParentProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  const updated = await updateParentProfile(req.user!.id, req.validatedBody);
  return ok(res, updated, 'Profile updated successfully.');
});

export const updateParentPhotoHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded.');
  const url = await updateParentPhoto(req.user!.id, req.file.filename);
  return ok(res, { photo: url }, 'Photo updated successfully.');
});

import type { Request, Response } from 'express';
import {
  adminDashboardStats,
  analyticsData,
  createAdminAccount,
  createGrade,
  createLocation,
  createSubject,
  deleteGrade,
  deleteLocation,
  deleteSubject,
  listActivityLogs,
  listGrades,
  listLocations,
  listSubjects,
  listTeachersForAdmin,
  listUsers,
  reportAssignments,
  reportExamPerformance,
  reportLessonActivity,
  reportMonthlyStudents,
  reportSubjectPopularity,
  reportTeacherPerformance,
  setUserStatus,
  updateGrade,
  updateLocation,
  updateSubject,
  updateUserByAdmin,
} from '../services/admin.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';
import { ApiError } from '../utils/ApiError';

export const dashboardStatsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await adminDashboardStats();
  return ok(res, stats, 'Dashboard loaded.');
});

export const listUsersHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listUsers({
    role: req.query.role as any,
    search: req.query.search as string | undefined,
    status: req.query.status as string | undefined,
    page: Number(req.query.page ?? 1),
    limit: Number(req.query.limit ?? 20),
  });
  return ok(res, result.data, 'Users loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const setUserStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await setUserStatus(req.params.id, req.validatedBody.status, req.user!.id);
  return ok(res, result, 'User status updated.');
});

export const updateUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await updateUserByAdmin(req.params.id, req.user!.id, req.validatedBody);
  return ok(res, result, 'User updated.');
});

export const createAdminHandler = asyncHandler(async (req: Request, res: Response) => {
  const admin = await createAdminAccount(req.validatedBody);
  return created(res, admin, 'Admin account created.');
});

export const analyticsHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsData({ from: req.query.from as string, to: req.query.to as string });
  return ok(res, data, 'Analytics loaded.');
});

const REPORTS: Record<string, (f: any) => Promise<unknown>> = {
  'monthly-students': reportMonthlyStudents,
  'teacher-performance': reportTeacherPerformance,
  'subject-popularity': reportSubjectPopularity,
  'lesson-activity': reportLessonActivity,
  'exam-performance': reportExamPerformance,
  assignments: reportAssignments,
};

export const reportHandler = asyncHandler(async (req: Request, res: Response) => {
  const fn = REPORTS[req.params.type];
  if (!fn) {
    throw ApiError.notFound('Report not found.');
  }
  const filters = {
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    teacherId: req.query.teacherId as string | undefined,
    studentId: req.query.studentId as string | undefined,
    gradeId: req.query.gradeId as string | undefined,
    subjectId: req.query.subjectId as string | undefined,
  };
  const data = await fn(filters);
  return ok(res, data, 'Report loaded.');
});

export const activityLogsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listActivityLogs(Number(req.query.page ?? 1), Number(req.query.limit ?? 50));
  return ok(res, result.data, 'Activity logs loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const listSubjectsHandler = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await listSubjects(), 'Subjects loaded.');
});

export const createSubjectHandler = asyncHandler(async (req: Request, res: Response) => {
  return created(res, await createSubject(req.validatedBody.name, req.validatedBody.icon, req.validatedBody.description));
});

export const updateSubjectHandler = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await updateSubject(req.params.id, req.validatedBody), 'Subject updated.');
});

export const deleteSubjectHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteSubject(req.params.id);
  return ok(res, null, 'Subject deleted.');
});

export const listGradesHandler = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await listGrades(), 'Grades loaded.');
});

export const createGradeHandler = asyncHandler(async (req: Request, res: Response) => {
  return created(res, await createGrade(req.validatedBody.name, req.validatedBody.level));
});

export const updateGradeHandler = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await updateGrade(req.params.id, req.validatedBody), 'Grade updated.');
});

export const deleteGradeHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteGrade(req.params.id);
  return ok(res, null, 'Grade deleted.');
});

export const listLocationsHandler = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await listLocations(), 'Locations loaded.');
});

export const createLocationHandler = asyncHandler(async (req: Request, res: Response) => {
  return created(res, await createLocation(req.validatedBody.name, req.validatedBody.address));
});

export const updateLocationHandler = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await updateLocation(req.params.id, req.validatedBody), 'Location updated.');
});

export const deleteLocationHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteLocation(req.params.id);
  return ok(res, null, 'Location deleted.');
});

export const adminTeachersHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listTeachersForAdmin(
    Number(req.query.page ?? 1),
    Number(req.query.limit ?? 20),
    req.query.search as string | undefined,
  );
  return ok(res, result.data, 'Teachers loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

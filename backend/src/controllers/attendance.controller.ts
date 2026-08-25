import type { Request, Response } from 'express';
import {
  finalizeLessonAttendance,
  generateAttendanceQr,
  getAdminAttendanceSummary,
  getLessonAttendanceLive,
  getParentAttendanceOverview,
  getStudentAttendanceSummary,
  listAttendanceAdmin,
  scanAttendance,
  updateAttendanceRecord,
} from '../services/attendance.service';
import { getCenterSettings, updateCenterSettings } from '../services/center.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';
import { ApiError } from '../utils/ApiError';

export const generateQrHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody ?? req.body;
  const result = await generateAttendanceQr(
    { userId: req.user!.id, role: req.user!.role },
    {
      lessonId: body.lessonId,
      latitude: body.latitude !== undefined ? Number(body.latitude) : undefined,
      longitude: body.longitude !== undefined ? Number(body.longitude) : undefined,
      userAgent: (req.headers['user-agent'] as string) ?? undefined,
      ipAddress: req.ip,
    },
  );
  return created(res, result, 'Attendance QR generated.');
});

export const scanHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody ?? req.body;
  const result = await scanAttendance(
    { userId: req.user!.id, role: req.user!.role },
    body.token,
    body.lessonId,
  );
  return ok(res, result, result.alreadyMarked ? 'Student already marked.' : 'Attendance verified.');
});

export const lessonAttendanceHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getLessonAttendanceLive(
    { userId: req.user!.id, role: req.user!.role },
    req.params.lessonId,
  );
  return ok(res, result, 'Attendance loaded.');
});

export const finalizeHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await finalizeLessonAttendance(
    { userId: req.user!.id, role: req.user!.role },
    req.params.lessonId,
  );
  return ok(res, result, 'Lesson attendance finalized.');
});

export const summaryHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getStudentAttendanceSummary(
    { userId: req.user!.id, role: req.user!.role },
    req.params.studentId,
  );
  return ok(res, result, 'Attendance summary loaded.');
});

export const adminListHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listAttendanceAdmin({
    studentId: req.query.studentId as string | undefined,
    teacherId: req.query.teacherId as string | undefined,
    lessonId: req.query.lessonId as string | undefined,
    subjectId: req.query.subjectId as string | undefined,
    status: req.query.status as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    page: Number(req.query.page ?? 1),
    limit: Number(req.query.limit ?? 25),
  });
  return ok(res, result.data, 'Attendance records loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const adminSummaryHandler = asyncHandler(async (req: Request, res: Response) => {
  const summary = await getAdminAttendanceSummary({
    studentId: req.query.studentId as string | undefined,
    teacherId: req.query.teacherId as string | undefined,
    lessonId: req.query.lessonId as string | undefined,
    subjectId: req.query.subjectId as string | undefined,
    status: req.query.status as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  });
  return ok(res, summary, 'Attendance summary loaded.');
});

export const parentOverviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const overview = await getParentAttendanceOverview({ userId: req.user!.id, role: req.user!.role });
  return ok(res, overview, 'Attendance overview loaded.');
});

export const updateHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await updateAttendanceRecord(
    { userId: req.user!.id, role: req.user!.role },
    req.params.id,
    req.validatedBody.status,
    req.validatedBody.note,
  );
  return ok(res, result, 'Attendance updated.');
});

export const centerSettingsGetHandler = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getCenterSettings();
  return ok(res, settings, 'Center settings loaded.');
});

export const centerSettingsUpdateHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody ?? req.body;
  const toNumberOrNull = (v: unknown) =>
    v === undefined || v === null || v === '' ? null : Number(v);
  const settings = await updateCenterSettings({
    name: body.name,
    latitude: body.latitude !== undefined ? toNumberOrNull(body.latitude) : undefined,
    longitude: body.longitude !== undefined ? toNumberOrNull(body.longitude) : undefined,
    radiusMeters: body.radiusMeters !== undefined ? Number(body.radiusMeters) : undefined,
    attendanceGraceMinutes: body.attendanceGraceMinutes !== undefined ? Number(body.attendanceGraceMinutes) : undefined,
    timezone: body.timezone,
    currency: body.currency,
  });
  return ok(res, settings, 'Center settings updated.');
});

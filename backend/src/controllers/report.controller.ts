import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import {
  getCenterDashboard,
  getStudentReport,
  getTeacherReport,
  getAttendanceReport,
  getStudentAttendanceDetail,
  getFinancialReport,
  getSubscriptionReport,
  exportAttendanceCsv,
  exportStudentsCsv,
  exportSettlementsCsv,
  exportInvoicesCsv,
  exportTeachersCsv,
} from '../services/report.service';

const actor = (req: Request) => ({
  userId: req.user!.id,
  role: req.user!.role,
  centerId: req.user!.centerId,
});

// ---- Dashboard ----

export const centerDashboardHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getCenterDashboard(actor(req));
  return ok(res, data, 'Center dashboard loaded.');
});

// ---- Student Reports ----

export const studentReportHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getStudentReport(actor(req), req.params.studentId, {
    from: req.query.from as string,
    to: req.query.to as string,
  });
  return ok(res, data, 'Student report loaded.');
});

// ---- Teacher Reports ----

export const teacherReportHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getTeacherReport(actor(req), req.params.teacherId, {
    from: req.query.from as string,
    to: req.query.to as string,
  });
  return ok(res, data, 'Teacher report loaded.');
});

// ---- Attendance Reports ----

export const attendanceReportHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getAttendanceReport(actor(req), {
    from: req.query.from as string,
    to: req.query.to as string,
    studentId: req.query.studentId as string,
    teacherId: req.query.teacherId as string,
    subjectId: req.query.subjectId as string,
    page: Number(req.query.page ?? 1),
    limit: Number(req.query.limit ?? 50),
  });
  return ok(res, data.records, 'Attendance report loaded.', data.pagination);
});

export const studentAttendanceDetailHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getStudentAttendanceDetail(actor(req), req.params.studentId, {
    from: req.query.from as string,
    to: req.query.to as string,
  });
  return ok(res, data, 'Student attendance detail loaded.');
});

// ---- Financial Reports ----

export const financialReportHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getFinancialReport(actor(req), {
    from: req.query.from as string,
    to: req.query.to as string,
  });
  return ok(res, data, 'Financial report loaded.');
});

// ---- Subscription Reports ----

export const subscriptionReportHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getSubscriptionReport(actor(req), {
    from: req.query.from as string,
    to: req.query.to as string,
  });
  return ok(res, data, 'Subscription report loaded.');
});

// ---- CSV Exports ----

export const exportAttendanceHandler = asyncHandler(async (req: Request, res: Response) => {
  const csv = await exportAttendanceCsv({
    from: req.query.from as string,
    to: req.query.to as string,
    studentId: req.query.studentId as string,
    teacherId: req.query.teacherId as string,
    subjectId: req.query.subjectId as string,
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="attendance-export.csv"');
  return res.status(200).send(csv);
});

export const exportStudentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const csv = await exportStudentsCsv({
    gradeId: req.query.gradeId as string,
    search: req.query.search as string,
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="students-export.csv"');
  return res.status(200).send(csv);
});

export const exportSettlementsHandler = asyncHandler(async (req: Request, res: Response) => {
  const csv = await exportSettlementsCsv({
    from: req.query.from as string,
    to: req.query.to as string,
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="settlements-export.csv"');
  return res.status(200).send(csv);
});

export const exportInvoicesHandler = asyncHandler(async (req: Request, res: Response) => {
  const csv = await exportInvoicesCsv({
    from: req.query.from as string,
    to: req.query.to as string,
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="invoices-export.csv"');
  return res.status(200).send(csv);
});

export const exportTeachersHandler = asyncHandler(async (_req: Request, res: Response) => {
  const csv = await exportTeachersCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="teachers-export.csv"');
  return res.status(200).send(csv);
});

import type { Request, Response } from 'express';
import { teacherRepository } from '../repositories/teacher.repository';
import { parentRepository } from '../repositories/parent.repository';
import { ApiError } from '../utils/ApiError';
import {
  approvePayment,
  cancelSubscription,
  correctPayment,
  createPayment,
  createSubscription,
  exportPaymentsCsv,
  getPayment,
  getSubscription,
  getTeacherPaymentSettings,
  listParentStudents,
  listPayableTeachers,
  listPayments,
  listSubscriptions,
  paymentSummary,
  refundPayment,
  rejectPayment,
  updateTeacherPaymentSettings,
} from '../services/payment.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';

export const teacherSettingsGetHandler = asyncHandler(async (req: Request, res: Response) => {
  const teacher = await requireTeacherId(req);
  const settings = await getTeacherPaymentSettings(teacher);
  return ok(res, settings, 'Payment settings loaded.');
});

export const teacherSettingsUpdateHandler = asyncHandler(async (req: Request, res: Response) => {
  const teacher = await requireTeacherId(req);
  const body = req.validatedBody ?? req.body;
  const settings = await updateTeacherPaymentSettings(teacher, body);
  return ok(res, settings, 'Payment settings updated.');
});

async function requireTeacherId(req: Request): Promise<string> {
  const teacher = await teacherRepository.findByUserId(req.user!.id);
  if (!teacher) throw ApiError.notFound('Teacher profile not found.');
  return teacher.id;
}

export const payableTeachersHandler = asyncHandler(async (_req: Request, res: Response) => {
  const teachers = await listPayableTeachers();
  return ok(res, teachers, 'Teachers loaded.');
});

export const parentStudentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const students = await listParentStudents({ userId: req.user!.id, role: req.user!.role });
  return ok(res, students, 'Students loaded.');
});

export const createHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody ?? req.body;
  const payment = await createPayment(
    { userId: req.user!.id, role: req.user!.role },
    {
      teacherId: body.teacherId,
      studentId: body.studentId,
      type: body.type,
      method: body.method,
      amount: body.amount !== undefined ? Number(body.amount) : undefined,
      lessonId: body.lessonId,
      subscriptionId: body.subscriptionId,
      transactionReference: body.transactionReference,
      proofUrl: req.file?.filename,
    },
  );
  return created(res, payment, 'Payment submitted and awaiting confirmation.');
});

export const listMineHandler = asyncHandler(async (req: Request, res: Response) => {
  const actor = { userId: req.user!.id, role: req.user!.role };
  if (actor.role === 'PARENT') {
    const parent = await parentRepository.findByUserId(req.user!.id);
    const result = await listPayments(actor, {
      parentId: parent?.id,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      type: req.query.type as string | undefined,
      method: req.query.method as string | undefined,
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 25),
      sort: req.query.sort as string | undefined,
    });
    return ok(res, result.data, 'Payments loaded.', {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }
  const result = await listPayments(actor, {
    payerId: req.user!.id,
    search: req.query.search as string | undefined,
    status: req.query.status as string | undefined,
    type: req.query.type as string | undefined,
    method: req.query.method as string | undefined,
    page: Number(req.query.page ?? 1),
    limit: Number(req.query.limit ?? 25),
    sort: req.query.sort as string | undefined,
  });
  return ok(res, result.data, 'Payments loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const listTeacherHandler = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = await requireTeacherId(req);
  const result = await listPayments({ userId: req.user!.id, role: req.user!.role }, {
    teacherId,
    search: req.query.search as string | undefined,
    status: req.query.status as string | undefined,
    type: req.query.type as string | undefined,
    method: req.query.method as string | undefined,
    studentId: req.query.studentId as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    page: Number(req.query.page ?? 1),
    limit: Number(req.query.limit ?? 25),
    sort: req.query.sort as string | undefined,
  });
  return ok(res, result.data, 'Payments loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const adminListHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listPayments({ userId: req.user!.id, role: req.user!.role }, {
    search: req.query.search as string | undefined,
    status: req.query.status as string | undefined,
    type: req.query.type as string | undefined,
    method: req.query.method as string | undefined,
    teacherId: req.query.teacherId as string | undefined,
    studentId: req.query.studentId as string | undefined,
    parentId: req.query.parentId as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    page: Number(req.query.page ?? 1),
    limit: Number(req.query.limit ?? 25),
    sort: req.query.sort as string | undefined,
  });
  return ok(res, result.data, 'Payments loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const getHandler = asyncHandler(async (req: Request, res: Response) => {
  const payment = await getPayment({ userId: req.user!.id, role: req.user!.role }, req.params.id);
  return ok(res, payment, 'Payment loaded.');
});

export const approveHandler = asyncHandler(async (req: Request, res: Response) => {
  const payment = await approvePayment({ userId: req.user!.id, role: req.user!.role }, req.params.id);
  return ok(res, payment, 'Payment approved.');
});

export const rejectHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const payment = await rejectPayment({ userId: req.user!.id, role: req.user!.role }, req.params.id, body.reason);
  return ok(res, payment, 'Payment rejected.');
});

export const refundHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const payment = await refundPayment(
    { userId: req.user!.id, role: req.user!.role },
    req.params.id,
    body.reason,
    body.amount !== undefined ? Number(body.amount) : undefined,
  );
  return ok(res, payment, 'Payment refunded.');
});

export const correctHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody ?? req.body;
  const payment = await correctPayment(
    { userId: req.user!.id, role: req.user!.role },
    req.params.id,
    body.status,
    body.note,
  );
  return ok(res, payment, 'Payment updated.');
});

export const summaryHandler = asyncHandler(async (req: Request, res: Response) => {
  const summary = await paymentSummary({
    search: req.query.search as string | undefined,
    status: req.query.status as string | undefined,
    type: req.query.type as string | undefined,
    method: req.query.method as string | undefined,
    teacherId: req.query.teacherId as string | undefined,
    studentId: req.query.studentId as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  });
  return ok(res, summary, 'Payment summary loaded.');
});

export const exportHandler = asyncHandler(async (req: Request, res: Response) => {
  const csv = await exportPaymentsCsv({
    search: req.query.search as string | undefined,
    status: req.query.status as string | undefined,
    type: req.query.type as string | undefined,
    method: req.query.method as string | undefined,
    teacherId: req.query.teacherId as string | undefined,
    studentId: req.query.studentId as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="payments-export.csv"');
  return res.status(200).send(csv);
});

// Subscriptions ------------------------------------------------------------

export const createSubscriptionHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody ?? req.body;
  const sub = await createSubscription({ userId: req.user!.id, role: req.user!.role }, {
    teacherId: body.teacherId,
    studentId: body.studentId,
    method: body.method,
    months: body.months !== undefined ? Number(body.months) : undefined,
  });
  return created(res, sub, 'Subscription created.');
});

export const listSubscriptionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const subs = await listSubscriptions(
    { userId: req.user!.id, role: req.user!.role },
    req.query.studentId as string | undefined,
  );
  return ok(res, subs, 'Subscriptions loaded.');
});

export const getSubscriptionHandler = asyncHandler(async (req: Request, res: Response) => {
  const sub = await getSubscription({ userId: req.user!.id, role: req.user!.role }, req.params.id);
  return ok(res, sub, 'Subscription loaded.');
});

export const cancelSubscriptionHandler = asyncHandler(async (req: Request, res: Response) => {
  const sub = await cancelSubscription({ userId: req.user!.id, role: req.user!.role }, req.params.id);
  return ok(res, sub, 'Subscription cancelled.');
});

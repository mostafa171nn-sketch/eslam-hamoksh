import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import {
  enrollStudent,
  cancelEnrollment,
  getLessonEnrollments,
  getStudentEnrollments,
} from '../services/session.service';

export const enrollStudentHandler = asyncHandler(async (req: Request, res: Response) => {
  const { lessonId } = req.params;
  const { studentId } = req.validatedBody ?? req.body;
  const enrollment = await enrollStudent(lessonId, studentId, {
    userId: req.user!.id,
    role: req.user!.role,
  });
  return ok(res, enrollment, 'Student enrolled.');
});

export const cancelEnrollmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const enrollment = await cancelEnrollment(req.params.enrollmentId, {
    userId: req.user!.id,
    role: req.user!.role,
  });
  return ok(res, enrollment, 'Enrollment cancelled.');
});

export const getLessonEnrollmentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const enrollments = await getLessonEnrollments(req.params.lessonId, {
    userId: req.user!.id,
    role: req.user!.role,
  });
  return ok(res, enrollments, 'Enrollments loaded.');
});

export const getStudentEnrollmentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const enrollments = await getStudentEnrollments(req.params.studentId, {
    userId: req.user!.id,
    role: req.user!.role,
  });
  return ok(res, enrollments, 'Student enrollments loaded.');
});

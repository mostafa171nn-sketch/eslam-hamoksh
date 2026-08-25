import type { Request, Response } from 'express';
import {
  createAssignment,
  getAssignment,
  getStudentAssignments,
  gradeSubmission,
  listAssignments,
  listSubmissionsForAssignment,
  submitAssignment,
} from '../services/assignment.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { teacherRepository } from '../repositories/teacher.repository';

export const listAssignmentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listAssignments(
    { userId: req.user!.id, role: req.user!.role },
    {
      status: req.query.status as string | undefined,
      studentId: req.query.studentId as string | undefined,
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 20),
    },
  );
  return ok(res, result.data, 'Assignments loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const createAssignmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await createAssignment(
    { userId: req.user!.id, role: req.user!.role as 'TEACHER' | 'CENTER_ADMIN' | 'SUPER_ADMIN' },
    {
      ...req.validatedBody,
      attachment: req.file?.filename ?? req.validatedBody.attachment,
      deadline: new Date(req.validatedBody.deadline),
    },
  );
  return created(res, assignment, 'Assignment published successfully.');
});

export const getStudentAssignmentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const result = await getStudentAssignments(studentId, page, limit);
  return ok(res, result.data, 'Assignments loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const submitAssignmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const submission = await submitAssignment(
    { userId: req.user!.id, role: req.user!.role },
    req.params.assignmentId,
    { file: req.file?.filename, textAnswer: req.validatedBody?.textAnswer },
  );
  return created(res, submission, 'Homework submitted successfully.');
});

export const listSubmissionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listSubmissionsForAssignment(
    req.params.assignmentId,
    { userId: req.user!.id, role: req.user!.role },
    Number(req.query.page ?? 1),
    Number(req.query.limit ?? 50),
  );
  return ok(res, result.data, 'Submissions loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const gradeSubmissionHandler = asyncHandler(async (req: Request, res: Response) => {
  const updated = await gradeSubmission(
    { userId: req.user!.id, role: req.user!.role },
    req.params.submissionId,
    req.validatedBody,
  );
  return ok(res, updated, 'Submission graded.');
});

export async function requireStudentOrAdminAccess(studentId: string, req: Request) {
  const { resolveRoleEntity } = await import('../services/lesson.service.js');
  const role = req.user!.role;
  if (role === 'CENTER_ADMIN' || role === 'SUPER_ADMIN') return;
  if (role === 'STUDENT') {
    const me = await resolveRoleEntity(req.user!.id, role);
    if (me.studentId !== studentId) throw ApiError.forbidden('You cannot access another student\'s data.');
    return;
  }
  if (role === 'PARENT') {
    const { assertParentOwnsChild } = await import('../services/parent.service.js');
    await assertParentOwnsChild(req.user!.id, studentId);
    return;
  }
  if (role === 'TEACHER') {
    const me = await resolveRoleEntity(req.user!.id, role);
    const rel = await teacherRepository.findTeacherStudent(me.teacherId!, studentId);
    if (!rel) throw ApiError.forbidden('You can only access your own students.');
  }
}

export const getStudentAssignmentsForParentHandler = asyncHandler(async (req: Request, res: Response) => {
  await requireStudentOrAdminAccess(req.params.studentId, req);
  const result = await getStudentAssignments(
    req.params.studentId,
    Number(req.query.page ?? 1),
    Number(req.query.limit ?? 20),
  );
  return ok(res, result.data, 'Assignments loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const getAssignmentDetailHandler = asyncHandler(async (req: Request, res: Response) => {
  const a = await getAssignment(req.params.id);
  return ok(res, a, 'Assignment loaded.');
});

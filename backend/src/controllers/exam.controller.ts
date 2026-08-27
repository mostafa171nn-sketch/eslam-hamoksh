import type { Request, Response } from 'express';
import {
  createExam,
  getAttemptWithResult,
  getExamDetail,
  getExamResults,
  gradeWrittenAnswer,
  listExams,
  saveExamAnswer,
  startExam,
  submitExam,
} from '../services/exam.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';

export const listExamsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listExams(
    { userId: req.user!.id, role: req.user!.role },
    {
      status: req.query.status as string | undefined,
      studentId: req.query.studentId as string | undefined,
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 20),
    },
  );
  return ok(res, result.data, 'Exams loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const createExamHandler = asyncHandler(async (req: Request, res: Response) => {
  const exam = await createExam(
    { userId: req.user!.id, role: req.user!.role as 'TEACHER' | 'CENTER_ADMIN' | 'ADMIN' | 'SUPER_ADMIN' },
    {
      ...req.validatedBody,
      startTime: new Date(req.validatedBody.startTime),
      endTime: new Date(req.validatedBody.endTime),
      durationMinutes: Number(req.validatedBody.durationMinutes),
    },
  );
  return created(res, exam, 'Exam created successfully.');
});

export const getExamDetailHandler = asyncHandler(async (req: Request, res: Response) => {
  const exam = await getExamDetail(req.params.id, { userId: req.user!.id, role: req.user!.role });
  return ok(res, exam, 'Exam loaded.');
});

export const startExamHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await startExam({ userId: req.user!.id, role: req.user!.role }, req.params.id);
  return ok(res, result, 'Exam started.');
});

export const saveAnswerHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await saveExamAnswer(
    { userId: req.user!.id, role: req.user!.role },
    req.params.attemptId,
    req.params.questionId,
    req.validatedBody.answer,
  );
  return ok(res, result, 'Answer saved.');
});

export const submitExamHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await submitExam({ userId: req.user!.id, role: req.user!.role }, req.params.attemptId);
  return ok(res, result, result.autoSubmitted ? 'Exam auto-submitted.' : 'Exam submitted.');
});

export const getAttemptResultHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getAttemptWithResult(req.params.attemptId, { userId: req.user!.id, role: req.user!.role });
  return ok(res, result, 'Result loaded.');
});

export const gradeWrittenHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await gradeWrittenAnswer(
    req.params.attemptId,
    req.params.questionId,
    Number(req.validatedBody.points),
    { userId: req.user!.id, role: req.user!.role },
  );
  return ok(res, result, 'Answer graded.');
});

export const examResultsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getExamResults(req.params.id, { userId: req.user!.id, role: req.user!.role });
  return ok(res, result, 'Exam results loaded.');
});

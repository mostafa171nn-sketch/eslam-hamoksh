import type { Request, Response } from 'express';
import {
  bookLesson,
  createLesson,
  getLessonAttendance,
  getLessonForUser,
  getStudentAttendanceForUser,
  listLessonsForUser,
  markAttendance,
  updateLesson,
} from '../services/lesson.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';

export const listLessonsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listLessonsForUser(
    { userId: req.user!.id, role: req.user!.role },
    {
      studentId: req.query.studentId as string | undefined,
      teacherId: req.query.teacherId as string | undefined,
      status: req.query.status as string | undefined,
      date: req.query.date as string | undefined,
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 20),
    },
  );
  return ok(res, result.data, 'Lessons loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const createLessonHandler = asyncHandler(async (req: Request, res: Response) => {
  const lesson = await createLesson({ userId: req.user!.id, role: req.user!.role }, req.validatedBody);
  return created(res, lesson, 'Lesson scheduled successfully.');
});

export const createGroupLessonHandler = asyncHandler(async (req: Request, res: Response) => {
  const lesson = await createLesson({ userId: req.user!.id, role: req.user!.role }, req.validatedBody);
  return created(res, lesson, 'Group lesson created successfully.');
});

export const bookLessonHandler = asyncHandler(async (req: Request, res: Response) => {
  const lesson = await bookLesson({ userId: req.user!.id, role: req.user!.role }, req.validatedBody);
  return created(res, lesson, 'Lesson booked successfully.');
});

export const getLessonHandler = asyncHandler(async (req: Request, res: Response) => {
  const lesson = await getLessonForUser(req.params.id, { userId: req.user!.id, role: req.user!.role });
  return ok(res, lesson, 'Lesson loaded.');
});

export const updateLessonHandler = asyncHandler(async (req: Request, res: Response) => {
  const lesson = await updateLesson(req.params.id, { userId: req.user!.id, role: req.user!.role }, req.validatedBody);
  return ok(res, lesson, 'Lesson updated successfully.');
});

export const lessonAttendanceHandler = asyncHandler(async (req: Request, res: Response) => {
  const records = await getLessonAttendance(req.params.id, { userId: req.user!.id, role: req.user!.role });
  return ok(res, records, 'Attendance loaded.');
});

export const markAttendanceHandler = asyncHandler(async (req: Request, res: Response) => {
  const record = await markAttendance(
    req.params.id,
    { userId: req.user!.id, role: req.user!.role },
    req.validatedBody.studentId,
    req.validatedBody.status,
    req.validatedBody.note,
  );
  return ok(res, record, 'Attendance marked.');
});

export const studentAttendanceHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getStudentAttendanceForUser(
    { userId: req.user!.id, role: req.user!.role },
    req.params.studentId,
    Number(req.query.page ?? 1),
    Number(req.query.limit ?? 50),
  );
  return ok(res, result.data, 'Attendance loaded.', {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

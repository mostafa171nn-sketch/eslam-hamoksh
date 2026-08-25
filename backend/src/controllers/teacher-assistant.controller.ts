import type { Request, Response } from 'express';
import {
  assignTeacherToAssistant,
  listAssistantTeachers,
  listTeacherAssistants,
  removeTeacherFromAssistant,
} from '../services/teacher-assistant.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';

export const assignTeacherHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await assignTeacherToAssistant(req.validatedBody, req.user!.id);
  return created(res, result, 'Teacher assigned to assistant.');
});

export const removeTeacherHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await removeTeacherFromAssistant(req.params.assistantId, req.params.teacherId, req.user!.id);
  return ok(res, result, 'Teacher unlinked from assistant.');
});

export const myTeachersHandler = asyncHandler(async (req: Request, res: Response) => {
  const teachers = await listAssistantTeachers(req.user!.id);
  return ok(res, teachers, 'Assigned teachers loaded.');
});

export const teacherAssistantsHandler = asyncHandler(async (req: Request, res: Response) => {
  const assistants = await listTeacherAssistants(req.params.teacherId);
  return ok(res, assistants, 'Assistants loaded.');
});

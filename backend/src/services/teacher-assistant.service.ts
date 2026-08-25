import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { teacherAssistantRepository } from '../repositories/teacher-assistant.repository';
import { teacherRepository } from '../repositories/teacher.repository';
import { userRepository } from '../repositories/user.repository';
import { recordActivity } from './activity.service';

/**
 * Returns the list of teacher IDs that the given TEACHER_ASSISTANT user is
 * assigned to. Returns an empty array for non-assistant roles.
 */
export async function getAssistantTeacherIds(userId: string): Promise<string[]> {
  return teacherAssistantRepository.findTeacherIdsForAssistant(userId);
}

/**
 * Returns true if the given TEACHER_ASSISTANT user is assigned to the specified
 * teacher. For non-assistant roles this always returns false (they use their own
 * entity-based ownership checks instead).
 */
export async function isAssistantOfTeacher(userId: string, teacherId: string): Promise<boolean> {
  const link = await teacherAssistantRepository.findByAssistantAndTeacher(userId, teacherId);
  return !!link;
}

/**
 * Returns true if the given TEACHER_ASSISTANT user is allowed to access the
 * specified student. The assistant must be assigned to at least one teacher who
 * has a TeacherStudent relationship with the student.
 */
export async function isAssistantLinkedToStudent(userId: string, studentId: string): Promise<boolean> {
  const teacherIds = await getAssistantTeacherIds(userId);
  if (teacherIds.length === 0) return false;
  const link = await prisma.teacherStudent.findFirst({
    where: { studentId, teacherId: { in: teacherIds } },
  });
  return !!link;
}

/**
 * Returns true if the given TEACHER_ASSISTANT user is allowed to access the
 * specified lesson. The assistant must be assigned to the lesson's teacher.
 */
export async function isAssistantLinkedToLesson(userId: string, lessonId: string): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { teacherId: true },
  });
  if (!lesson) return false;
  return isAssistantOfTeacher(userId, lesson.teacherId);
}

/**
 * Returns true if the given TEACHER_ASSISTANT user is allowed to access the
 * specified assignment. The assistant must be assigned to the assignment's teacher.
 */
export async function isAssistantLinkedToAssignment(userId: string, assignmentId: string): Promise<boolean> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { teacherId: true },
  });
  if (!assignment) return false;
  return isAssistantOfTeacher(userId, assignment.teacherId);
}

/**
 * Returns true if the given TEACHER_ASSISTANT user is allowed to access the
 * specified exam. The assistant must be assigned to the exam's teacher.
 */
export async function isAssistantLinkedToExam(userId: string, examId: string): Promise<boolean> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { teacherId: true },
  });
  if (!exam) return false;
  return isAssistantOfTeacher(userId, exam.teacherId);
}

/**
 * Returns true if the given TEACHER_ASSISTANT user is allowed to access the
 * specified exam attempt. The assistant must be assigned to the attempt's exam teacher.
 */
export async function isAssistantLinkedToAttempt(userId: string, attemptId: string): Promise<boolean> {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { exam: { select: { teacherId: true } } },
  });
  if (!attempt) return false;
  return isAssistantOfTeacher(userId, attempt.exam.teacherId);
}

// ---------------------------------------------------------------------------
// CRUD: Admin manages assistant ↔ teacher assignments
// ---------------------------------------------------------------------------

export interface AssignTeacherInput {
  assistantId: string;
  teacherId: string;
}

export async function assignTeacherToAssistant(input: AssignTeacherInput, actorId: string) {
  const assistantUser = await userRepository.findById(input.assistantId);
  if (!assistantUser) throw ApiError.notFound('Assistant user not found.');
  if (assistantUser.role !== 'TEACHER_ASSISTANT') {
    throw ApiError.badRequest('User is not a teacher assistant.', 'NOT_ASSISTANT');
  }

  const teacher = await teacherRepository.findById(input.teacherId);
  if (!teacher) throw ApiError.notFound('Teacher not found.');

  const existing = await teacherAssistantRepository.findByAssistantAndTeacher(
    input.assistantId,
    input.teacherId,
  );
  if (existing) {
    throw ApiError.conflict('This assistant is already assigned to this teacher.', 'ALREADY_ASSIGNED');
  }

  await teacherAssistantRepository.upsert(
    input.assistantId,
    input.teacherId,
    teacher.centerId ?? undefined,
  );

  await recordActivity({
    userId: actorId,
    action: 'assigned_teacher_to_assistant',
    entity: 'TeacherAssistant',
    entityId: input.teacherId,
    details: JSON.stringify({ assistantId: input.assistantId }),
  });

  return { assistantId: input.assistantId, teacherId: input.teacherId };
}

export async function removeTeacherFromAssistant(
  assistantId: string,
  teacherId: string,
  actorId: string,
) {
  const link = await teacherAssistantRepository.findByAssistantAndTeacher(assistantId, teacherId);
  if (!link) {
    throw ApiError.notFound('Assignment not found.');
  }

  await teacherAssistantRepository.delete({
    where: { assistantId_teacherId: { assistantId, teacherId } },
  });

  await recordActivity({
    userId: actorId,
    action: 'removed_teacher_from_assistant',
    entity: 'TeacherAssistant',
    entityId: teacherId,
    details: JSON.stringify({ assistantId }),
  });

  return { removed: true };
}

export async function listAssistantTeachers(assistantId: string) {
  return teacherAssistantRepository.findTeachersForAssistant(assistantId);
}

export async function listTeacherAssistants(teacherId: string) {
  const rows = await prisma.teacherAssistant.findMany({
    where: { teacherId },
    include: {
      assistant: {
        select: { id: true, fullName: true, phone: true, photo: true, status: true },
      },
    },
  });
  return rows.map((r) => ({
    id: r.assistant.id,
    fullName: r.assistant.fullName,
    phone: r.assistant.phone,
    photo: r.assistant.photo,
    status: r.assistant.status,
  }));
}

import { AttemptStatus, ExamQuestionType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from './activity.service';
import { sendNotification } from './notification.service';
import { resolveRoleEntity } from './lesson.service';
import { teacherAssignableStudentIds } from './teacher.service';
import { examRepository } from '../repositories/exam.repository';
import { teacherRepository } from '../repositories/teacher.repository';
import { studentRepository } from '../repositories/student.repository';
import {
  isAssistantOfTeacher,
  isAssistantLinkedToExam,
  isAssistantLinkedToAttempt,
  getAssistantTeacherIds,
} from './teacher-assistant.service';

export interface QuestionInput {
  type: ExamQuestionType;
  question: string;
  options?: string[];
  correctAnswer?: string;
  points?: number;
  order?: number;
}

export interface CreateExamInput {
  name: string;
  description?: string;
  subjectId?: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  studentIds?: string[];
  allStudents?: boolean;
  questions: QuestionInput[];
}

function normalizeAnswer(answer: string | null | undefined): string {
  return (answer ?? '').trim().toLowerCase();
}

export async function createExam(
  actor: { userId: string; role: 'TEACHER' | 'CENTER_ADMIN' | 'SUPER_ADMIN' },
  input: CreateExamInput,
) {
  if (actor.role !== 'TEACHER') {
    throw ApiError.forbidden('Only teachers can create exams.');
  }
  const teacher = await teacherRepository.findByUserId(actor.userId);
  if (!teacher) throw ApiError.notFound('Teacher profile not found.');
  const teacherId = teacher.id;

  if (input.endTime <= input.startTime) {
    throw ApiError.badRequest('Exam end time must be after start time.', 'INVALID_EXAM_WINDOW');
  }
  if (input.durationMinutes <= 0 || input.durationMinutes > 24 * 60) {
    throw ApiError.badRequest('Exam duration must be between 1 minute and 24 hours.', 'INVALID_DURATION');
  }
  if (!input.questions || input.questions.length === 0) {
    throw ApiError.badRequest('An exam must have at least one question.', 'NO_QUESTIONS');
  }

  for (const q of input.questions) {
    if (!q.question?.trim()) {
      throw ApiError.badRequest('Every question needs a text.', 'INVALID_QUESTION');
    }
    if (q.points !== undefined && (q.points <= 0 || q.points > 1000)) {
      throw ApiError.badRequest('Question points must be positive.', 'INVALID_POINTS');
    }
    if (q.type !== 'WRITTEN') {
      if (!q.correctAnswer) {
        throw ApiError.badRequest(`Question "${q.question.slice(0, 40)}" is missing a correct answer.`, 'MISSING_CORRECT_ANSWER');
      }
      if (q.type === 'MULTIPLE_CHOICE' && (!q.options || q.options.length < 2)) {
        throw ApiError.badRequest(`Question "${q.question.slice(0, 40)}" needs at least 2 options.`, 'MISSING_OPTIONS');
      }
      if (q.type === 'MULTIPLE_CHOICE' && q.options && !q.options.includes(q.correctAnswer)) {
        throw ApiError.badRequest(`The correct answer must be one of the options for "${q.question.slice(0, 40)}".`, 'INVALID_CORRECT_ANSWER');
      }
      if (q.type === 'TRUE_FALSE' && !['true', 'false'].includes(normalizeAnswer(q.correctAnswer))) {
        throw ApiError.badRequest('True/False questions need "true" or "false" as the correct answer.', 'INVALID_TRUE_FALSE');
      }
    }
  }

  const assignable = await teacherAssignableStudentIds(teacherId);
  let targets: string[] = [];
  if (input.allStudents) {
    targets = assignable;
  } else if (input.studentIds && input.studentIds.length > 0) {
    const invalid = input.studentIds.filter((s) => !assignable.includes(s));
    if (invalid.length > 0) {
      throw ApiError.forbidden('You can only assign exams to your own students.');
    }
    targets = input.studentIds;
  } else {
    throw ApiError.badRequest('Select at least one student or choose "All my students".');
  }

  const exam = await prisma.$transaction(async (tx) => {
    const e = await tx.exam.create({
      data: {
        teacherId,
        subjectId: input.subjectId ?? null,
        name: input.name,
        description: input.description,
        startTime: input.startTime,
        endTime: input.endTime,
        durationMinutes: input.durationMinutes,
        students: { create: targets.map((studentId) => ({ studentId })) },
        questions: {
          create: input.questions.map((q, i) => ({
            type: q.type,
            question: q.question,
            options: q.type === 'MULTIPLE_CHOICE' ? JSON.stringify(q.options ?? []) : null,
            correctAnswer: q.type === 'WRITTEN' ? null : q.correctAnswer,
            points: q.points ?? 1,
            order: q.order ?? i,
          })),
        },
      },
    });
    return e;
  });

  const studentUsers = await studentRepository.findMany({ where: { id: { in: targets } }, select: { userId: true } });
  await sendNotification(
    studentUsers.map((s) => ({
      userId: s.userId,
      type: 'EXAM' as const,
      title: 'New exam scheduled',
      message: `${input.name} starts at ${input.startTime.toISOString()} and ends at ${input.endTime.toISOString()}.`,
    })),
  );

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'created_exam',
    entity: 'Exam',
    entityId: exam.id,
  });

  return exam;
}

// ---------------------------------------------------------------------------
// Reading exams
// ---------------------------------------------------------------------------

export const EXAM_INCLUDE = {
  teacher: { include: { user: { select: { fullName: true, photo: true } } } },
  subject: true,
  students: { include: { student: { include: { user: { select: { fullName: true } } } } } },
  questions: { orderBy: { order: 'asc' as const } },
  attempts: true,
} as const;

function toExamDto(exam: any, includeAnswers: boolean) {
  return {
    id: exam.id,
    name: exam.name,
    description: exam.description,
    startTime: exam.startTime,
    endTime: exam.endTime,
    durationMinutes: exam.durationMinutes,
    createdAt: exam.createdAt,
    subject: exam.subject,
    teacher: exam.teacher
      ? { id: exam.teacher.id, fullName: exam.teacher.user.fullName }
      : null,
    students: exam.students.map((s: any) => ({
      studentId: s.studentId,
      fullName: s.student.user.fullName,
    })),
    questions: exam.questions.map((q: any) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options ? JSON.parse(q.options) : undefined,
      points: q.points,
      order: q.order,
      correctAnswer: includeAnswers ? q.correctAnswer : undefined,
    })),
  };
}

export async function listExams(
  actor: { userId: string; role: string },
  query: { status?: string; page?: number; limit?: number; studentId?: string },
) {
  const { page = 1, limit = 20 } = query;
  const { teacherId, studentId, parentId } = await resolveRoleEntity(actor.userId, actor.role as any);

  let where: any = {};
  if (actor.role === 'TEACHER') {
    where = { teacherId };
  } else if (actor.role === 'STUDENT') {
    where = { students: { some: { studentId: studentId! } } };
  } else if (actor.role === 'PARENT') {
    if (query.studentId) {
      const owns = await studentRepository.findParentStudent(parentId!, query.studentId);
      if (!owns) throw ApiError.forbidden("You can only view your own children's exams.");
      where = { students: { some: { studentId: query.studentId } } };
    } else {
      const children = await studentRepository.findParentStudents(parentId!);
      where = { students: { some: { studentId: { in: children.map((c) => c.studentId) } } } };
    }
  } else if (actor.role === 'TEACHER_ASSISTANT') {
    const teacherIds = await getAssistantTeacherIds(actor.userId);
    if (teacherIds.length === 0) {
      return { data: [], page, limit, total: 0, totalPages: 0 };
    }
    where = { teacherId: { in: teacherIds } };
  } else {
    where = {};
  }

  const now = new Date();
  if (query.status === 'upcoming') where.startTime = { gt: now };
  if (query.status === 'active') where.startTime = { lte: now };
  if (query.status === 'active') where.endTime = { gte: now };
  if (query.status === 'ended') where.endTime = { lt: now };

  const [total, exams] = await Promise.all([
    examRepository.count(where),
    examRepository.findMany({
      where,
      orderBy: { startTime: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: EXAM_INCLUDE,
    }) as any,
  ]);

  return {
    data: exams.map((e: any) => {
      const dto: any = toExamDto(e, actor.role !== 'STUDENT' && actor.role !== 'PARENT');
      const nowValue = Date.now();
      dto.isUpcoming = new Date(e.startTime).getTime() > nowValue;
      dto.isActive = new Date(e.startTime).getTime() <= nowValue && new Date(e.endTime).getTime() >= nowValue;
      dto.isEnded = new Date(e.endTime).getTime() < nowValue;
      const myAttempt = e.attempts.find((a: any) => a.studentId === studentId);
      if (myAttempt) {
        dto.myAttempt = {
          status: myAttempt.status,
          score: myAttempt.score,
          percentage: myAttempt.percentage,
          maxScore: myAttempt.maxScore,
          startedAt: myAttempt.startedAt,
          submittedAt: myAttempt.submittedAt,
        };
      }
      return dto;
    }),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getExamDetail(examId: string, actor: { userId: string; role: string }) {
  const exam = await examRepository.findUnique({ id: examId }, EXAM_INCLUDE) as any;
  if (!exam) throw ApiError.notFound('Exam not found.');

  const { teacherId, studentId, parentId } = await resolveRoleEntity(actor.userId, actor.role as any);

  if (actor.role === 'TEACHER') {
    if (exam.teacherId !== teacherId) throw ApiError.forbidden('You can only view your own exams.');
  }
  if (actor.role === 'STUDENT') {
    const assigned = exam.students.some((s: any) => s.studentId === studentId);
    if (!assigned) throw ApiError.forbidden('This exam is not assigned to you.');
  }
  if (actor.role === 'PARENT') {
    const childIds = exam.students.map((s: any) => s.studentId);
    const children = await studentRepository.findParentStudents(parentId!);
    if (!children.some((c) => childIds.includes(c.studentId))) throw ApiError.forbidden("You can only view your own children's exams.");
  }
  if (actor.role === 'TEACHER_ASSISTANT') {
    const linked = await isAssistantLinkedToExam(actor.userId, examId);
    if (!linked) throw ApiError.forbidden('You can only view exams of your assigned teachers.');
  }

  const now = Date.now();
  const includeAnswers = actor.role === 'TEACHER' || actor.role === 'CENTER_ADMIN' || actor.role === 'SUPER_ADMIN';
  const dto: any = toExamDto(exam, includeAnswers);
  dto.isUpcoming = new Date(exam.startTime).getTime() > now;
  dto.isActive = new Date(exam.startTime).getTime() <= now && new Date(exam.endTime).getTime() >= now;
  dto.isEnded = new Date(exam.endTime).getTime() < now;

  if (actor.role === 'STUDENT' || actor.role === 'PARENT') {
    // Hide questions until the exam is running (students get them via start).
    if (!dto.isActive) dto.questions = [];
  }

  const myAttempt = await examRepository.findAttemptByExamAndStudent(examId, studentId ?? '').catch(() => null);
  if (myAttempt) {
    dto.myAttempt = {
      status: myAttempt.status,
      score: myAttempt.score,
      percentage: myAttempt.percentage,
      maxScore: myAttempt.maxScore,
      startedAt: myAttempt.startedAt,
      submittedAt: myAttempt.submittedAt,
    };
  }

  return dto;
}

// ---------------------------------------------------------------------------
// Attempt lifecycle
// ---------------------------------------------------------------------------

async function finalizeAttempt(attemptId: string): Promise<void> {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: { include: { questions: true } },
      answers: true,
    },
  });
  if (!attempt || attempt.status === 'SUBMITTED' || attempt.status === 'AUTO_SUBMITTED') return;

  const questions = attempt.exam.questions;
  const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

  let score = 0;
  let maxScore = 0;
  let correct = 0;
  let total = 0;

  const gradedAnswers = questions.map((q) => {
    const ans = answerMap.get(q.id);
    maxScore += q.points;
    total += 1;
    if (!ans) return { attemptId, questionId: q.id, points: 0, isCorrect: null };
    if (q.type === 'WRITTEN') {
      return { attemptId, questionId: q.id, points: ans.points ?? 0, isCorrect: null };
    }
    const isCorrect = normalizeAnswer(ans.answer) === normalizeAnswer(q.correctAnswer);
    if (isCorrect) {
      score += q.points;
      correct += 1;
    }
    return { attemptId, questionId: q.id, points: isCorrect ? q.points : 0, isCorrect };
  });

  await prisma.$transaction(async (tx) => {
    for (const g of gradedAnswers) {
      await tx.examAnswer.updateMany({
        where: { attemptId: g.attemptId, questionId: g.questionId },
        data: { points: g.points, isCorrect: g.isCorrect },
      });
    }
    await tx.examAttempt.update({
      where: { id: attemptId },
      data: {
        submittedAt: new Date(),
        score,
        maxScore,
        percentage: maxScore > 0 ? (score / maxScore) * 100 : 0,
        correctCount: correct,
        totalCount: total,
        status: 'SUBMITTED',
      },
    });
  });
}

export async function startExam(
  actor: { userId: string; role: string },
  examId: string,
) {
  const { studentId } = await resolveRoleEntity(actor.userId, actor.role as any);
  if (!studentId) throw ApiError.forbidden('Only students can start exams.');

  const exam = await examRepository.findUnique({ id: examId }, { students: true, questions: { orderBy: { order: 'asc' } } }) as any;
  if (!exam) throw ApiError.notFound('Exam not found.');
  if (!exam.students.some((s: any) => s.studentId === studentId)) {
    throw ApiError.forbidden('This exam is not assigned to you.');
  }

  const now = Date.now();
  if (now < exam.startTime.getTime()) {
    throw ApiError.badRequest(
      `Exam hasn't started yet. It starts at ${exam.startTime.toISOString()}.`,
      'EXAM_NOT_STARTED',
    );
  }
  if (now > exam.endTime.getTime()) {
    throw ApiError.badRequest('The exam time has ended. You can no longer start it.', 'EXAM_ENDED');
  }

  const existing = await examRepository.findAttemptByExamAndStudent(examId, studentId);

  if (existing && existing.status === 'SUBMITTED') {
    return {
      attempt: existing,
      questions: exam.questions.map((q: any) => ({ id: q.id, type: q.type, question: q.question, options: q.options ? JSON.parse(q.options) : undefined, points: q.points, order: q.order })),
      alreadySubmitted: true,
    };
  }

  let attempt = existing;
  if (!attempt) {
    attempt = await prisma.examAttempt.create({
      data: { examId, studentId },
      include: { answers: true },
    });
  } else if (attempt.status === 'IN_PROGRESS') {
    // Resume: if the window passed, finalize.
    if (now > exam.endTime.getTime()) {
      await finalizeAttempt(attempt.id);
      attempt = await prisma.examAttempt.findUnique({ where: { id: attempt.id }, include: { answers: true } });
    }
  }

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'started_exam',
    entity: 'Exam',
    entityId: examId,
  });

  return {
    attempt,
    questions: exam.questions.map((q: any) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options ? JSON.parse(q.options) : undefined,
      points: q.points,
      order: q.order,
    })),
    alreadySubmitted: false,
  };
}

export async function saveExamAnswer(
  actor: { userId: string; role: string },
  attemptId: string,
  questionId: string,
  answer: string | null,
) {
  const { studentId } = await resolveRoleEntity(actor.userId, actor.role as any);
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: { select: { endTime: true, startTime: true } } },
  });
  if (!attempt || attempt.studentId !== studentId) {
    throw ApiError.forbidden('You cannot modify this exam attempt.');
  }
  if (attempt.status !== 'IN_PROGRESS') {
    throw ApiError.badRequest('This exam attempt is no longer active.', 'ATTEMPT_CLOSED');
  }
  const now = Date.now();
  if (now < attempt.exam.startTime.getTime()) {
    throw ApiError.badRequest('Exam has not started yet.', 'EXAM_NOT_STARTED');
  }
  if (now > attempt.exam.endTime.getTime()) {
    await finalizeAttempt(attemptId);
    throw ApiError.badRequest('The exam time has ended.', 'EXAM_ENDED');
  }

  await examRepository.upsertAnswer({ attemptId, questionId, answer: answer ?? '' });

  return { saved: true };
}

export async function submitExam(
  actor: { userId: string; role: string },
  attemptId: string,
) {
  const { studentId } = await resolveRoleEntity(actor.userId, actor.role as any);
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: { select: { endTime: true, teacherId: true } } },
  });
  if (!attempt || attempt.studentId !== studentId) {
    throw ApiError.forbidden('You cannot submit this exam attempt.');
  }
  if (attempt.status === 'SUBMITTED' || attempt.status === 'AUTO_SUBMITTED') {
    return { attempt: await examRepository.findAttempt(attemptId), alreadySubmitted: true };
  }

  const now = Date.now();
  const ended = now > attempt.exam.endTime.getTime();
  await finalizeAttempt(attemptId);

  const final = await examRepository.findAttempt(attemptId);
  if (ended) {
    await examRepository.updateAttempt(attemptId, { status: 'AUTO_SUBMITTED' });
    final!.status = 'AUTO_SUBMITTED';
  }

  const student = await studentRepository.findById(studentId);
  const teacher = await teacherRepository.findById(attempt.exam.teacherId);

  await sendNotification([
    {
      userId: student?.userId ?? '',
      type: 'RESULT',
      title: 'Exam submitted',
      message: `Your exam has been submitted. Score: ${final?.score}/${final?.maxScore ?? 0}.`,
    },
    {
      userId: teacher?.userId ?? '',
      type: 'GENERAL',
      title: 'Exam submitted',
      message: 'A student submitted the exam.',
    },
  ]);

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: ended ? 'exam_auto_submitted' : 'submitted_exam',
    entity: 'ExamAttempt',
    entityId: attemptId,
  });

  return { attempt: final, autoSubmitted: ended };
}

export async function getAttemptWithResult(attemptId: string, actor: { userId: string; role: string }) {
  const { studentId, teacherId, parentId } = await resolveRoleEntity(actor.userId, actor.role as any);

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: { include: { teacher: { include: { user: { select: { fullName: true } } } }, subject: true, questions: true } },
      answers: true,
    },
  });
  if (!attempt) throw ApiError.notFound('Attempt not found.');

  const canView =
    actor.role === 'CENTER_ADMIN' || actor.role === 'SUPER_ADMIN' ||
    (actor.role === 'STUDENT' && attempt.studentId === studentId) ||
    (actor.role === 'TEACHER' && attempt.exam.teacherId === teacherId);

  if (actor.role === 'PARENT') {
    const owns = await studentRepository.findParentStudent(parentId!, attempt.studentId);
    if (!owns) throw ApiError.forbidden("You can only view your own children's results.");
  } else if (actor.role === 'TEACHER_ASSISTANT') {
    const linked = await isAssistantLinkedToAttempt(actor.userId, attemptId);
    if (!linked) throw ApiError.forbidden('You can only view results for exams of your assigned teachers.');
  } else if (!canView) {
    throw ApiError.forbidden('You are not authorized to view this result.');
  }

  const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const isOwner = actor.role === 'STUDENT' && attempt.studentId === studentId;
  const showCorrect = actor.role === 'TEACHER' || actor.role === 'CENTER_ADMIN' || actor.role === 'SUPER_ADMIN' || attempt.status === 'SUBMITTED' || attempt.status === 'AUTO_SUBMITTED';

  return {
    id: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    score: attempt.score,
    maxScore: attempt.maxScore,
    percentage: attempt.percentage ? Math.round(attempt.percentage) : null,
    correctCount: attempt.correctCount,
    totalCount: attempt.totalCount,
    exam: {
      id: attempt.exam.id,
      name: attempt.exam.name,
      subject: attempt.exam.subject,
      teacher: attempt.exam.teacher ? attempt.exam.teacher.user.fullName : null,
    },
    isOwner,
    questions: attempt.exam.questions
      .sort((a, b) => a.order - b.order)
      .map((q) => {
        const ans = answerMap.get(q.id);
        return {
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options ? JSON.parse(q.options) : undefined,
          points: q.points,
          yourAnswer: ans?.answer ?? null,
          isCorrect: showCorrect ? ans?.isCorrect ?? null : null,
          correctAnswer: showCorrect ? q.correctAnswer : undefined,
          pointsEarned: ans?.points ?? 0,
          graded: q.type === 'WRITTEN' && showCorrect,
        };
      }),
  };
}

export async function gradeWrittenAnswer(
  attemptId: string,
  questionId: string,
  points: number,
  actor: { userId: string; role: string },
) {
  const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId }, include: { exam: { select: { teacherId: true } } } });
  if (!attempt) throw ApiError.notFound('Attempt not found.');
  if (actor.role === 'TEACHER') {
    const teacher = await teacherRepository.findByUserId(actor.userId);
    if (!teacher || teacher.id !== attempt.exam.teacherId) {
      throw ApiError.forbidden('You can only grade your own exams.');
    }
  }
  if (actor.role === 'TEACHER_ASSISTANT') {
    const linked = await isAssistantLinkedToAttempt(actor.userId, attemptId);
    if (!linked) {
      throw ApiError.forbidden('You can only grade exams of your assigned teachers.');
    }
  }

  const question = await prisma.examQuestion.findUnique({ where: { id: questionId } });
  if (!question || question.examId !== attempt.examId) {
    throw ApiError.notFound('Question not found.');
  }
  if (question.type !== 'WRITTEN') {
    throw ApiError.badRequest('Only written questions require manual grading.', 'NOT_WRITTEN');
  }
  if (points < 0 || points > question.points) {
    throw ApiError.badRequest(`Points must be between 0 and ${question.points}.`, 'INVALID_POINTS');
  }

  await prisma.examAnswer.update({
    where: { attemptId_questionId: { attemptId, questionId } },
    data: { points, isCorrect: points > 0 },
  });

  await finalizeAttempt(attemptId);
  return { saved: true };
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export async function getExamResults(examId: string, actor: { userId: string; role: string }) {
  const exam = await examRepository.findUnique({ id: examId }, {
    teacher: { include: { user: { select: { fullName: true } } } },
    students: { include: { student: { include: { user: { select: { fullName: true, photo: true } } } } } },
    attempts: { include: { answers: true } },
  }) as any;
  if (!exam) throw ApiError.notFound('Exam not found.');

  if (actor.role === 'TEACHER') {
    const teacher = await teacherRepository.findByUserId(actor.userId);
    if (!teacher || teacher.id !== exam.teacherId) {
      throw ApiError.forbidden('You can only view results for your own exams.');
    }
  }
  if (actor.role === 'TEACHER_ASSISTANT') {
    const linked = await isAssistantLinkedToExam(actor.userId, examId);
    if (!linked) {
      throw ApiError.forbidden('You can only view results for exams of your assigned teachers.');
    }
  }

  const attemptMap = new Map<string, any>(exam.attempts.map((a: any) => [a.studentId, a]));
  const results = exam.students.map((s: any) => {
    const a: any = attemptMap.get(s.studentId);
    const writtenPending = a ? a.answers.some((ans: any) => ans.isCorrect === null) : false;
    return {
      student: { id: s.studentId, fullName: s.student.user.fullName, photo: s.student.user.photo },
      status: a?.status ?? 'NOT_STARTED',
      score: a?.score ?? null,
      maxScore: a?.maxScore ?? 0,
      percentage: a?.percentage != null ? Math.round(a.percentage) : null,
      submittedAt: a?.submittedAt ?? null,
      writtenPending,
    };
  });

  const submitted = results.filter((r: any) => r.status === 'SUBMITTED' || r.status === 'AUTO_SUBMITTED');
  const scores: number[] = submitted.map((r: any) => r.percentage ?? 0);
  const passRate =
    scores.length > 0
      ? (scores.filter((s: number) => s >= 50).length / scores.length) * 100
      : 0;

  return {
    exam: { id: exam.id, name: exam.name },
    summary: {
      totalStudents: results.length,
      submitted: submitted.length,
      absent: results.length - submitted.length,
      average: scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0,
      highest: scores.length ? Math.max(...scores) : 0,
      lowest: scores.length ? Math.min(...scores) : 0,
      passRate: Math.round(passRate),
    },
    results,
  };
}

// ---------------------------------------------------------------------------
// Auto-submission sweeper
// ---------------------------------------------------------------------------

export async function sweepExpiredAttempts(): Promise<number> {
  const expired = await prisma.examAttempt.findMany({
    where: { status: 'IN_PROGRESS', exam: { endTime: { lt: new Date() } } },
    select: { id: true },
  });

  for (const e of expired) {
    await finalizeAttempt(e.id);
    await examRepository.updateAttempt(e.id, { status: 'AUTO_SUBMITTED' });
  }
  return expired.length;
}

export { finalizeAttempt };

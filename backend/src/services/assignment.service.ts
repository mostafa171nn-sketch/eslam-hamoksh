import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { fileUrl } from '../middleware/upload';
import { recordActivity } from './activity.service';
import { sendNotification } from './notification.service';
import { teacherAssignableStudentIds } from './teacher.service';
import { resolveRoleEntity } from './lesson.service';
import { assignmentRepository } from '../repositories/assignment.repository';
import { studentRepository } from '../repositories/student.repository';
import {
  isAssistantOfTeacher,
  isAssistantLinkedToAssignment,
  getAssistantTeacherIds,
} from './teacher-assistant.service';

export interface CreateAssignmentInput {
  title: string;
  description?: string;
  subjectId?: string;
  attachment?: string;
  studentIds?: string[];
  allStudents?: boolean;
  deadline: Date;
}

export async function createAssignment(
  actor: { userId: string; role: 'TEACHER' | 'CENTER_ADMIN' | 'ADMIN' | 'SUPER_ADMIN' },
  input: CreateAssignmentInput,
) {
  let teacherId: string;
  if (actor.role === 'CENTER_ADMIN' || actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN') {
    throw ApiError.forbidden('Only teachers can create assignments.');
  } else {
    const t = await prisma.teacher.findUnique({ where: { userId: actor.userId }, select: { id: true } });
    if (!t) throw ApiError.notFound('Teacher profile not found.');
    teacherId = t.id;
  }

  const assignable = await teacherAssignableStudentIds(teacherId);

  let targets: string[] = [];
  if (input.allStudents) {
    targets = assignable;
  } else if (input.studentIds && input.studentIds.length > 0) {
    const invalid = input.studentIds.filter((s) => !assignable.includes(s));
    if (invalid.length > 0) {
      throw ApiError.forbidden('You can only assign homework to your own students.');
    }
    targets = input.studentIds;
  } else {
    throw ApiError.badRequest('Select at least one student or choose "All my students".');
  }

  const assignment = await prisma.$transaction(async (tx) => {
    const a = await tx.assignment.create({
      data: {
        teacherId,
        subjectId: input.subjectId ?? null,
        title: input.title,
        description: input.description,
        attachment: input.attachment ?? null,
        deadline: input.deadline,
        students: { create: targets.map((studentId) => ({ studentId })) },
      },
    });
    return a;
  });

  const studentUsers = await prisma.student.findMany({
    where: { id: { in: targets } },
    select: { userId: true, user: { select: { fullName: true } } },
  });

  await sendNotification(
    studentUsers.map((s) => ({
      userId: s.userId,
      type: 'HOMEWORK' as const,
      title: 'New homework assignment',
      message: `${input.title} was assigned by your teacher. Deadline: ${input.deadline.toISOString()}.`,
    })),
  );

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'created_assignment',
    entity: 'Assignment',
    entityId: assignment.id,
  });

  return assignment;
}

const ASSIGNMENT_INCLUDE = {
  teacher: { include: { user: { select: { fullName: true, photo: true } } } },
  subject: true,
  students: { include: { student: { include: { user: { select: { fullName: true, photo: true } } } } } },
  submissions: true,
} as const;

export async function listAssignments(
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
      if (!owns) throw ApiError.forbidden("You can only view your own children's assignments.");
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

  const [total, assignments] = await Promise.all([
    assignmentRepository.count(where),
    prisma.assignment.findMany({
      where,
      orderBy: { deadline: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: ASSIGNMENT_INCLUDE,
    }),
  ]);

  const data = assignments.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    attachment: fileUrl(a.attachment),
    deadline: a.deadline,
    createdAt: a.createdAt,
    subject: a.subject,
    teacher: a.teacher
      ? { id: a.teacher.id, fullName: a.teacher.user.fullName, photo: fileUrl(a.teacher.user.photo) }
      : null,
    studentCount: a.students.length,
    submittedCount: a.submissions.length,
    submissions: a.submissions.map((s) => ({
      studentId: s.studentId,
      status: s.status,
      grade: s.grade,
      submittedAt: s.submittedAt,
    })),
  }));

  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function getAssignment(assignmentId: string) {
  const a = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      ...ASSIGNMENT_INCLUDE,
    },
  });
  if (!a) throw ApiError.notFound('Assignment not found.');
  return a;
}

export async function getStudentAssignments(
  studentId: string,
  page = 1,
  limit = 20,
) {
  const where = { students: { some: { studentId } } };
  const [total, assignments] = await Promise.all([
    assignmentRepository.count(where),
    prisma.assignment.findMany({
      where,
      orderBy: { deadline: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        teacher: { include: { user: { select: { fullName: true, photo: true } } } },
        subject: true,
        submissions: { where: { studentId } },
      },
    }),
  ]);

  const now = new Date();
  return {
    data: assignments.map((a) => {
      const sub = a.submissions[0];
      const status = sub
        ? sub.status
        : a.deadline < now
          ? 'NOT_SUBMITTED'
          : 'NOT_SUBMITTED';
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        attachment: fileUrl(a.attachment),
        deadline: a.deadline,
        createdAt: a.createdAt,
        subject: a.subject,
        teacher: { id: a.teacher.id, fullName: a.teacher.user.fullName, photo: fileUrl(a.teacher.user.photo) },
        status,
        submission: sub
          ? {
              id: sub.id,
              file: fileUrl(sub.file),
              textAnswer: sub.textAnswer,
              submittedAt: sub.submittedAt,
              grade: sub.grade,
              feedback: sub.feedback,
            }
          : null,
      };
    }),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function submitAssignment(
  actor: { userId: string; role: string },
  assignmentId: string,
  input: { file?: string; textAnswer?: string },
) {
  if (!input.file && !input.textAnswer) {
    throw ApiError.badRequest('Upload a file or write an answer to submit.', 'EMPTY_SUBMISSION');
  }

  const { studentId } = await resolveRoleEntity(actor.userId, actor.role as any);
  if (!studentId) throw ApiError.notFound('Student profile not found.');

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, title: true, deadline: true, teacherId: true, students: { select: { studentId: true } } },
  });
  if (!assignment) throw ApiError.notFound('Assignment not found.');
  if (!assignment.students.some((s) => s.studentId === studentId)) {
    throw ApiError.forbidden('This assignment is not assigned to you.');
  }

  const submittedAt = new Date();
  const status = submittedAt > assignment.deadline ? 'LATE' : 'SUBMITTED';

  const submission = await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    create: {
      assignmentId,
      studentId,
      file: input.file ?? null,
      textAnswer: input.textAnswer,
      submittedAt,
      status,
    },
    update: {
      file: input.file ?? undefined,
      textAnswer: input.textAnswer,
      submittedAt,
      status,
    },
  });

  const teacher = await prisma.teacher.findUnique({
    where: { id: assignment.teacherId },
    select: { userId: true },
  });
  if (teacher) {
    await sendNotification({
      userId: teacher.userId,
      type: 'GENERAL',
      title: 'Homework submitted',
      message: `A student submitted homework for "${assignment.title}".`,
    });
  }

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'submitted_homework',
    entity: 'Assignment',
    entityId: assignmentId,
  });

  return submission;
}

export async function gradeSubmission(
  actor: { userId: string; role: string },
  submissionId: string,
  input: { grade: number; feedback?: string },
) {
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: { assignment: { select: { teacherId: true } }, student: { select: { userId: true } } },
  });
  if (!submission) throw ApiError.notFound('Submission not found.');

  if (actor.role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({ where: { userId: actor.userId }, select: { id: true } });
    if (!teacher || teacher.id !== submission.assignment.teacherId) {
      throw ApiError.forbidden('You can only grade your own students\' homework.');
    }
  }
  if (actor.role === 'TEACHER_ASSISTANT') {
    const linked = await isAssistantLinkedToAssignment(actor.userId, submission.assignmentId);
    if (!linked) {
      throw ApiError.forbidden('You can only grade assignments for your assigned teachers.');
    }
  }

  if (input.grade < 0 || input.grade > 100) {
    throw ApiError.badRequest('Grade must be between 0 and 100.', 'INVALID_GRADE');
  }

  const updated = await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: { grade: input.grade, feedback: input.feedback, status: 'GRADED', gradedAt: new Date() },
  });

  await sendNotification({
    userId: submission.student.userId,
    type: 'GRADED',
    title: 'Homework graded',
    message: `Your homework was graded: ${input.grade}/100.`,
  });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'graded_assignment',
    entity: 'AssignmentSubmission',
    entityId: submissionId,
  });

  return updated;
}

export async function listSubmissionsForAssignment(
  assignmentId: string,
  actor: { userId: string; role: string },
  page = 1,
  limit = 50,
) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { teacherId: true, deadline: true, students: { select: { studentId: true } } },
  });
  if (!assignment) throw ApiError.notFound('Assignment not found.');

  if (actor.role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({ where: { userId: actor.userId }, select: { id: true } });
    if (!teacher || teacher.id !== assignment.teacherId) {
      throw ApiError.forbidden('You can only view submissions for your own assignments.');
    }
  }
  if (actor.role === 'TEACHER_ASSISTANT') {
    const linked = await isAssistantLinkedToAssignment(actor.userId, assignmentId);
    if (!linked) {
      throw ApiError.forbidden('You can only view submissions for assignments of your assigned teachers.');
    }
  }

  const studentIds = assignment.students.map((s) => s.studentId);
  const [total, students] = await Promise.all([
    studentRepository.count({ id: { in: studentIds } }),
    prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        user: { select: { fullName: true, photo: true } },
        submissions: { where: { assignmentId } },
      },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const now = new Date();
  return {
    data: students.map((s) => {
      const sub = s.submissions[0];
      const status = sub ? sub.status : assignment.deadline < now ? 'NOT_SUBMITTED' : 'NOT_SUBMITTED';
      return {
        student: { id: s.id, fullName: s.user.fullName, photo: fileUrl(s.user.photo) },
        status,
        submission: sub
          ? {
              id: sub.id,
              file: fileUrl(sub.file),
              textAnswer: sub.textAnswer,
              submittedAt: sub.submittedAt,
              grade: sub.grade,
              feedback: sub.feedback,
            }
          : null,
      };
    }),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

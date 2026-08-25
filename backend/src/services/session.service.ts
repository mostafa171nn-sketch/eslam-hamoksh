import { Role } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../lib/prisma';
import { lessonRepository } from '../repositories/lesson.repository';
import { lessonEnrollmentRepository } from '../repositories/lesson-enrollment.repository';
import { studentRepository } from '../repositories/student.repository';
import { teacherRepository } from '../repositories/teacher.repository';
import { recordActivity } from './activity.service';
import { sendNotification } from './notification.service';
import { timesOverlap } from './lesson.service';
import {
  isAssistantOfTeacher,
  isAssistantLinkedToStudent,
} from './teacher-assistant.service';

// ---------------------------------------------------------------------------
// Enrollment management
// ---------------------------------------------------------------------------

export async function enrollStudent(
  lessonId: string,
  studentId: string,
  actor: { userId: string; role: Role },
) {
  const lesson = await lessonRepository.findById(lessonId);
  if (!lesson) throw ApiError.notFound('Lesson not found.');
  if (lesson.status === 'CANCELLED') throw ApiError.badRequest('Cannot enroll in a cancelled lesson.');
  if (!lesson.capacity || lesson.capacity <= 1) {
    throw ApiError.badRequest('This is not a group lesson. Use the standard booking flow.');
  }

  // Access control
  if (actor.role === 'TEACHER') {
    const me = await teacherRepository.findByUserId(actor.userId);
    if (!me || me.id !== lesson.teacherId) {
      throw ApiError.forbidden('You can only manage enrollments for your own lessons.');
    }
  }
  if (actor.role === 'PARENT') {
    // Parent can enroll their own child
    const parent = await prisma.parent.findUnique({ where: { userId: actor.userId }, select: { id: true } });
    if (!parent) throw ApiError.notFound('Parent profile not found.');
    const owns = await studentRepository.findParentStudent(parent.id, studentId);
    if (!owns) throw ApiError.forbidden("You can only enroll your own children.");
  }
  if (actor.role === 'STUDENT') {
    const me = await studentRepository.findByUserId(actor.userId);
    if (!me || me.id !== studentId) {
      throw ApiError.forbidden('You can only enroll yourself.');
    }
  }

  const student = await studentRepository.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found.');

  // Check if already enrolled
  const existing = await lessonEnrollmentRepository.findByLessonAndStudent(lessonId, studentId);
  if (existing && existing.status === 'ENROLLED') {
    throw ApiError.badRequest('Student is already enrolled in this lesson.', 'ALREADY_ENROLLED');
  }

  // Check capacity
  const enrolledCount = await lessonEnrollmentRepository.countActiveByLesson(lessonId);
  if (enrolledCount >= lesson.capacity) {
    throw ApiError.badRequest('This lesson has reached its maximum capacity.', 'LESSON_FULL');
  }

  // Check schedule conflict for the student
  const conflict = await lessonEnrollmentRepository.findStudentConflict(
    studentId, lesson.date, lesson.startTime, lesson.endTime, lessonId,
  );
  if (conflict) {
    throw ApiError.conflict(
      `This student already has a lesson at ${conflict.lesson.startTime}-${conflict.lesson.endTime}.`,
      'SCHEDULE_CONFLICT',
    );
  }

  const enrollment = await prisma.$transaction(async (tx) => {
    // Cancel existing enrollment if re-enrolling
    if (existing) {
      return tx.lessonEnrollment.update({
        where: { id: existing.id },
        data: { status: 'ENROLLED', enrolledAt: new Date(), enrolledBy: actor.userId },
      });
    }
    return tx.lessonEnrollment.create({
      data: {
        lesson: { connect: { id: lessonId } },
        student: { connect: { id: studentId } },
        enrolledBy: actor.userId,
      },
    });
  });

  // Auto-create TeacherStudent link
  await prisma.teacherStudent.upsert({
    where: { teacherId_studentId: { teacherId: lesson.teacherId, studentId } },
    create: { teacherId: lesson.teacherId, studentId },
    update: {},
  });

  const studentUser = await prisma.user.findUnique({ where: { id: student.userId }, select: { fullName: true } });
  const teacherUser = await prisma.user.findUnique({
    where: { id: (await teacherRepository.findById(lesson.teacherId))?.userId ?? '' },
    select: { fullName: true },
  });

  if (teacherUser) {
    await sendNotification({
      userId: teacherUser.fullName ? (await teacherRepository.findById(lesson.teacherId))?.userId ?? '' : '',
      type: 'GENERAL',
      title: 'New enrollment',
      message: `${studentUser?.fullName} has been enrolled in your group lesson on ${lesson.date.toISOString().slice(0, 10)}.`,
    });
  }

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'enrolled_student',
    entity: 'LessonEnrollment',
    entityId: enrollment.id,
  });

  return enrollment;
}

export async function cancelEnrollment(
  enrollmentId: string,
  actor: { userId: string; role: Role },
) {
  const enrollment = await lessonEnrollmentRepository.findById(enrollmentId);
  if (!enrollment) throw ApiError.notFound('Enrollment not found.');
  if (enrollment.status !== 'ENROLLED') throw ApiError.badRequest('Enrollment is not active.');

  if (actor.role === 'TEACHER') {
    const me = await teacherRepository.findByUserId(actor.userId);
    if (!me || me.id !== enrollment.lesson.teacherId) {
      throw ApiError.forbidden('You can only cancel enrollments for your own lessons.');
    }
  }
  if (actor.role === 'STUDENT') {
    const me = await studentRepository.findByUserId(actor.userId);
    if (!me || me.id !== enrollment.studentId) {
      throw ApiError.forbidden('You can only cancel your own enrollment.');
    }
  }
  if (actor.role === 'PARENT') {
    const parent = await prisma.parent.findUnique({ where: { userId: actor.userId }, select: { id: true } });
    if (!parent) throw ApiError.notFound('Parent profile not found.');
    const owns = await studentRepository.findParentStudent(parent.id, enrollment.studentId);
    if (!owns) throw ApiError.forbidden("You can only cancel your child's enrollment.");
  }

  return lessonEnrollmentRepository.cancelEnrollment(enrollmentId);
}

export async function getLessonEnrollments(
  lessonId: string,
  actor: { userId: string; role: Role },
) {
  const lesson = await lessonRepository.findById(lessonId);
  if (!lesson) throw ApiError.notFound('Lesson not found.');

  // Access check
  if (actor.role === 'TEACHER') {
    const me = await teacherRepository.findByUserId(actor.userId);
    if (!me || me.id !== lesson.teacherId) {
      throw ApiError.forbidden('You can only view enrollments for your own lessons.');
    }
  }
  if (actor.role === 'TEACHER_ASSISTANT') {
    const { getAssistantTeacherIds } = await import('./teacher-assistant.service.js');
    const teacherIds = await getAssistantTeacherIds(actor.userId);
    if (!teacherIds.includes(lesson.teacherId)) {
      throw ApiError.forbidden('You can only view enrollments for your assigned teachers.');
    }
  }

  return lessonEnrollmentRepository.findActiveByLesson(lessonId);
}

export async function getStudentEnrollments(
  studentId: string,
  actor: { userId: string; role: Role },
) {
  if (actor.role === 'STUDENT') {
    const me = await studentRepository.findByUserId(actor.userId);
    if (!me || me.id !== studentId) {
      throw ApiError.forbidden('You can only view your own enrollments.');
    }
  }
  if (actor.role === 'PARENT') {
    const parent = await prisma.parent.findUnique({ where: { userId: actor.userId }, select: { id: true } });
    if (!parent) throw ApiError.notFound('Parent profile not found.');
    const owns = await studentRepository.findParentStudent(parent.id, studentId);
    if (!owns) throw ApiError.forbidden("You can only view your child's enrollments.");
  }

  return lessonEnrollmentRepository.findActiveByStudent(studentId);
}

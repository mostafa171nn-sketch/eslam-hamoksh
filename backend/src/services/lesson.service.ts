import { AttendanceStatus, LessonStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getTenantContext } from '../lib/tenant';
import { ApiError } from '../utils/ApiError';
import { fileUrl } from '../middleware/upload';
import { recordActivity } from './activity.service';
import { sendNotification } from './notification.service';
import { DAYS } from './teacher.service';
import { lessonRepository } from '../repositories/lesson.repository';
import { teacherRepository } from '../repositories/teacher.repository';
import { studentRepository } from '../repositories/student.repository';
import {
  isAssistantOfTeacher,
  isAssistantLinkedToStudent,
  isAssistantLinkedToLesson,
  getAssistantTeacherIds,
} from './teacher-assistant.service';

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}

/** Extracts the role-specific entity id for the authenticated user. */
export async function resolveRoleEntity(userId: string, role: Role) {
  if (role === 'TEACHER') {
    const t = await teacherRepository.findByUserId(userId);
    return { teacherId: t?.id ?? null, studentId: null, parentId: null };
  }
  if (role === 'STUDENT') {
    const s = await studentRepository.findByUserId(userId);
    return { teacherId: null, studentId: s?.id ?? null, parentId: null };
  }
  if (role === 'PARENT') {
    const p = await prisma.parent.findUnique({ where: { userId }, select: { id: true } });
    return { teacherId: null, studentId: null, parentId: p?.id ?? null };
  }
  if (role === 'TEACHER_ASSISTANT') {
    return { teacherId: null, studentId: null, parentId: null, isAssistant: true as const };
  }
  return { teacherId: null, studentId: null, parentId: null };
}

async function assertNoConflicts(
  teacherId: string,
  studentId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeLessonId?: string,
  tx: Prisma.TransactionClient = prisma as unknown as Prisma.TransactionClient,
) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const overlaps = await tx.lesson.findMany({
    where: {
      status: { in: ['SCHEDULED', 'RESCHEDULED'] },
      date: { gte: dayStart, lt: dayEnd },
      ...(excludeLessonId ? { id: { not: excludeLessonId } } : {}),
      OR: [{ teacherId }, { studentId }],
    },
    select: { id: true, teacherId: true, studentId: true, startTime: true, endTime: true },
  });

  for (const l of overlaps) {
    if (!timesOverlap(startTime, endTime, l.startTime, l.endTime)) continue;
    const conflictRole =
      l.teacherId === teacherId && l.studentId === studentId
        ? 'both parties'
        : l.teacherId === teacherId
          ? 'teacher'
          : 'student';
    throw ApiError.conflict(
      `This time conflicts with another lesson for the ${conflictRole}.`,
      'SCHEDULE_CONFLICT',
    );
  }
}

export interface CreateLessonInput {
  teacherId: string;
  studentId?: string;
  subjectId?: string;
  date: Date;
  startTime: string;
  endTime: string;
  locationId?: string;
  roomId?: string;
  capacity?: number;
  notes?: string;
}

export async function createLesson(
  actor: { userId: string; role: Role },
  input: CreateLessonInput,
) {
  if (input.startTime >= input.endTime) {
    throw ApiError.badRequest('Start time must be before end time.', 'INVALID_TIME_RANGE');
  }

  const isGroupLesson = !!input.capacity && input.capacity > 1;

  const teacher = await teacherRepository.findById(input.teacherId);
  if (!teacher) throw ApiError.notFound('Teacher not found.');

  // For 1:1 lessons, studentId is required
  if (!isGroupLesson && !input.studentId) {
    throw ApiError.badRequest('studentId is required for 1:1 lessons.');
  }

  if (input.studentId) {
    const student = await studentRepository.findById(input.studentId);
    if (!student) throw ApiError.notFound('Student not found.');
  }

  if (actor.role === 'TEACHER') {
    const me = await resolveRoleEntity(actor.userId, actor.role);
    if (me.teacherId !== input.teacherId) {
      throw ApiError.forbidden('You cannot schedule lessons for another teacher.');
    }
  }
  if (actor.role === 'PARENT' && input.studentId) {
    const me = await resolveRoleEntity(actor.userId, actor.role);
    const owns = await studentRepository.findParentStudent(me.parentId!, input.studentId);
    if (!owns) {
      throw ApiError.forbidden("You can only manage your own children's lessons.");
    }
  }
  if (actor.role === 'STUDENT' && input.studentId) {
    const me = await resolveRoleEntity(actor.userId, actor.role);
    if (me.studentId !== input.studentId) {
      throw ApiError.forbidden('You cannot schedule lessons for another student.');
    }
  }

  // Room conflict check
  if (input.roomId) {
    const { roomRepository } = await import('../repositories/room.repository.js');
    const room = await roomRepository.findById(input.roomId);
    if (!room) throw ApiError.notFound('Room not found.');
    const bookedInRoom = await roomRepository.findAvailableForLesson(
      teacher.centerId ?? '', input.date, input.startTime, input.endTime,
    );
    if (bookedInRoom.some((r) => r.id === input.roomId)) {
      throw ApiError.conflict('This room is already booked for this time slot.', 'ROOM_CONFLICT');
    }
  }

  const lesson = await prisma.$transaction(async (tx) => {
    // Conflict check runs inside the transaction so that concurrent bookings
    // for the same teacher/time are serialized and the later one is rejected.
    if (!isGroupLesson && input.studentId) {
      await assertNoConflicts(
        input.teacherId,
        input.studentId,
        input.date,
        input.startTime,
        input.endTime,
        undefined,
        tx,
      );

      await tx.teacherStudent.upsert({
        where: {
          teacherId_studentId: { teacherId: input.teacherId, studentId: input.studentId },
        },
        create: { teacherId: input.teacherId, studentId: input.studentId },
        update: {},
      });
    } else {
      // For group lessons, only check teacher conflicts
      const dayStart = new Date(input.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const teacherConflict = await tx.lesson.findFirst({
        where: {
          teacherId: input.teacherId,
          status: { in: ['SCHEDULED', 'RESCHEDULED'] },
          date: { gte: dayStart, lt: dayEnd },
          startTime: { lt: input.endTime },
          endTime: { gt: input.startTime },
        },
      });
      if (teacherConflict) {
        throw ApiError.conflict('This teacher already has a lesson at this time.', 'SCHEDULE_CONFLICT');
      }
    }

    return tx.lesson.create({
      data: {
        teacherId: input.teacherId,
        studentId: input.studentId ?? null,
        subjectId: input.subjectId ?? null,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        locationId: input.locationId ?? null,
        roomId: input.roomId ?? null,
        capacity: input.capacity ?? null,
        notes: input.notes,
      },
    });
  });

  const dayName = DAYS[new Date(input.date).getDay()] ?? '';
  const teacherUser = await prisma.user.findUnique({ where: { id: teacher.userId } });

  // Notify teacher
  await sendNotification({
    userId: teacher.userId,
    type: 'LESSON_CHANGE',
    title: isGroupLesson ? 'New group lesson scheduled' : 'New lesson scheduled',
    message: `New ${isGroupLesson ? 'group ' : ''}lesson on ${dayName} ${input.date.toISOString().slice(0, 10)} at ${input.startTime}${isGroupLesson ? ` (capacity: ${input.capacity})` : ''}.`,
  });

  // Notify student for 1:1
  if (input.studentId) {
    const student = await studentRepository.findById(input.studentId);
    if (student) {
      const studentUser = await prisma.user.findUnique({ where: { id: student.userId } });
      await sendNotification({
        userId: student.userId,
        type: 'LESSON_CHANGE',
        title: 'New lesson scheduled',
        message: `New lesson with ${teacherUser?.fullName} on ${dayName} ${input.date.toISOString().slice(0, 10)} at ${input.startTime}.`,
      });
    }
  }

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'created_lesson',
    entity: 'Lesson',
    entityId: lesson.id,
  });

  return lesson;
}

/**
 * Student-initiated booking. The student id is derived from the authenticated
 * user (never from the request body). All business rules are enforced here:
 * valid teacher, eligibility (subject/grade), teacher availability, no past
 * bookings, and slot uniqueness. The underlying createLesson performs an atomic
 * conflict check so concurrent bookings cannot reserve the same teacher/time.
 */
export async function bookLesson(
  actor: { userId: string; role: Role },
  input: {
    teacherId: string;
    subjectId?: string;
    date: string;
    startTime: string;
    endTime?: string;
    locationId?: string;
  },
) {
  if (actor.role !== 'STUDENT') {
    throw ApiError.forbidden('Only students can book lessons.');
  }
  const me = await resolveRoleEntity(actor.userId, actor.role);
  if (!me.studentId) throw ApiError.notFound('Student profile not found.');
  const studentId = me.studentId;

  const teacher = await prisma.teacher.findUnique({
    where: { id: input.teacherId },
    select: {
      id: true,
      userId: true,
      hourlyRate: true,
      subjects: { select: { subjectId: true } },
      grades: { select: { gradeId: true } },
    },
  });
  if (!teacher) throw ApiError.notFound('Teacher not found.');

  const student = await studentRepository.findUnique({
    where: { id: studentId },
    select: { id: true, gradeId: true },
  });
  if (!student) throw ApiError.notFound('Student not found.');

  // Parse the requested date as a local midnight.
  const [y, m, d] = input.date.split('-').map(Number);
  if (!y || !m || !d) throw ApiError.badRequest('Invalid date.', 'INVALID_DATE');
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) throw ApiError.badRequest('Invalid date.', 'INVALID_DATE');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    throw ApiError.badRequest('You cannot book a lesson in the past.', 'PAST_DATE');
  }

  if (input.startTime >= (input.endTime ?? input.startTime)) {
    throw ApiError.badRequest('Start time must be before end time.', 'INVALID_TIME_RANGE');
  }

  // Eligibility: subject must be taught by the teacher.
  if (input.subjectId) {
    if (!teacher.subjects.some((s) => s.subjectId === input.subjectId)) {
      throw ApiError.badRequest('This teacher does not teach the selected subject.', 'SUBJECT_NOT_TAUGHT');
    }
  }

  // Eligibility: grade is enforced only when the teacher restricts grades.
  if (teacher.grades.length > 0 && student.gradeId && !teacher.grades.some((g) => g.gradeId === student.gradeId)) {
    throw ApiError.badRequest('This teacher does not teach your grade level.', 'GRADE_NOT_ELIGIBLE');
  }

  // Availability: the chosen time must match a teacher availability slot for the
  // requested weekday. If only a start time was supplied, derive the end time.
  const availability = await teacherRepository.findAvailabilityByDay(teacher.id, date.getDay());
  const slot = availability.find((a) => a.startTime === input.startTime);
  if (!slot) {
    throw ApiError.badRequest(
      'The selected time is not within the teacher’s available schedule.',
      'SLOT_UNAVAILABLE',
    );
  }
  const endTime = input.endTime ?? slot.endTime;
  if (input.startTime >= endTime) {
    throw ApiError.badRequest('Start time must be before end time.', 'INVALID_TIME_RANGE');
  }

  // Reject bookings for later today that have already passed.
  const now = new Date();
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate() &&
    timeToMinutes(input.startTime) <= now.getHours() * 60 + now.getMinutes()
  ) {
    throw ApiError.badRequest('You cannot book a lesson in the past.', 'PAST_TIME');
  }

  try {
    return await createLesson(actor, {
      teacherId: teacher.id,
      studentId,
      subjectId: input.subjectId,
      date,
      startTime: input.startTime,
      endTime,
      locationId: input.locationId,
    });
  } catch (err) {
    if (err instanceof ApiError && err.code === 'SCHEDULE_CONFLICT') {
      throw ApiError.conflict('This time slot is no longer available.', 'SLOT_UNAVAILABLE');
    }
    throw err;
  }
}

/**
 * Returns the bookable slots for a teacher within a date range, computed by
 * intersecting the teacher's weekly availability with already-scheduled
 * lessons. Slots in the past are excluded. `bookedByMe` is set when the viewer
 * is the student who already holds that slot.
 */
export async function getAvailableSlots(
  teacherId: string,
  fromStr?: string,
  toStr?: string,
  viewerStudentId?: string,
) {
  const teacher = await teacherRepository.findById(teacherId);
  if (!teacher) throw ApiError.notFound('Teacher not found.');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseLocal = (s?: string) => {
    if (!s) return null;
    const [yy, mm, dd] = s.split('-').map(Number);
    if (!yy || !mm || !dd) return null;
    return new Date(yy, mm - 1, dd);
  };

  let from = parseLocal(fromStr) ?? new Date(today);
  let to = parseLocal(toStr) ?? new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (from < today) from = new Date(today);

  const fromStart = new Date(from);
  fromStart.setHours(0, 0, 0, 0);
  const toEnd = new Date(to);
  toEnd.setHours(0, 0, 0, 0);
  toEnd.setDate(toEnd.getDate() + 1);

  const availability = await teacherRepository.findAvailability(teacherId);

  const lessons = await lessonRepository.findScheduledByTeacherAndDateRange(teacherId, fromStart, toEnd);

  const pad = (n: number) => String(n).padStart(2, '0');
  const localDateStr = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = localDateStr(now);

  const slots: {
    date: string;
    day: number;
    startTime: string;
    endTime: string;
    locationId: string | null;
    location: { id: string; name: string } | null;
    booked: boolean;
    bookedByMe: boolean;
  }[] = [];

  for (let cursor = new Date(fromStart); cursor < toEnd; cursor.setDate(cursor.getDate() + 1)) {
    const date = new Date(cursor);
    const dateStr = localDateStr(date);
    const day = date.getDay();
    for (const a of availability.filter((x) => x.day === day)) {
      if (dateStr === todayStr && timeToMinutes(a.startTime) <= nowMinutes) continue;
      const conflict = lessons.find(
        (l) => localDateStr(new Date(l.date)) === dateStr && timesOverlap(a.startTime, a.endTime, l.startTime, l.endTime),
      );
      slots.push({
        date: dateStr,
        day,
        startTime: a.startTime,
        endTime: a.endTime,
        locationId: a.locationId,
        location: a.location ? { id: a.location.id, name: a.location.name } : null,
        booked: !!conflict,
        bookedByMe: !!conflict && conflict.studentId === viewerStudentId,
      });
    }
  }

  return slots;
}

export interface UpdateLessonInput {
  status?: LessonStatus;
  date?: Date;
  startTime?: string;
  endTime?: string;
  locationId?: string;
  subjectId?: string;
  notes?: string;
}

async function assertLessonAccess(
  lessonId: string,
  actor: { userId: string; role: Role },
  access: 'read' | 'write',
) {
  const lesson = await lessonRepository.findById(lessonId);
  if (!lesson) throw ApiError.notFound('Lesson not found.');

  if (actor.role === 'CENTER_ADMIN' || actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN') return lesson;

  const { teacherId, studentId, parentId } = await resolveRoleEntity(actor.userId, actor.role);

  if (actor.role === 'TEACHER' && lesson.teacherId === teacherId) return lesson;
  if (actor.role === 'STUDENT') {
    // Check direct studentId (1:1) or enrollment (group)
    if (lesson.studentId === studentId) return lesson;
    const { lessonEnrollmentRepository } = await import('../repositories/lesson-enrollment.repository.js');
    const enrolled = await lessonEnrollmentRepository.findByLessonAndStudent(lessonId, studentId!);
    if (enrolled && enrolled.status === 'ENROLLED') return lesson;
  }
  if (actor.role === 'PARENT') {
    // Check direct studentId (1:1) or enrollment (group)
    if (lesson.studentId) {
      const owns = await studentRepository.findParentStudent(parentId!, lesson.studentId);
      if (owns) return lesson;
    }
    // Check if any of parent's children are enrolled in this group lesson
    const children = await studentRepository.findParentStudents(parentId!);
    const { lessonEnrollmentRepository } = await import('../repositories/lesson-enrollment.repository.js');
    for (const child of children) {
      const enrolled = await lessonEnrollmentRepository.findByLessonAndStudent(lessonId, child.studentId);
      if (enrolled && enrolled.status === 'ENROLLED') return lesson;
    }
  }
  if (actor.role === 'TEACHER_ASSISTANT') {
    const linked = await isAssistantLinkedToLesson(actor.userId, lessonId);
    if (linked) return lesson;
  }

  throw ApiError.forbidden(
    access === 'read'
      ? 'You are not authorized to view this lesson.'
      : 'You are not authorized to modify this lesson.',
  );
}

export async function updateLesson(
  lessonId: string,
  actor: { userId: string; role: Role },
  input: UpdateLessonInput,
) {
  const lesson = await assertLessonAccess(lessonId, actor, 'write');
  const wasScheduled = lesson.status === 'SCHEDULED' || lesson.status === 'RESCHEDULED';

  const newStatus = input.status ?? lesson.status;
  const newDate = input.date ?? lesson.date;
  const newStart = input.startTime ?? lesson.startTime;
  const newEnd = input.endTime ?? lesson.endTime;
  const newLocation = input.locationId ?? lesson.locationId;

  if (newStart >= newEnd) {
    throw ApiError.badRequest('Start time must be before end time.', 'INVALID_TIME_RANGE');
  }

  if (wasScheduled && newStatus === 'SCHEDULED') {
    // For 1:1 lessons, check student conflicts; for group lessons, only teacher conflicts
    if (lesson.studentId) {
      await assertNoConflicts(
        lesson.teacherId,
        lesson.studentId,
        newDate,
        newStart,
        newEnd,
        lesson.id,
      );
    } else {
      // Group lesson — only check teacher conflicts
      const dayStart = new Date(newDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const teacherConflict = await prisma.lesson.findFirst({
        where: {
          teacherId: lesson.teacherId,
          status: { in: ['SCHEDULED', 'RESCHEDULED'] },
          date: { gte: dayStart, lt: dayEnd },
          startTime: { lt: newEnd },
          endTime: { gt: newStart },
          id: { not: lesson.id },
        },
      });
      if (teacherConflict) {
        throw ApiError.conflict('This teacher already has a lesson at this time.', 'SCHEDULE_CONFLICT');
      }
    }
  }

  const isCancelled = newStatus === 'CANCELLED';
  const isRescheduled =
    newStatus === 'RESCHEDULED' || newStart !== lesson.startTime || newEnd !== lesson.endTime || newDate.getTime() !== lesson.date.getTime();

  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      status: newStatus,
      date: newDate,
      startTime: newStart,
      endTime: newEnd,
      locationId: input.locationId !== undefined ? (input.locationId || null) : undefined,
      subjectId: input.subjectId !== undefined ? (input.subjectId || null) : undefined,
      notes: input.notes !== undefined ? input.notes : undefined,
    },
  });

  const teacher = await teacherRepository.findById(lesson.teacherId);
  const student = lesson.studentId ? await studentRepository.findById(lesson.studentId) : null;
  const teacherUser = teacher ? await prisma.user.findUnique({ where: { id: teacher.userId } }) : null;

  const dayName = DAYS[new Date(newDate).getDay()] ?? '';
  const dateStr = newDate.toISOString().slice(0, 10);

  if (isCancelled) {
    await sendNotification([
      {
        userId: teacherUser?.id ?? '',
        type: 'LESSON_CANCELLED',
        title: 'Lesson cancelled',
        message: `Your lesson was cancelled.`,
      },
      ...(student?.userId
        ? [
            {
              userId: student.userId,
              type: 'LESSON_CANCELLED' as const,
              title: 'Lesson cancelled',
              message: `Your lesson on ${dateStr} at ${newStart} was cancelled.`,
            },
          ]
        : []),
    ]);
  } else if (isRescheduled) {
    await sendNotification([
      {
        userId: teacherUser?.id ?? '',
        type: 'LESSON_RESCHEDULED',
        title: 'Lesson rescheduled',
        message: `Lesson moved to ${dayName} ${dateStr} at ${newStart}.`,
      },
      ...(student?.userId
        ? [
            {
              userId: student.userId,
              type: 'LESSON_RESCHEDULED' as const,
              title: 'Lesson rescheduled',
              message: `Your lesson moved to ${dayName} ${dateStr} at ${newStart}.`,
            },
          ]
        : []),
    ]);
  }

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'updated_lesson',
    entity: 'Lesson',
    entityId: lessonId,
    details: isCancelled ? 'Cancelled' : isRescheduled ? 'Rescheduled' : 'Updated',
  });

  return updated;
}

export async function listLessonsForUser(
  actor: { userId: string; role: Role },
  query: { studentId?: string; teacherId?: string; status?: string; date?: string; page?: number; limit?: number },
) {
  const { status, page = 1, limit = 20, studentId, teacherId: teacherIdFilter, date } = query;
  const { teacherId, studentId: ownStudentId, parentId } = await resolveRoleEntity(
    actor.userId,
    actor.role,
  );

  let where: any = {};
  if (actor.role === 'TEACHER') {
    if (studentId) {
      const assigned = await teacherRepository.findTeacherStudent(teacherId!, studentId);
      if (!assigned) throw ApiError.forbidden('You can only view your own students.');
      where = { teacherId, studentId };
    } else {
      where = { teacherId };
    }
  } else if (actor.role === 'STUDENT') {
    // Include both 1:1 lessons and group lessons where enrolled
    const { lessonEnrollmentRepository } = await import('../repositories/lesson-enrollment.repository.js');
        const centerId = getTenantContext()?.centerId;
    const enrollmentWhere: any = { studentId: ownStudentId!, status: 'ENROLLED' };
    if (centerId) enrollmentWhere.lesson = { OR: [{ centerId }, { centerId: null }] };
    const enrolledLessonIds = (await lessonEnrollmentRepository.findMany({
      where: enrollmentWhere,
      select: { lessonId: true },
    })).map((e) => e.lessonId);
    where = {
      OR: [
        { studentId: ownStudentId! },
        { id: { in: enrolledLessonIds } },
      ],
    };
  } else if (actor.role === 'PARENT') {
    const { lessonEnrollmentRepository } = await import('../repositories/lesson-enrollment.repository.js');
    if (studentId) {
      const owns = await studentRepository.findParentStudent(parentId!, studentId);
      if (!owns) throw ApiError.forbidden('You can only view your own children.');
            const pCenterId1 = getTenantContext()?.centerId;
      const pw1: any = { studentId, status: 'ENROLLED' };
      if (pCenterId1) pw1.lesson = { OR: [{ centerId: pCenterId1 }, { centerId: null }] };
      const enrolledLessonIds = (await lessonEnrollmentRepository.findMany({
        where: pw1,
        select: { lessonId: true },
      })).map((e) => e.lessonId);
      where = { OR: [{ studentId }, { id: { in: enrolledLessonIds } }] };
    } else {
      const children = await studentRepository.findParentStudents(parentId!);
      const childIds = children.map((c) => c.studentId);
            const pCenterId2 = getTenantContext()?.centerId;
      const pw2: any = { studentId: { in: childIds }, status: 'ENROLLED' };
      if (pCenterId2) pw2.lesson = { OR: [{ centerId: pCenterId2 }, { centerId: null }] };
      const enrolledLessonIds = (await lessonEnrollmentRepository.findMany({
        where: pw2,
        select: { lessonId: true },
      })).map((e) => e.lessonId);
      where = { OR: [{ studentId: { in: childIds } }, { id: { in: enrolledLessonIds } }] };
    }
  } else if (actor.role === 'TEACHER_ASSISTANT') {
    const teacherIds = await getAssistantTeacherIds(actor.userId);
    if (teacherIds.length === 0) {
      return { data: [], page, limit, total: 0, totalPages: 0 };
    }
    if (studentId) {
      const linked = await isAssistantLinkedToStudent(actor.userId, studentId);
      if (!linked) throw ApiError.forbidden('You can only view students of your assigned teachers.');
      where = { teacherId: { in: teacherIds }, studentId };
    } else {
      where = { teacherId: { in: teacherIds } };
    }
  } else {
    where = {};
  }

  if (status) where.status = status;
  if (teacherIdFilter) where.teacherId = teacherIdFilter;
  if (date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    where.date = { gte: dayStart, lt: dayEnd };
  }

  const [total, lessons] = await Promise.all([
    lessonRepository.count(where),
    prisma.lesson.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        teacher: { include: { user: { select: { fullName: true, photo: true } } } },
        student: { include: { user: { select: { fullName: true, photo: true } } } },
        subject: true,
        location: true,
      },
    }),
  ]);

  return {
    data: lessons.map((l) => ({
      id: l.id,
      date: l.date,
      startTime: l.startTime,
      endTime: l.endTime,
      status: l.status,
      notes: l.notes,
      subject: l.subject,
      location: l.location,
      roomId: l.roomId,
      capacity: l.capacity,
      isGroup: !!(l.capacity && l.capacity > 1),
      teacher: { id: l.teacher.id, fullName: l.teacher.user.fullName, photo: fileUrl(l.teacher.user.photo) },
      student: l.student ? { id: l.student.id, fullName: l.student.user.fullName, photo: fileUrl(l.student.user.photo) } : null,
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getLessonForUser(lessonId: string, actor: { userId: string; role: Role }) {
  const lesson = await lessonRepository.findUnique({ id: lessonId }, {
    teacher: { include: { user: { select: { fullName: true, photo: true } } } },
    student: { include: { user: { select: { fullName: true, photo: true } } } },
    subject: true,
    location: true,
    room: true,
  });
  if (!lesson) throw ApiError.notFound('Lesson not found.');
  if (actor.role !== 'CENTER_ADMIN' && actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') {
    await assertLessonAccess(lessonId, actor, 'read');
  }

  // Include enrollments for group lessons
  const isGroup = !!(lesson as any).capacity && (lesson as any).capacity > 1;
  if (isGroup) {
    const { lessonEnrollmentRepository } = await import('../repositories/lesson-enrollment.repository.js');
    const enrollments = await lessonEnrollmentRepository.findActiveByLesson(lessonId);
    return {
      ...(lesson as any),
      isGroup: true,
      enrollments: enrollments.map((e) => ({
        id: e.id,
        student: { id: e.student.id, fullName: e.student.user.fullName, photo: fileUrl(e.student.user.photo) },
        enrolledAt: e.enrolledAt,
      })),
    };
  }

  return { ...(lesson as any), isGroup: false, enrollments: [] };
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export async function markAttendance(
  lessonId: string,
  actor: { userId: string; role: Role },
  studentId: string,
  status: AttendanceStatus,
  note?: string,
) {
  const lesson = await assertLessonAccess(lessonId, actor, 'write');
  if (lesson.status === 'CANCELLED') {
    throw ApiError.badRequest('Cannot mark attendance for a cancelled lesson.', 'LESSON_CANCELLED');
  }

  // For 1:1 lessons, teacher can only mark their own student
  if (actor.role === 'TEACHER' && lesson.studentId && lesson.studentId !== studentId) {
    throw ApiError.forbidden('You can only mark attendance for your own students.');
  }

  // For group lessons, verify student is enrolled
  const isGroup = !!lesson.capacity && lesson.capacity > 1;
  if (isGroup) {
    const { lessonEnrollmentRepository } = await import('../repositories/lesson-enrollment.repository.js');
    const enrollment = await lessonEnrollmentRepository.findByLessonAndStudent(lessonId, studentId);
    if (!enrollment || enrollment.status !== 'ENROLLED') {
      throw ApiError.badRequest('Student is not enrolled in this group lesson.', 'NOT_ENROLLED');
    }
  }

  const record = await prisma.attendance.upsert({
    where: { lessonId_studentId: { lessonId, studentId } },
    create: { lessonId, studentId, status, note, markedBy: actor.userId, method: 'MANUAL', markedAt: new Date() },
    update: { status, note, markedBy: actor.userId, method: 'MANUAL', markedAt: new Date() },
  });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'marked_attendance',
    entity: 'Attendance',
    entityId: record.id,
  });

  return record;
}

export async function getLessonAttendance(lessonId: string, actor: { userId: string; role: Role }) {
  await assertLessonAccess(lessonId, actor, 'read');
  return prisma.attendance.findMany({
    where: { lessonId },
    include: { student: { include: { user: { select: { fullName: true, photo: true } } } } },
  });
}

export async function getStudentAttendanceForUser(
  actor: { userId: string; role: Role },
  studentId: string,
  page = 1,
  limit = 50,
) {
  if (actor.role === 'STUDENT') {
    const { studentId: me } = await resolveRoleEntity(actor.userId, actor.role);
    if (me !== studentId) throw ApiError.forbidden('You cannot view another student\'s attendance.');
  }
  if (actor.role === 'PARENT') {
    const { parentId } = await resolveRoleEntity(actor.userId, actor.role);
    const owns = await studentRepository.findParentStudent(parentId!, studentId);
    if (!owns) throw ApiError.forbidden("You can only view your own children's attendance.");
  }
  if (actor.role === 'TEACHER') {
    const { teacherId } = await resolveRoleEntity(actor.userId, actor.role);
    const assigned = await teacherRepository.findTeacherStudent(teacherId!, studentId);
    if (!assigned) throw ApiError.forbidden('You can only view attendance for your own students.');
  }
  if (actor.role === 'TEACHER_ASSISTANT') {
    const linked = await isAssistantLinkedToStudent(actor.userId, studentId);
    if (!linked) throw ApiError.forbidden('You can only view attendance for students of your assigned teachers.');
  }

  const where = { studentId };
  const [total, records] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { lesson: { select: { date: true, startTime: true, endTime: true, subject: true } } },
    }),
  ]);

  return {
    data: records.map((r) => ({
      id: r.id,
      status: r.status,
      method: r.method,
      note: r.note,
      markedAt: r.markedAt,
      createdAt: r.createdAt,
      lesson: r.lesson,
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

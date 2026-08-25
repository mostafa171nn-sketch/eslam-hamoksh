import { AttendanceMethod, AttendanceStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { randomToken, hashToken } from '../utils/tokens';
import { fileUrl } from '../middleware/upload';
import { recordActivity } from './activity.service';
import { sendNotification } from './notification.service';
import { getCenterSettings } from './center.service';
import { combineDateTime, haversineMeters, isSameDay } from '../lib/geo';
import { attendanceRepository } from '../repositories/attendance.repository';
import { billingSubscriptionRepository } from '../repositories/billing-subscription.repository';
import { teacherRepository } from '../repositories/teacher.repository';
import { studentRepository } from '../repositories/student.repository';
import { lessonRepository } from '../repositories/lesson.repository';
import { parentRepository } from '../repositories/parent.repository';
import {
  isAssistantOfTeacher,
  isAssistantLinkedToStudent,
  isAssistantLinkedToLesson,
} from './teacher-assistant.service';

const QR_TTL_SECONDS = 30;

// Simple in-memory rate limiter for QR generation (per student).
// Prevents a student from spamming QR generation (brute force / abuse).
const QR_RATE_LIMIT = 8; // max generations
const QR_RATE_WINDOW_MS = 60_000; // per 60 seconds
const qrAttempts = new Map<string, number[]>();
function checkQrRateLimit(studentId: string) {
  const now = Date.now();
  const attempts = (qrAttempts.get(studentId) ?? []).filter((t) => now - t < QR_RATE_WINDOW_MS);
  if (attempts.length >= QR_RATE_LIMIT) {
    throw ApiError.badRequest(
      'Too many check-in requests. Please wait a moment before generating a new QR.',
      'RATE_LIMITED',
    );
  }
  attempts.push(now);
  qrAttempts.set(studentId, attempts);
}

export interface Actor {
  userId: string;
  role: Role;
}

export interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  percentage: number;
}

/**
 * Centralized attendance percentage calculation. EXCUSED records are excluded
 * from the denominator per center policy (documented in the prompt: EXCUSED is
 * excluded from the denominator). Percentage = (PRESENT + LATE) / marked sessions.
 */
export function computeAttendanceStats(records: { status: AttendanceStatus }[]): AttendanceStats {
  const present = records.filter((r) => r.status === 'PRESENT').length;
  const absent = records.filter((r) => r.status === 'ABSENT').length;
  const late = records.filter((r) => r.status === 'LATE').length;
  const excused = records.filter((r) => r.status === 'EXCUSED').length;
  const markedForRatio = present + late + absent; // excused excluded
  const percentage = markedForRatio === 0 ? 0 : Math.round(((present + late) / markedForRatio) * 100);
  return { present, absent, late, excused, total: records.length, percentage };
}

// ---------------------------------------------------------------------------
// Student QR generation
// ---------------------------------------------------------------------------

export interface GenerateQrInput {
  lessonId: string;
  latitude?: number;
  longitude?: number;
  userAgent?: string;
  ipAddress?: string;
}

export async function generateAttendanceQr(actor: Actor, input: GenerateQrInput) {
  if (actor.role !== 'STUDENT') {
    throw ApiError.forbidden('Only students can generate attendance QR codes.');
  }
  const student = await studentRepository.findByUserId(actor.userId);
  if (!student) throw ApiError.notFound('Student profile not found.');

  const lesson = await lessonRepository.findUnique(
    { id: input.lessonId },
    {
      teacher: { include: { user: { select: { fullName: true } } } },
      student: { include: { user: { select: { fullName: true } } } },
      subject: true,
    },
  ) as any;
  if (!lesson) throw ApiError.notFound('Lesson not found.');

  // Verify student is linked to this lesson (1:1 or group enrollment)
  const isGroup = !!(lesson as any).capacity && (lesson as any).capacity > 1;
  if (isGroup) {
    const { lessonEnrollmentRepository } = await import('../repositories/lesson-enrollment.repository.js');
    const enrollment = await lessonEnrollmentRepository.findByLessonAndStudent(input.lessonId, student.id);
    if (!enrollment || enrollment.status !== 'ENROLLED') {
      throw ApiError.forbidden('You are not enrolled in this group lesson.');
    }
  } else {
    if (lesson.studentId !== student.id) {
      throw ApiError.forbidden('You are not enrolled in this lesson.');
    }
  }
  if (lesson.status === 'CANCELLED') {
    throw ApiError.badRequest('Attendance is unavailable because this lesson was cancelled.', 'LESSON_CANCELLED');
  }
  if (lesson.status === 'COMPLETED') {
    throw ApiError.badRequest('This lesson has already ended.', 'LESSON_ENDED');
  }
  if (!isSameDay(new Date(lesson.date), new Date())) {
    throw ApiError.badRequest('Attendance QR can only be generated on the lesson day.', 'WRONG_DAY');
  }

  // Anti-abuse: throttle repeated QR generation attempts.
  checkQrRateLimit(student.id);

  // Server-side GPS verification against the center anchor.
  const center = await getCenterSettings();
  if (center.latitude != null && center.longitude != null) {
    if (
      typeof input.latitude !== 'number' ||
      typeof input.longitude !== 'number' ||
      Number.isNaN(input.latitude) ||
      Number.isNaN(input.longitude)
    ) {
      throw ApiError.badRequest('Location is required to generate the attendance QR.', 'LOCATION_REQUIRED');
    }
    const distance = haversineMeters(input.latitude, input.longitude, center.latitude, center.longitude);
    if (distance > center.radiusMeters) {
      throw ApiError.badRequest(
        `You are outside the center location (${Math.round(distance)}m away). You must be inside the center area to generate an attendance QR.`,
        'LOCATION_INVALID',
      );
    }
  }

  // Revoke any previously issued unused tokens for this student+lesson.
  await attendanceRepository.revokeQrSessions(student.id, lesson.id);

  const token = randomToken(24);
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + QR_TTL_SECONDS * 1000);

  await attendanceRepository.createQrSession({
    student: { connect: { id: student.id } },
    lesson: { connect: { id: lesson.id } },
    tokenHash,
    expiresAt,
    userAgent: input.userAgent ?? null,
    ipAddress: input.ipAddress ?? null,
  });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'generated_attendance_qr',
    entity: 'AttendanceQrSession',
    entityId: lesson.id,
    details: `Lesson ${lesson.id}`,
  });

  return {
    token,
    expiresAt,
    ttlSeconds: QR_TTL_SECONDS,
    lesson: {
      id: lesson.id,
      subject: lesson.subject?.name ?? 'General',
      teacher: lesson.teacher.user.fullName,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
    },
  };
}

// ---------------------------------------------------------------------------
// Teacher scan
// ---------------------------------------------------------------------------

export async function scanAttendance(actor: Actor, token: string, lessonId: string) {
  if (actor.role !== 'TEACHER' && actor.role !== 'CENTER_ADMIN' && actor.role !== 'SUPER_ADMIN' && actor.role !== 'TEACHER_ASSISTANT') {
    throw ApiError.forbidden('Only teachers can scan attendance.');
  }

  const lesson = await lessonRepository.findUnique(
    { id: lessonId },
    { teacher: { include: { user: { select: { fullName: true } } } }, student: true },
  ) as any;
  if (!lesson) throw ApiError.notFound('Lesson not found.');

  if (actor.role === 'TEACHER') {
    const teacher = await teacherRepository.findByUserId(actor.userId);
    if (!teacher || teacher.id !== lesson.teacherId) {
      throw ApiError.forbidden('You are not authorized to manage attendance for this lesson.', 'NOT_LESSON_TEACHER');
    }
  }
  if (actor.role === 'TEACHER_ASSISTANT') {
    const linked = await isAssistantLinkedToLesson(actor.userId, lessonId);
    if (!linked) {
      throw ApiError.forbidden('You are not authorized to manage attendance for this lesson.', 'NOT_LESSON_TEACHER');
    }
  }
  if (lesson.status === 'CANCELLED') {
    throw ApiError.badRequest('Attendance is unavailable because this lesson was cancelled.', 'LESSON_CANCELLED');
  }

  const session = await prisma.attendanceQrSession.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session) {
    throw ApiError.badRequest('Invalid attendance QR.', 'QR_INVALID');
  }
  if (session.lessonId !== lessonId) {
    throw ApiError.badRequest('This QR is not valid for this lesson.', 'WRONG_LESSON');
  }
  if (session.usedAt) {
    throw ApiError.conflict('This attendance QR has already been used.', 'QR_USED');
  }
  if (session.revokedAt) {
    throw ApiError.badRequest('This attendance QR has been revoked. Please generate a new QR.', 'QR_REVOKED');
  }
  if (session.expiresAt < new Date()) {
    throw ApiError.badRequest('This attendance QR has expired. Please generate a new QR.', 'QR_EXPIRED');
  }

  // Verify student is linked to this lesson (1:1 or group enrollment)
  const isGroup = !!(lesson as any).capacity && (lesson as any).capacity > 1;
  if (isGroup) {
    const { lessonEnrollmentRepository } = await import('../repositories/lesson-enrollment.repository.js');
    const enrollment = await lessonEnrollmentRepository.findByLessonAndStudent(lessonId, session.studentId);
    if (!enrollment || enrollment.status !== 'ENROLLED') {
      throw ApiError.forbidden('This student is not enrolled in this lesson.', 'NOT_ENROLLED');
    }
  } else {
    if (session.studentId !== lesson.studentId) {
      throw ApiError.forbidden('This student is not enrolled in this lesson.', 'NOT_ENROLLED');
    }
  }

  // Duplicate prevention (idempotent).
  const existing = await attendanceRepository.findUnique({
    lessonId_studentId: { lessonId, studentId: session.studentId },
  });
  if (existing) {
    const student = await getStudentProfile(session.studentId);
    return {
      alreadyMarked: true,
      student,
      attendance: {
        status: existing.status,
        markedAt: existing.markedAt,
        method: existing.method,
      },
      lesson: { teacher: lesson.teacher.user.fullName },
    };
  }

  const center = await getCenterSettings();
  const start = combineDateTime(lesson.date, lesson.startTime);
  const graceMs = (center.attendanceGraceMinutes ?? 10) * 60 * 1000;
  const now = new Date();
  const status: AttendanceStatus = now <= new Date(start.getTime() + graceMs) ? 'PRESENT' : 'LATE';

  const [record] = await prisma.$transaction([
    attendanceRepository.create({
      lesson: { connect: { id: lessonId } },
      student: { connect: { id: session.studentId } },
      status,
      method: AttendanceMethod.QR,
      markedBy: actor.userId,
      markedAt: now,
    }),
    attendanceRepository.markQrSessionUsed(session.id),
  ]);

  const student = await getStudentProfile(session.studentId);

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'scanned_attendance',
    entity: 'Attendance',
    entityId: record.id,
    details: `${student.fullName} -> ${status}`,
  });

  return {
    alreadyMarked: false,
    student,
    attendance: {
      status: record.status,
      markedAt: record.markedAt,
      method: record.method,
    },
  };
}

async function getStudentProfile(studentId: string) {
  const s = await studentRepository.findUnique({
    where: { id: studentId },
    include: { user: { select: { fullName: true, photo: true, username: true } } },
  }) as any;
  if (!s) throw ApiError.notFound('Student not found.');
  return {
    id: s.id,
    fullName: s.user.fullName,
    username: s.user.username,
    photo: fileUrl(s.user.photo),
  };
}

// ---------------------------------------------------------------------------
// Lesson live attendance & finalization
// ---------------------------------------------------------------------------

export async function getLessonAttendanceLive(actor: Actor, lessonId: string) {
  const lesson = await lessonRepository.findUnique(
    { id: lessonId },
    { teacher: { include: { user: { select: { fullName: true } } } }, student: { include: { user: { select: { fullName: true, photo: true } } } }, subject: true },
  ) as any;
  if (!lesson) throw ApiError.notFound('Lesson not found.');

  if (actor.role === 'TEACHER') {
    const teacher = await teacherRepository.findByUserId(actor.userId);
    if (!teacher || teacher.id !== lesson.teacherId) {
      throw ApiError.forbidden('You are not authorized to view this lesson attendance.', 'NOT_LESSON_TEACHER');
    }
  } else if (actor.role === 'STUDENT') {
    const student = await studentRepository.findByUserId(actor.userId);
    if (!student || student.id !== lesson.studentId) {
      throw ApiError.forbidden('You are not authorized to view this lesson attendance.');
    }
  } else if (actor.role === 'PARENT') {
    const parent = await parentRepository.findByUserId(actor.userId);
    const owns = parent
      ? await parentRepository.findParentStudent(parent.id, lesson.studentId)
      : null;
    if (!owns) throw ApiError.forbidden('You are not authorized to view this lesson attendance.');
  } else if (actor.role === 'TEACHER_ASSISTANT') {
    const linked = await isAssistantLinkedToLesson(actor.userId, lessonId);
    if (!linked) throw ApiError.forbidden('You are not authorized to view this lesson attendance.');
  }

  const records = await attendanceRepository.findMany({
    where: { lessonId },
    include: { student: { include: { user: { select: { fullName: true, photo: true } } } } },
  }) as any;

  // Build enrolled students list from either direct studentId (1:1) or enrollment (group)
  const isGroup = !!(lesson as any).capacity && (lesson as any).capacity > 1;
  let enrolled: { id: string; fullName: string; photo: string | null }[] = [];

  if (isGroup) {
    const { lessonEnrollmentRepository } = await import('../repositories/lesson-enrollment.repository.js');
    const enrollments = await lessonEnrollmentRepository.findActiveByLesson(lessonId);
    enrolled = enrollments.map((e: any) => ({
      id: e.student.id,
      fullName: e.student.user.fullName,
      photo: fileUrl(e.student.user.photo),
    }));
  } else if (lesson.student) {
    enrolled = [
      {
        id: lesson.student.id,
        fullName: lesson.student.user.fullName,
        photo: fileUrl(lesson.student.user.photo),
      },
    ];
  }

  const rows = enrolled.map((e) => {
    const rec = records.find((r: any) => r.studentId === e.id);
    return {
      student: e,
      status: rec?.status ?? null,
      method: rec?.method ?? null,
      markedAt: rec?.markedAt ?? null,
    };
  });

  const stats = computeAttendanceStats(records.map((r: any) => ({ status: r.status })));

  return {
    lesson: {
      id: lesson.id,
      subject: lesson.subject?.name ?? 'General',
      teacher: lesson.teacher.user.fullName,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      date: lesson.date,
      status: lesson.status,
    },
    enrolledCount: enrolled.length,
    present: stats.present,
    late: stats.late,
    absent: stats.absent,
    notMarked: enrolled.length - records.length,
    rows,
  };
}

export async function finalizeLessonAttendance(actor: Actor, lessonId: string) {
  const lesson = await lessonRepository.findById(lessonId);
  if (!lesson) throw ApiError.notFound('Lesson not found.');

  if (actor.role === 'TEACHER') {
    const teacher = await teacherRepository.findByUserId(actor.userId);
    if (!teacher || teacher.id !== lesson.teacherId) {
      throw ApiError.forbidden('You are not authorized to finalize this lesson.', 'NOT_LESSON_TEACHER');
    }
  }
  if (actor.role === 'TEACHER_ASSISTANT') {
    const linked = await isAssistantLinkedToLesson(actor.userId, lessonId);
    if (!linked) {
      throw ApiError.forbidden('You are not authorized to finalize this lesson.', 'NOT_LESSON_TEACHER');
    }
  }

  const end = combineDateTime(lesson.date, lesson.endTime);
  if (actor.role !== 'CENTER_ADMIN' && actor.role !== 'SUPER_ADMIN' && new Date() < end) {
    throw ApiError.badRequest('Attendance can only be finalized after the lesson ends.', 'LESSON_NOT_ENDED');
  }

  // Find enrolled students without an attendance record and mark them ABSENT.
  const isGroup = !!(lesson as any).capacity && (lesson as any).capacity > 1;
  let enrolled: { studentId: string }[] = [];

  if (isGroup) {
    const { lessonEnrollmentRepository } = await import('../repositories/lesson-enrollment.repository.js');
    const enrollments = await lessonEnrollmentRepository.findActiveByLesson(lessonId);
    enrolled = enrollments.map((e) => ({ studentId: e.studentId }));
  } else if (lesson.studentId) {
    enrolled = [{ studentId: lesson.studentId }];
  }

  const existing = await attendanceRepository.findMany({
    where: { lessonId },
    select: { studentId: true },
  });
  const existingIds = new Set(existing.map((e) => e.studentId));
  const missing = enrolled.filter((e) => !existingIds.has(e.studentId));

  let created = 0;
  for (const m of missing) {
    await attendanceRepository.create({
      lesson: { connect: { id: lessonId } },
      student: { connect: { id: m.studentId } },
      status: 'ABSENT',
      method: AttendanceMethod.SYSTEM,
      markedBy: actor.userId,
      markedAt: new Date(),
      note: 'Auto-marked absent after lesson finalization.',
    });
    created++;
  }

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'finalized_attendance',
    entity: 'Lesson',
    entityId: lessonId,
    details: `Auto-absent: ${created}`,
  });

  return { finalizedStudents: created };
}

// ---------------------------------------------------------------------------
// Student / parent / admin summaries & lists
// ---------------------------------------------------------------------------

export async function getStudentAttendanceSummary(actor: Actor, studentId: string) {
  if (actor.role === 'STUDENT') {
    const me = await studentRepository.findByUserId(actor.userId);
    if (!me || me.id !== studentId) throw ApiError.forbidden('You cannot view another student\'s attendance.');
  } else if (actor.role === 'PARENT') {
    const parent = await parentRepository.findByUserId(actor.userId);
    const owns = parent
      ? await parentRepository.findParentStudent(parent.id, studentId)
      : null;
    if (!owns) throw ApiError.forbidden("You can only view your own children's attendance.");
  } else if (actor.role === 'TEACHER') {
    const teacher = await teacherRepository.findByUserId(actor.userId);
    const assigned = teacher
      ? await teacherRepository.findTeacherStudent(teacher.id, studentId)
      : null;
    if (!assigned) throw ApiError.forbidden('You can only view attendance for your own students.');
  } else if (actor.role === 'TEACHER_ASSISTANT') {
    const linked = await isAssistantLinkedToStudent(actor.userId, studentId);
    if (!linked) throw ApiError.forbidden('You can only view attendance for students of your assigned teachers.');
  }

  const records = await attendanceRepository.findMany({
    where: { studentId },
    select: { status: true },
  });
  return computeAttendanceStats(records);
}

export interface AttendanceListFilters {
  studentId?: string;
  teacherId?: string;
  lessonId?: string;
  subjectId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

function buildAttendanceWhere(filters: AttendanceListFilters): any {
  const { studentId, teacherId, lessonId, subjectId, status, dateFrom, dateTo } = filters;
  const where: any = {};
  if (studentId) where.studentId = studentId;
  if (lessonId) where.lessonId = lessonId;
  if (status) where.status = status;
  if (teacherId || subjectId || dateFrom || dateTo) {
    where.lesson = {};
    if (teacherId) where.lesson.teacherId = teacherId;
    if (subjectId) where.lesson.subjectId = subjectId;
    if (dateFrom || dateTo) {
      where.lesson.date = {};
      if (dateFrom) where.lesson.date.gte = new Date(dateFrom);
      if (dateTo) where.lesson.date.lte = new Date(dateTo + 'T23:59:59.999Z');
    }
  }
  return where;
}

export async function listAttendanceAdmin(filters: AttendanceListFilters) {
  const { page = 1, limit = 25 } = filters;
  const where = buildAttendanceWhere(filters);

  const [total, records] = await Promise.all([
    attendanceRepository.count(where),
    attendanceRepository.findMany({
      where,
      orderBy: { markedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        student: { include: { user: { select: { fullName: true, photo: true } } } },
        lesson: { include: { teacher: { include: { user: { select: { fullName: true } } } }, subject: true } },
      },
    }) as any,
  ]);

  return {
    data: records.map((r: any) => ({
      id: r.id,
      status: r.status,
      method: r.method,
      markedAt: r.markedAt,
      note: r.note,
      student: { id: r.student.id, fullName: r.student.user.fullName, photo: fileUrl(r.student.user.photo) },
      lesson: {
        id: r.lesson.id,
        subject: r.lesson.subject?.name ?? 'General',
        teacher: r.lesson.teacher.user.fullName,
        date: r.lesson.date,
        startTime: r.lesson.startTime,
        endTime: r.lesson.endTime,
      },
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export interface AttendanceAdminSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
  lowAttendance: { studentId: string; fullName: string; percentage: number; total: number }[];
}

const LOW_ATTENDANCE_THRESHOLD = 60;
const LOW_ATTENDANCE_MIN_SESSIONS = 5;

export async function getAdminAttendanceSummary(filters: AttendanceListFilters): Promise<AttendanceAdminSummary> {
  const where = buildAttendanceWhere(filters);
  const records = await attendanceRepository.findMany({ where, select: { status: true, studentId: true } });

  const overall = computeAttendanceStats(records);

  // Group by student to detect low-attendance students.
  const byStudent = new Map<string, AttendanceStatus[]>();
  for (const r of records) {
    if (!byStudent.has(r.studentId)) byStudent.set(r.studentId, []);
    byStudent.get(r.studentId)!.push(r.status);
  }

  const low: AttendanceAdminSummary['lowAttendance'] = [];
  for (const [studentId, recs] of byStudent.entries()) {
    const stats = computeAttendanceStats(recs.map((s) => ({ status: s })));
    if (stats.total >= LOW_ATTENDANCE_MIN_SESSIONS && stats.percentage < LOW_ATTENDANCE_THRESHOLD) {
      low.push({ studentId, fullName: '', percentage: stats.percentage, total: stats.total });
    }
  }
  // Resolve names + sort by percentage ascending.
  const ids = low.map((l) => l.studentId);
  if (ids.length) {
    const students = await studentRepository.findMany({
      where: { id: { in: ids } },
      include: { user: { select: { fullName: true } } },
    }) as any;
    const nameMap = new Map(students.map((s: any) => [s.id, s.user.fullName]));
    for (const l of low) l.fullName = (nameMap.get(l.studentId) as string) ?? 'Unknown';
  }
  low.sort((a, b) => a.percentage - b.percentage);

  return { ...overall, lowAttendance: low.slice(0, 10) };
}

export interface ParentChildAttendance {
  student: { id: string; fullName: string; photo: string | null };
  summary: AttendanceStats;
  recent: { id: string; status: AttendanceStatus; markedAt: Date | null; subject: string; date: string; startTime: string }[];
}

export async function getParentAttendanceOverview(actor: Actor): Promise<ParentChildAttendance[]> {
  const parent = await parentRepository.findByUserId(actor.userId);
  if (!parent) throw ApiError.notFound('Parent profile not found.');

  const links = await prisma.parentStudent.findMany({
    where: { parentId: parent.id },
    include: { student: { include: { user: { select: { fullName: true, photo: true } } } } },
  });

  const result: ParentChildAttendance[] = [];
  for (const link of links) {
    const studentId = link.student.id;
    const records = await attendanceRepository.findMany({
      where: { studentId },
      orderBy: { markedAt: 'desc' },
      take: 10,
      include: { lesson: { include: { subject: true } } },
    }) as any;
    const summary = computeAttendanceStats(records.map((r: any) => ({ status: r.status })));
    result.push({
      student: {
        id: studentId,
        fullName: link.student.user.fullName,
        photo: fileUrl(link.student.user.photo),
      },
      summary,
      recent: records.map((r: any) => ({
        id: r.id,
        status: r.status,
        markedAt: r.markedAt,
        subject: r.lesson.subject?.name ?? 'General',
        date: r.lesson.date.toISOString().slice(0, 10),
        startTime: r.lesson.startTime,
      })),
    });
  }
  return result;
}

export async function updateAttendanceRecord(actor: Actor, id: string, status: AttendanceStatus, note?: string) {
  if (actor.role !== 'CENTER_ADMIN' && actor.role !== 'TEACHER' && actor.role !== 'SUPER_ADMIN' && actor.role !== 'TEACHER_ASSISTANT') {
    throw ApiError.forbidden('You are not authorized to correct attendance.');
  }
  const record = await attendanceRepository.findById(id);
  if (!record) throw ApiError.notFound('Attendance record not found.');

  if (actor.role === 'TEACHER') {
    const teacher = await teacherRepository.findByUserId(actor.userId);
    const lesson = await lessonRepository.findById(record.lessonId);
    if (!teacher || !lesson || teacher.id !== lesson.teacherId) {
      throw ApiError.forbidden('You are not authorized to correct this attendance.', 'NOT_LESSON_TEACHER');
    }
  }
  if (actor.role === 'TEACHER_ASSISTANT') {
    const linked = await isAssistantLinkedToLesson(actor.userId, record.lessonId);
    if (!linked) {
      throw ApiError.forbidden('You are not authorized to correct this attendance.', 'NOT_LESSON_TEACHER');
    }
  }

  const updated = await attendanceRepository.update(id, {
    status, note: note ?? record.note, method: AttendanceMethod.MANUAL, markedBy: actor.userId, updatedAt: new Date(),
  });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'corrected_attendance',
    entity: 'Attendance',
    entityId: id,
    details: `${record.status} -> ${status}`,
  });

  return updated;
}

/** Background job: auto-mark absent students for lessons that have ended. */
export async function sweepAttendanceFinalization(): Promise<number> {
  const now = new Date();
  const lessons = await lessonRepository.findMany({
    where: { status: { in: ['SCHEDULED', 'RESCHEDULED'] } },
    select: { id: true, date: true, endTime: true, studentId: true, capacity: true },
  });

  let created = 0;
  for (const lesson of lessons) {
    const end = combineDateTime(lesson.date, lesson.endTime);
    if (end > now) continue;

    // Build list of studentIds for this lesson
    const isGroup = !!lesson.capacity && lesson.capacity > 1;
    let studentIds: string[] = [];

    if (isGroup) {
      const { lessonEnrollmentRepository } = await import('../repositories/lesson-enrollment.repository.js');
      const enrollments = await lessonEnrollmentRepository.findActiveByLesson(lesson.id);
      studentIds = enrollments.map((e) => e.studentId);
    } else if (lesson.studentId) {
      studentIds = [lesson.studentId];
    }

    for (const studentId of studentIds) {
      const existing = await attendanceRepository.findUnique({
        lessonId_studentId: { lessonId: lesson.id, studentId },
      });
      if (existing) continue;
      await attendanceRepository.create({
        lesson: { connect: { id: lesson.id } },
        student: { connect: { id: studentId } },
        status: 'ABSENT',
        method: AttendanceMethod.SYSTEM,
        markedBy: null,
        markedAt: now,
        note: 'Auto-marked absent after lesson finalization.',
      });
      created++;
    }
  }
  return created;
}

/** Background job: expire active subscriptions whose end date has passed. */
export async function sweepSubscriptionExpiry(): Promise<number> {
  const now = new Date();
  const expired = await billingSubscriptionRepository.findExpired(now);
  if (expired.length === 0) return 0;
  await billingSubscriptionRepository.expireMany(expired.map((e) => e.id));
  return expired.length;
}

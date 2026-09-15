import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { fileUrl } from '../middleware/upload';
import { resolveRoleEntity } from './lesson.service';
import { sendNotification } from './notification.service';
import { recordActivity } from './activity.service';
import { studentRepository } from '../repositories/student.repository';
import { userRepository } from '../repositories/user.repository';

export async function updateStudentProfile(
  userId: string,
  data: { fullName?: string; phone?: string; gradeId?: string; subjects?: string[] },
) {
  const student = await studentRepository.findByUserId(userId);
  if (!student) throw ApiError.notFound('Student profile not found.');

  return prisma.$transaction(async (tx) => {
    if (data.fullName !== undefined || data.phone !== undefined) {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
        },
      });
    }

    if (data.gradeId !== undefined) {
      const grade = await tx.grade.findUnique({ where: { id: data.gradeId } });
      if (!grade) throw ApiError.badRequest('Unknown grade.', 'UNKNOWN_GRADE');
      await tx.student.update({ where: { id: student.id }, data: { gradeId: data.gradeId } });
    }

    if (data.subjects !== undefined) {
      const subjects = await tx.subject.findMany({ where: { id: { in: data.subjects } } });
      if (subjects.length !== data.subjects.length) {
        throw ApiError.badRequest('One or more subjects do not exist.', 'UNKNOWN_SUBJECT');
      }
      await tx.studentSubject.deleteMany({ where: { studentId: student.id } });
      await tx.studentSubject.createMany({
        data: data.subjects.map((subjectId) => ({ studentId: student.id, subjectId })),
      });
    }

    return tx.student.findUnique({
      where: { id: student.id },
      include: { grade: true, studentSubjects: { include: { subject: true } } },
    });
  });
}

export async function updateStudentPhoto(userId: string, photoFile: string) {
  const student = await studentRepository.findByUserId(userId);
  if (!student) throw ApiError.notFound('Student profile not found.');
  await userRepository.update(userId, { photo: photoFile });
  return fileUrl(photoFile);
}

export async function getStudentDashboard(studentId: string, userId: string) {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  // One windowed query from today onward (instead of two separate `findMany`
  // for today vs. upcoming) — the two reads carried identical nested relations,
  // so each was costing a full Prisma relation fan-out (~5 statements each).
  // The slices below preserve the exact previous output: today = all of today's
  // lessons, upcoming = the next 10 from tomorrow on.
  const [lessons, upcomingExams, pendingAssignments, recentResults, unreadNotifications, attendance] =
    await Promise.all([
      prisma.lesson.findMany({
        where: { studentId, date: { gte: dayStart }, status: { in: ['SCHEDULED', 'RESCHEDULED'] } },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        include: { teacher: { include: { user: { select: { fullName: true, photo: true } } } }, subject: true, location: true },
      }),
      prisma.exam.findMany({
        where: {
          students: { some: { studentId } },
          endTime: { gte: now },
          startTime: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { startTime: 'asc' },
        take: 10,
        include: { subject: true },
      }),
      prisma.assignment.findMany({
        where: { students: { some: { studentId } }, deadline: { gte: now } },
        orderBy: { deadline: 'asc' },
        take: 10,
        include: { subject: true, submissions: { where: { studentId } } },
      }),
      prisma.examAttempt.findMany({
        where: { studentId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] } },
        orderBy: { submittedAt: 'desc' },
        take: 5,
        include: { exam: { select: { name: true, subject: true } } },
      }),
      prisma.notification.count({ where: { userId, read: false } }),
      prisma.attendance.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { lesson: { select: { date: true, subject: true } } },
      }),
    ]);

  const todayLessons = lessons.filter((l) => l.date < dayEnd);
  const upcomingLessons = lessons.filter((l) => l.date >= dayEnd).slice(0, 10);

  return {
    todayLessons: todayLessons.map((l) => shapeLesson(l)),
    upcomingLessons: upcomingLessons.map((l) => shapeLesson(l)),
    upcomingExams,
    pendingAssignments: pendingAssignments.map((a) => ({
      id: a.id,
      title: a.title,
      deadline: a.deadline,
      subject: a.subject,
      submitted: a.submissions.length > 0,
    })),
    recentResults,
    unreadNotifications,
    attendance,
  };
}

function shapeLesson(l: any) {
  return {
    id: l.id,
    date: l.date,
    startTime: l.startTime,
    endTime: l.endTime,
    status: l.status,
    subject: l.subject,
    location: l.location,
    teacher: { id: l.teacher.id, fullName: l.teacher.user.fullName, photo: fileUrl(l.teacher.user.photo) },
  };
}

export async function connectStudentToParent(parentUserId: string, studentId: string) {
  const parent = await prisma.parent.findUnique({ where: { userId: parentUserId } });
  if (!parent) throw ApiError.notFound('Parent profile not found.');

  // Resolve the identifier: a Student ID (e.g. "STU-123456") takes priority,
  // otherwise a UUID (the legacy DB primary key) is accepted as a fallback.
  const isStudentId = studentId.startsWith('STU-');
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(studentId);

  let student: { id: string; userId: string } | null = null;
  if (isStudentId) {
    student = await studentRepository.findByStudentNumber(studentId);
  }
  if (!student && isUuid) {
    student = await studentRepository.findById(studentId);
  }
  if (!student) throw ApiError.notFound('Student not found.');

  await studentRepository.upsertParentStudent(parent.id, student.id);

  const parentUser = await userRepository.findById(parentUserId);
  const studentUser = await userRepository.findById(student.userId);

  await sendNotification({
    userId: student.userId,
    type: 'SYSTEM',
    title: 'Parent connected',
    message: `${parentUser?.fullName} is now linked to your account.`,
  });
  await sendNotification({
    userId: parentUserId,
    type: 'SYSTEM',
    title: 'Student connected',
    message: `${studentUser?.fullName} is now linked to your account.`,
  });

  await recordActivity({
    userId: parentUserId,
    role: 'PARENT',
    action: 'connected_student',
    entity: 'Student',
    entityId: student.id,
  });

  return { parentId: parent.id, studentId: student.id };
}

export async function removeStudentFromParent(parentUserId: string, studentId: string) {
  const parent = await prisma.parent.findUnique({ where: { userId: parentUserId } });
  if (!parent) throw ApiError.notFound('Parent profile not found.');

  await studentRepository.deleteParentStudent(parent.id, studentId);

  await recordActivity({
    userId: parentUserId,
    role: 'PARENT',
    action: 'removed_student',
    entity: 'Student',
    entityId: studentId,
  });

  return { removed: true };
}

export async function getMyTeachers(studentId: string) {
  const links = await prisma.teacherStudent.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    include: {
      teacher: {
        include: {
          user: { select: { id: true, fullName: true, photo: true } },
          subjects: { select: { subject: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  const teacherIds = links.map((l) => l.teacher.id);
  const upcoming = await prisma.lesson.findMany({
    where: {
      teacherId: { in: teacherIds },
      studentId,
      date: { gte: new Date() },
      status: { in: ['SCHEDULED', 'RESCHEDULED'] },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    select: { teacherId: true, id: true, date: true, startTime: true, endTime: true, status: true, subject: { select: { id: true, name: true } } },
  });

  return links.map((l) => {
    const next = upcoming.find((u) => u.teacherId === l.teacher.id) ?? null;
    return {
      id: l.teacher.id,
      fullName: l.teacher.user.fullName,
      photo: fileUrl(l.teacher.user.photo),
      isEnrolled: true,
      subjects: l.teacher.subjects.map((s) => s.subject),
      upcomingLesson: next
        ? {
            id: next.id,
            date: next.date,
            startTime: next.startTime,
            endTime: next.endTime,
            status: next.status,
            subject: next.subject,
          }
        : null,
    };
  });
}

export async function getStudentPublic(studentId: string) {
  const student = await studentRepository.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { fullName: true, photo: true } },
      grade: true,
      studentSubjects: { include: { subject: true } },
      teachers: { include: { teacher: { include: { user: { select: { fullName: true, photo: true } } } } } },
    },
  }) as any;
  if (!student) throw ApiError.notFound('Student not found.');

  return {
    id: student.id,
    fullName: student.user.fullName,
    photo: fileUrl(student.user.photo),
    grade: student.grade,
    subjects: student.studentSubjects.map((s: any) => s.subject),
    teachers: student.teachers.map((t: any) => ({
      id: t.teacher.id,
      fullName: t.teacher.user.fullName,
      photo: fileUrl(t.teacher.user.photo),
    })),
  };
}

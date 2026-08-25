import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { fileUrl } from '../middleware/upload';
import { resolveRoleEntity } from './lesson.service';
import { getStudentDashboard } from './student.service';
import { parentRepository } from '../repositories/parent.repository';
import { studentRepository } from '../repositories/student.repository';
import { userRepository } from '../repositories/user.repository';
import { notificationRepository } from '../repositories/notification.repository';

export async function getParentDashboard(parentUserId: string) {
  const parent = await parentRepository.findUnique({
    where: { userId: parentUserId },
    include: {
      children: {
        include: {
          student: {
            include: {
              user: { select: { id: true, fullName: true, photo: true } },
              grade: true,
            },
          },
        },
      },
    },
  }) as any;
  if (!parent) throw ApiError.notFound('Parent profile not found.');

  const children = parent.children.map((c: any) => ({
    id: c.student.id,
    userId: c.student.userId,
    fullName: c.student.user.fullName,
    photo: fileUrl(c.student.user.photo),
    grade: c.student.grade?.name ?? null,
  }));

  const unread = await notificationRepository.count({ userId: parentUserId, read: false });

  return { children, unreadNotifications: unread };
}

/** Validates the parent owns the given student and returns the student id. */
export async function assertParentOwnsChild(parentUserId: string, studentId: string) {
  const parent = await parentRepository.findByUserId(parentUserId);
  if (!parent) throw ApiError.notFound('Parent profile not found.');
  const rel = await parentRepository.findParentStudent(parent.id, studentId);
  if (!rel) {
    throw ApiError.forbidden("You can only access your own children's data.");
  }
  return studentId;
}

export async function getChildDashboard(parentUserId: string, studentId: string) {
  await assertParentOwnsChild(parentUserId, studentId);
  const dash = await getStudentDashboard(studentId);
  const student = await studentRepository.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { fullName: true, photo: true } },
      grade: true,
      teachers: { include: { teacher: { include: { user: { select: { fullName: true, photo: true } } } } } },
    },
  }) as any;
  return {
    student: {
      id: studentId,
      fullName: student?.user.fullName,
      photo: fileUrl(student?.user.photo ?? null),
      grade: student?.grade ?? null,
      teachers: student?.teachers.map((t: any) => ({
        id: t.teacher.id,
        fullName: t.teacher.user.fullName,
        photo: fileUrl(t.teacher.user.photo),
      })) ?? [],
    },
    ...dash,
  };
}

export async function listParentStudents(parentUserId: string) {
  const parent = await parentRepository.findByUserId(parentUserId);
  if (!parent) throw ApiError.notFound('Parent profile not found.');

  const children = await prisma.parentStudent.findMany({
    where: { parentId: parent.id },
    include: {
      student: {
        include: {
          user: { select: { id: true, fullName: true, photo: true } },
          grade: true,
          studentSubjects: { include: { subject: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return children.map((c) => ({
    id: c.student.id,
    userId: c.student.userId,
    fullName: c.student.user.fullName,
    photo: fileUrl(c.student.user.photo),
    grade: c.student.grade,
    subjects: c.student.studentSubjects.map((s) => s.subject),
  }));
}

export async function getChildProfile(parentUserId: string, studentId: string) {
  await assertParentOwnsChild(parentUserId, studentId);

  const student = await studentRepository.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { fullName: true, photo: true, phone: true } },
      grade: true,
      studentSubjects: { include: { subject: true } },
      teachers: { include: { teacher: { include: { user: { select: { fullName: true, photo: true } } } } } },
    },
  }) as any;
  if (!student) throw ApiError.notFound('Student not found.');
  return {
    id: student.id,
    fullName: student.user.fullName,
    photo: student.user.photo,
    phone: student.user.phone,
    grade: student.grade,
    subjects: student.studentSubjects.map((s: any) => s.subject),
    teachers: student.teachers.map((t: any) => ({
      id: t.teacher.id,
      fullName: t.teacher.user.fullName,
      photo: t.teacher.user.photo,
    })),
  };
}

export async function updateParentProfile(
  userId: string,
  data: { fullName?: string; phone?: string },
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
    },
    select: { id: true, fullName: true, phone: true },
  });
}

export async function updateParentPhoto(userId: string, photoFile: string) {
  const parent = await parentRepository.findByUserId(userId);
  if (!parent) throw ApiError.notFound('Parent profile not found.');
  await userRepository.update(userId, { photo: photoFile });
  return fileUrl(photoFile);
}

export { resolveRoleEntity };

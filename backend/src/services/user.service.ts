import { prisma } from '../lib/prisma';
import { fileUrl } from '../middleware/upload';

/**
 * Loads a user plus role-specific profile in the shape the frontend consumes.
 * Never exposes the password hash or security fields.
 */
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      fullName: true,
      phone: true,
      photo: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      teacher: {
        include: {
          location: true,
          subjects: { include: { subject: true } },
          grades: { include: { grade: true } },
          availability: { include: { location: true } },
        },
      },
      student: {
        include: {
          grade: true,
          studentSubjects: { include: { subject: true } },
          teachers: { include: { teacher: { include: { user: true } } } },
          parents: { include: { parent: { include: { user: true } } } },
        },
      },
      parent: {
        include: {
          children: { include: { student: { include: { user: true, grade: true } } } },
        },
      },
    },
  });

  if (!user) return null;

  const base = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    phone: user.phone,
    photo: fileUrl(user.photo),
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };

  if (user.teacher) {
    return {
      ...base,
      teacher: {
        id: user.teacher.id,
        bio: user.teacher.bio,
        yearsExperience: user.teacher.yearsExperience,
        hourlyRate: user.teacher.hourlyRate,
        location: user.teacher.location
          ? { id: user.teacher.location.id, name: user.teacher.location.name }
          : null,
        subjects: user.teacher.subjects.map((s) => s.subject),
        grades: user.teacher.grades.map((g) => g.grade),
        availability: user.teacher.availability.map((a) => ({
          id: a.id,
          day: a.day,
          startTime: a.startTime,
          endTime: a.endTime,
          location: a.location ? { id: a.location.id, name: a.location.name } : null,
        })),
      },
    };
  }

  if (user.student) {
    return {
      ...base,
      student: {
        id: user.student.id,
        studentNumber: user.student.studentNumber ?? null,
        grade: user.student.grade
          ? { id: user.student.grade.id, name: user.student.grade.name }
          : null,
        subjects: user.student.studentSubjects.map((s) => s.subject),
        teachers: user.student.teachers.map((t) => ({
          id: t.teacher.id,
          fullName: t.teacher.user.fullName,
          photo: fileUrl(t.teacher.user.photo),
        })),
        parents: user.student.parents.map((p) => ({
          id: p.parent.id,
          fullName: p.parent.user.fullName,
        })),
      },
    };
  }

  if (user.parent) {
    return {
      ...base,
      parent: {
        id: user.parent.id,
        children: user.parent.children.map((c) => ({
          id: c.student.id,
          userId: c.student.userId,
          fullName: c.student.user.fullName,
          photo: fileUrl(c.student.user.photo),
          grade: c.student.grade ? c.student.grade.name : null,
          studentNumber: c.student.studentNumber ?? null,
        })),
      },
    };
  }

  // SUPER_ADMIN is a distinct platform role and must never be presented as a
  // center administrator. Center admins (CENTER_ADMIN) get the
  // `admin` profile shape the frontend expects.
  if (user.role === 'SUPER_ADMIN') {
    return { ...base, superAdmin: true };
  }
  return { ...base, admin: { id: user.id } };
}

import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { fileUrl } from '../middleware/upload';
import { recordActivity } from './activity.service';
import { teacherRepository } from '../repositories/teacher.repository';
import { ratingRepository } from '../repositories/rating.repository';

export const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export interface TeacherSearchFilters {
  subjectId?: string;
  gradeId?: string;
  day?: number;
  time?: string;
  locationId?: string;
  centerId?: string;
  maxPrice?: number;
  minRating?: number;
  name?: string;
  page?: number;
  limit?: number;
}

const TEACHER_BASE_SELECT = {
  id: true,
  bio: true,
  yearsExperience: true,
  hourlyRate: true,
  createdAt: true,
  centerId: true,
  user: { select: { id: true, fullName: true, photo: true, createdAt: true, status: true } },
  location: { select: { id: true, name: true } },
  subjects: { select: { subject: { select: { id: true, name: true } } } },
  grades: { select: { grade: { select: { id: true, name: true } } } },
  availability: {
    select: {
      id: true,
      day: true,
      startTime: true,
      endTime: true,
      location: { select: { id: true, name: true } },
    },
  },
} as const;

function shapeTeacher(row: any) {
  return {
    id: row.id,
    fullName: row.user.fullName,
    bio: row.bio,
    yearsExperience: row.yearsExperience,
    hourlyRate: row.hourlyRate,
    photo: fileUrl(row.user.photo),
    createdAt: row.createdAt,
    location: row.location,
    subjects: row.subjects.map((s: any) => s.subject),
    grades: row.grades.map((g: any) => g.grade),
    availability: row.availability,
  };
}

export async function searchTeachers(filters: TeacherSearchFilters) {
  const {
    subjectId,
    gradeId,
    day,
    time,
    locationId,
    centerId,
    maxPrice,
    minRating,
    name,
    page = 1,
    limit = 20,
  } = filters;

  const where: any = {
    // Public browsing only exposes teachers who are active themselves and
    // belong to an active, approved center (tenant).
    user: { status: 'ACTIVE' },
    center: { status: 'ACTIVE', subscriptionStatus: 'ACTIVE' },
  };

  if (subjectId) where.subjects = { some: { subjectId } };
  if (gradeId) where.grades = { some: { gradeId } };
  if (locationId) where.locationId = locationId;
  // Direct center relationship — never approximate by city/state.
  if (centerId) where.centerId = centerId;

  if (day !== undefined && day !== null) {
    const availabilityFilter: any = { some: { day } };
    if (time) {
      availabilityFilter.some.startTime = { lte: time };
      availabilityFilter.some.endTime = { gte: time };
    }
    where.availability = availabilityFilter;
  }

  if (maxPrice !== undefined && maxPrice !== null) {
    where.hourlyRate = { lte: maxPrice };
  }

  if (name) {
    where.user = { fullName: { contains: name, mode: 'insensitive' } };
  }

  let allowedIds: string[] | undefined;
  if (minRating !== undefined && minRating !== null) {
    const grouped = await prisma.rating.groupBy({
      by: ['teacherId'],
      _avg: { stars: true },
      having: { stars: { _avg: { gte: minRating } } },
    });
    allowedIds = grouped.map((g) => g.teacherId);
    if (allowedIds.length === 0) {
      return { data: [], page, limit, total: 0, totalPages: 0 };
    }
    where.id = { in: allowedIds };
  }

  const [total, teachers] = await Promise.all([
    teacherRepository.count(where),
    teacherRepository.findMany({
      where,
      select: TEACHER_BASE_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const ratings = await ratingMap(teachers.map((t) => t.id));
  const data = teachers.map((t) => ({
    ...shapeTeacher(t),
    rating: ratings.get(t.id)?.avg ?? 0,
    ratingCount: ratings.get(t.id)?.count ?? 0,
  }));

  return {
    data,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function ratingMap(teacherIds: string[]) {
  if (teacherIds.length === 0) return new Map<string, { avg: number; count: number }>();
  const rows = await teacherRepository.groupByRating(teacherIds);
  const map = new Map<string, { avg: number; count: number }>();
  for (const r of rows) {
    map.set(r.teacherId, { avg: Number((r._avg.stars ?? 0).toFixed(1)), count: r._count.stars });
  }
  return map;
}

export async function getTeacherById(teacherId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { ...TEACHER_BASE_SELECT },
  });
  if (!teacher) throw ApiError.notFound('Teacher not found.');
  return teacher;
}

export async function getTeacherPublicProfile(teacherId: string, viewerStudentId?: string) {
  const teacher = await getTeacherById(teacherId);

  // Public profiles are only for active teachers in active, approved centers.
  if (teacher.user.status !== 'ACTIVE') {
    throw ApiError.notFound('Teacher not found.');
  }
  if (teacher.centerId) {
    const center = await prisma.center.findUnique({
      where: { id: teacher.centerId },
      select: { status: true, subscriptionStatus: true },
    });
    if (!center || center.status !== 'ACTIVE' || center.subscriptionStatus !== 'ACTIVE') {
      throw ApiError.notFound('Teacher not found.');
    }
  }

  const [rating, studentCount, completedLessons, reviews, reviewsTotal, enrollment] = await Promise.all([
    teacherRepository.aggregateRating(teacherId),
    teacherRepository.countTeacherStudents(teacherId),
    prisma.lesson.count({ where: { teacherId, status: 'COMPLETED' } }),
    ratingRepository.findRecentReviews(teacherId, 10),
    ratingRepository.count({ teacherId }),
    viewerStudentId
      ? teacherRepository.findTeacherStudent(teacherId, viewerStudentId)
      : Promise.resolve(null),
  ]);

  const myLessonsCount = viewerStudentId
    ? await prisma.lesson.count({
        where: { teacherId, studentId: viewerStudentId, status: { in: ['SCHEDULED', 'RESCHEDULED'] } },
      })
    : 0;

  return {
    ...shapeTeacher(teacher),
    rating: Number((rating._avg.stars ?? 0).toFixed(1)),
    ratingCount: rating._count.stars,
    studentCount,
    completedLessons,
    isEnrolled: !!enrollment,
    myLessonsCount,
    reviews: reviews.map((r) => ({
      id: r.id,
      stars: r.stars,
      comment: r.comment,
      createdAt: r.createdAt,
      author: r.student
        ? { type: 'student', fullName: r.student.user.fullName, photo: fileUrl(r.student.user.photo) }
        : {
            type: 'parent',
            fullName: r.parent?.user.fullName ?? 'Parent',
            photo: fileUrl(r.parent?.user.photo ?? null),
          },
    })),
    reviewsTotal,
  };
}

export async function updateTeacherProfile(
  userId: string,
  data: {
    bio?: string;
    yearsExperience?: number;
    hourlyRate?: number;
    locationId?: string;
    subjects?: string[];
    grades?: string[];
    fullName?: string;
    phone?: string;
  },
) {
  const teacher = await teacherRepository.findByUserId(userId);
  if (!teacher) throw ApiError.notFound('Teacher profile not found.');

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

    if (data.subjects !== undefined) {
      const subjects = await tx.subject.findMany({ where: { id: { in: data.subjects } } });
      if (subjects.length !== data.subjects.length) {
        throw ApiError.badRequest('One or more subjects do not exist.', 'UNKNOWN_SUBJECT');
      }
      await tx.teacherSubject.deleteMany({ where: { teacherId: teacher.id } });
      await tx.teacherSubject.createMany({
        data: data.subjects.map((subjectId) => ({ teacherId: teacher.id, subjectId })),
      });
    }

    if (data.grades !== undefined) {
      const grades = await tx.grade.findMany({ where: { id: { in: data.grades } } });
      if (grades.length !== data.grades.length) {
        throw ApiError.badRequest('One or more grades do not exist.', 'UNKNOWN_GRADE');
      }
      await tx.teacherGrade.deleteMany({ where: { teacherId: teacher.id } });
      await tx.teacherGrade.createMany({
        data: data.grades.map((gradeId) => ({ teacherId: teacher.id, gradeId })),
      });
    }

    const t = await tx.teacher.update({
      where: { id: teacher.id },
      data: {
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        ...(data.yearsExperience !== undefined ? { yearsExperience: data.yearsExperience } : {}),
        ...(data.hourlyRate !== undefined ? { hourlyRate: data.hourlyRate } : {}),
        ...(data.locationId !== undefined ? { locationId: data.locationId || null } : {}),
      },
    });

    return t;
  });
}

export async function updateAvailability(
  userId: string,
  availability: { day: number; startTime: string; endTime: string; locationId?: string }[],
) {
  const teacher = await teacherRepository.findByUserId(userId);
  if (!teacher) throw ApiError.notFound('Teacher profile not found.');

  for (const a of availability) {
    if (a.startTime >= a.endTime) {
      throw ApiError.badRequest('Start time must be before end time.', 'INVALID_TIME_RANGE');
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.teacherAvailability.deleteMany({ where: { teacherId: teacher.id } });
    await tx.teacherAvailability.createMany({
      data: availability.map((a) => ({
        teacherId: teacher.id,
        day: a.day,
        startTime: a.startTime,
        endTime: a.endTime,
        locationId: a.locationId ?? null,
      })),
    });
  });

  await recordActivity({
    userId,
    role: 'TEACHER',
    action: 'updated_availability',
    entity: 'Teacher',
    entityId: teacher.id,
  });

  return teacherRepository.findAvailability(teacher.id);
}

export async function getTeacherStats(teacherId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const [
    totalStudents,
    upcomingLessons,
    todayLessons,
    pendingAssignments,
    upcomingExams,
    averageRating,
    completedLessons,
    upcomingLessonsList,
  ] = await Promise.all([
    teacherRepository.countTeacherStudents(teacherId),
    prisma.lesson.count({ where: { teacherId, date: { gte: todayStart }, status: 'SCHEDULED' } }),
    prisma.lesson.count({
      where: { teacherId, date: { gte: todayStart, lt: todayEnd }, status: 'SCHEDULED' },
    }),
    prisma.assignment.count({ where: { teacherId, deadline: { gte: now } } }),
    prisma.exam.count({ where: { teacherId, endTime: { gte: now } } }),
    teacherRepository.aggregateRating(teacherId),
    prisma.lesson.count({ where: { teacherId, status: 'COMPLETED' } }),
    prisma.lesson.findMany({
      where: { teacherId, date: { gte: todayStart }, status: { in: ['SCHEDULED', 'RESCHEDULED'] } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 5,
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        status: true,
        subject: { select: { id: true, name: true } },
        student: { select: { id: true, user: { select: { fullName: true } } } },
      },
    }),
  ]);

  return {
    totalStudents,
    upcomingLessons,
    todayLessons,
    pendingAssignments,
    upcomingExams,
    averageRating: Number((averageRating._avg.stars ?? 0).toFixed(1)),
    completedLessons,
      upcomingLessonsList: upcomingLessonsList.map((l) => ({
      id: l.id,
      date: l.date,
      startTime: l.startTime,
      endTime: l.endTime,
      status: l.status,
      subject: l.subject,
      student: l.student ? { id: l.student.id, fullName: l.student.user.fullName } : null,
    })),
  };
}

export async function getTeacherStudents(teacherId: string, page = 1, limit = 20) {
  const where = { teachers: { some: { teacherId } } };
  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      select: {
        id: true,
        user: { select: { id: true, fullName: true, photo: true } },
        grade: { select: { id: true, name: true } },
        studentSubjects: { select: { subject: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const studentIds = students.map((s) => s.id);
  const [upcoming, attendanceCounts] = await Promise.all([
    prisma.lesson.findMany({
      where: { teacherId, studentId: { in: studentIds }, date: { gte: new Date() }, status: 'SCHEDULED' },
      orderBy: { date: 'asc' },
      take: 5,
      select: { id: true, studentId: true, date: true, startTime: true, endTime: true },
    }),
    prisma.attendance.groupBy({
      by: ['studentId', 'status'],
      where: { studentId: { in: studentIds }, lesson: { teacherId } },
      _count: { _all: true },
    }),
  ]);

  return {
    data: students.map((s) => ({
      id: s.id,
      userId: s.user.id,
      fullName: s.user.fullName,
      photo: fileUrl(s.user.photo),
      grade: s.grade,
      subjects: s.studentSubjects.map((ss) => ss.subject),
      upcomingLesson: upcoming.find((l) => l.studentId === s.id) ?? null,
      attendance: attendanceCounts.filter((a) => a.studentId === s.id),
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateTeacherPhoto(userId: string, photoFile: string) {
  const teacher = await teacherRepository.findByUserId(userId);
  if (!teacher) throw ApiError.notFound('Teacher profile not found.');
  await prisma.user.update({ where: { id: userId }, data: { photo: photoFile } });
  return fileUrl(photoFile);
}

export async function teacherAssignableStudentIds(teacherId: string): Promise<string[]> {
  const rows = await teacherRepository.findTeacherStudentsByTeacher(teacherId);
  return rows.map((r) => r.studentId);
}

export async function getTeacherByUserId(userId: string) {
  return teacherRepository.findByUserId(userId);
}

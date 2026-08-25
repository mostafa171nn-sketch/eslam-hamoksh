import { prisma } from '../lib/prisma';
import { ratingRepository } from '../repositories/rating.repository';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from './activity.service';
import { resolveRoleEntity } from './lesson.service';
import { fileUrl } from '../middleware/upload';

export async function rateTeacher(
  actor: { userId: string; role: string },
  teacherId: string,
  stars: number,
  comment?: string,
) {
  if (stars < 1 || stars > 5) {
    throw ApiError.badRequest('Rating must be between 1 and 5 stars.', 'INVALID_RATING');
  }

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) throw ApiError.notFound('Teacher not found.');

  const { studentId, parentId } = await resolveRoleEntity(actor.userId, actor.role as any);

  // Only students/parents with a real relationship may rate.
  if (actor.role === 'STUDENT') {
    const rel = await prisma.teacherStudent.findUnique({
      where: { teacherId_studentId: { teacherId, studentId: studentId! } },
    });
    if (!rel) {
      throw ApiError.forbidden('You can only rate teachers you are actually registered with.');
    }
  } else if (actor.role === 'PARENT') {
    const children = await prisma.parentStudent.findMany({
      where: { parentId: parentId! },
      select: { studentId: true },
    });
    const rel = await prisma.teacherStudent.findFirst({
      where: { teacherId, studentId: { in: children.map((c) => c.studentId) } },
    });
    if (!rel) {
      throw ApiError.forbidden("You can only rate teachers your children are registered with.");
    }
  } else {
    throw ApiError.forbidden('Only students and parents can rate teachers.');
  }

  const rating = await prisma.$transaction(async (tx) => {
    if (actor.role === 'STUDENT') {
      return tx.rating.upsert({
        where: { teacherId_studentId: { teacherId, studentId: studentId! } },
        create: { teacherId, studentId: studentId!, stars, comment },
        update: { stars, comment },
      });
    }
    return tx.rating.upsert({
      where: { teacherId_parentId: { teacherId, parentId: parentId! } },
      create: { teacherId, parentId: parentId!, stars, comment },
      update: { stars, comment },
    });
  });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'rated_teacher',
    entity: 'Rating',
    entityId: rating.id,
  });

  return rating;
}

export async function listTeacherReviews(teacherId: string, page = 1, limit = 10) {
  const [total, reviews, agg] = await Promise.all([
    ratingRepository.count({ teacherId }),
    ratingRepository.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        student: { include: { user: { select: { fullName: true, photo: true } } } },
        parent: { include: { user: { select: { fullName: true, photo: true } } } },
      },
    }) as any,
    ratingRepository.aggregate({ teacherId }),
  ]);

  return {
    data: reviews.map((r: any) => ({
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
    average: Number((agg._avg.stars ?? 0).toFixed(1)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ---------------------------------------------------------------------------
// Center ratings
// ---------------------------------------------------------------------------

/** Aggregated public rating summary for a single center. */
export async function getCenterRatingSummary(centerId: string) {
  const agg = await prisma.centerRating.aggregate({
    where: { centerId },
    _avg: { stars: true },
    _count: true,
  });
  return {
    average: Number((agg._avg.stars ?? 0).toFixed(1)),
    count: agg._count,
  };
}

/** The authenticated user's own center rating (or null when not rated yet). */
export async function getMyCenterRating(userId: string, centerId: string) {
  const row = await prisma.centerRating.findUnique({
    where: { centerId_userId: { centerId, userId } },
    select: { stars: true, comment: true, updatedAt: true },
  });
  return row;
}

/**
 * Rate a learning center as the authenticated user. Any active member of the
 * platform (student / parent / teacher) may rate a center once; a second
 * submission updates their existing rating instead of duplicating it.
 */
export async function rateCenter(
  actor: { userId: string; role: string },
  centerId: string,
  stars: number,
  comment?: string,
) {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw ApiError.badRequest('Rating must be between 1 and 5 stars.', 'INVALID_RATING');
  }
  if (actor.role === 'CENTER_ADMIN' || actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN') {
    throw ApiError.forbidden('Administrators cannot rate centers.');
  }

  const center = await prisma.center.findUnique({
    where: { id: centerId },
    select: { id: true, status: true, subscriptionStatus: true },
  });
  if (!center || center.status !== 'ACTIVE' || center.subscriptionStatus !== 'ACTIVE') {
    throw ApiError.notFound('Center not found.');
  }

  const rating = await prisma.centerRating.upsert({
    where: { centerId_userId: { centerId, userId: actor.userId } },
    create: { centerId, userId: actor.userId, stars, comment },
    update: { stars, comment },
  });

  await recordActivity({
    userId: actor.userId,
    role: actor.role,
    action: 'rated_center',
    entity: 'CenterRating',
    entityId: rating.id,
  });

  return rating;
}

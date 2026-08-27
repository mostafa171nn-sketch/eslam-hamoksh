import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

export async function followCenter(studentId: string, centerId: string) {
  const center = await prisma.center.findUnique({ where: { id: centerId } });
  if (!center) throw ApiError.notFound('Center not found.');
  if (center.status !== 'ACTIVE') throw ApiError.forbidden('Center is not active.');

  const existing = await prisma.studentCenterFollow.findUnique({
    where: { studentId_centerId: { studentId, centerId } },
  });
  if (existing) return existing;

  return prisma.studentCenterFollow.create({
    data: { studentId, centerId },
  });
}

export async function unfollowCenter(studentId: string, centerId: string) {
  const existing = await prisma.studentCenterFollow.findUnique({
    where: { studentId_centerId: { studentId, centerId } },
  });
  if (!existing) throw ApiError.notFound('Follow not found.');

  await prisma.studentCenterFollow.delete({
    where: { studentId_centerId: { studentId, centerId } },
  });
}

export async function listFollowedCenters(studentId: string) {
  const follows = await prisma.studentCenterFollow.findMany({
    where: { studentId },
    include: { center: true },
    orderBy: { createdAt: 'desc' },
  });
  return follows.map((f) => f.center);
}

export async function isFollowing(studentId: string, centerId: string) {
  const existing = await prisma.studentCenterFollow.findUnique({
    where: { studentId_centerId: { studentId, centerId } },
  });
  return !!existing;
}

export async function getFollowersForCenter(centerId: string) {
  const follows = await prisma.studentCenterFollow.findMany({
    where: { centerId },
    select: { studentId: true },
  });
  return follows.map((f) => f.studentId);
}

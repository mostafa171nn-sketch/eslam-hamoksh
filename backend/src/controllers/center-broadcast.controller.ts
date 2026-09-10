import type { Request, Response } from 'express';
import type { BroadcastAudience, BroadcastStatus, Role } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

const EMPLOYEE_ROLES: Role[] = ['CENTER_EMPLOYEE', 'RECEPTIONIST', 'TEACHER_ASSISTANT', 'CENTER_ADMIN'];

const AUDIENCE_LABELS: Record<string, string> = {
  EMPLOYEES: 'الموظفون',
  TEACHERS: 'المدرسون',
  STUDENTS: 'الطلاب',
  PARENTS: 'أولياء الأمور',
  GROUP: 'مجموعة محددة',
};

function toBroadcastDto(b: {
  id: string;
  audience: BroadcastAudience;
  channel: string;
  subject: string;
  message: string;
  status: BroadcastStatus;
  scheduledFor: Date | null;
  sentAt: Date | null;
  recipientCount: number;
  readCount: number;
  groupName: string | null;
  createdAt: Date;
}) {
  return {
    id: b.id,
    audience: b.audience,
    channel: b.channel,
    subject: b.subject,
    message: b.message,
    status: b.status,
    scheduledFor: b.scheduledFor,
    sentAt: b.sentAt,
    recipientCount: b.recipientCount,
    readCount: b.readCount,
    groupName: b.groupName,
    createdAt: b.createdAt,
  };
}

function audienceLabel(audience: BroadcastAudience): string {
  return AUDIENCE_LABELS[audience] ?? audience;
}

/** Distinct user ids that an APP broadcast actually reaches (real records only). */
async function broadcastRecipientUserIds(
  centerId: string,
  audience: BroadcastAudience,
  groupId?: string | null,
): Promise<string[]> {
  switch (audience) {
    case 'EMPLOYEES': {
      const users = await prisma.user.findMany({ where: { centerId, role: { in: EMPLOYEE_ROLES } }, select: { id: true } });
      return users.map((u) => u.id);
    }
    case 'TEACHERS': {
      const teachers = await prisma.teacher.findMany({ where: { centerId }, select: { userId: true } });
      return teachers.map((t) => t.userId);
    }
    case 'STUDENTS': {
      const students = await prisma.student.findMany({ where: { centerId }, select: { userId: true } });
      return students.map((s) => s.userId);
    }
    case 'PARENTS': {
      const parents = await prisma.parent.findMany({ where: { centerId }, select: { userId: true } });
      return parents.map((p) => p.userId);
    }
    case 'GROUP': {
      if (!groupId) return [];
      const links = await prisma.parentStudent.findMany({
        where: { student: { groupEnrollments: { some: { groupId, status: 'ACTIVE' } } } },
        include: { parent: { select: { userId: true } } },
      });
      return [...new Set(links.map((l) => l.parent.userId))];
    }
    default:
      return [];
  }
}

async function broadcastRecipientCount(
  centerId: string,
  audience: BroadcastAudience,
  groupId?: string | null,
): Promise<number> {
  switch (audience) {
    case 'EMPLOYEES':
      return prisma.user.count({ where: { centerId, role: { in: EMPLOYEE_ROLES } } });
    case 'TEACHERS':
      return prisma.teacher.count({ where: { centerId } });
    case 'STUDENTS':
      return prisma.student.count({ where: { centerId } });
    case 'PARENTS':
      return prisma.parent.count({ where: { centerId } });
    case 'GROUP':
      return (await broadcastRecipientUserIds(centerId, 'GROUP', groupId)).length;
    default:
      return 0;
  }
}

async function deliverBroadcast(
  broadcastId: string,
  centerId: string,
  audience: BroadcastAudience,
  groupId: string | null,
  title: string,
  message: string,
) {
  const userIds = await broadcastRecipientUserIds(centerId, audience, groupId);
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: 'GENERAL' as const,
      title,
      message,
      broadcastId,
    })),
  });
}

async function liveReadCounts(): Promise<Map<string, number>> {
  const grouped = await prisma.notification.groupBy({
    by: ['broadcastId'],
    where: { broadcastId: { not: null }, read: true },
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const row of grouped) {
    if (row.broadcastId) map.set(row.broadcastId, row._count._all);
  }
  return map;
}

export const listBroadcasts = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { search, status } = req.query as Record<string, string | undefined>;

  let audienceMatch: BroadcastAudience | undefined;
  const trimmed = search?.trim();
  if (trimmed) {
    const labeled = Object.entries(AUDIENCE_LABELS).find(([, label]) => label.includes(trimmed));
    if (labeled) audienceMatch = labeled[0] as BroadcastAudience;
    else if (Object.keys(AUDIENCE_LABELS).includes(trimmed.toUpperCase())) {
      audienceMatch = trimmed.toUpperCase() as BroadcastAudience;
    }
  }

  const where: Prisma.BroadcastWhereInput = {
    centerId,
    ...(status ? { status: status as BroadcastStatus } : {}),
    ...(trimmed
      ? {
          OR: [
            { subject: { contains: trimmed, mode: 'insensitive' } },
            { groupName: { contains: trimmed, mode: 'insensitive' } },
            ...(audienceMatch ? [{ audience: audienceMatch }] : []),
          ],
        }
      : {}),
  };

  const broadcasts = await prisma.broadcast.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const reads = await liveReadCounts();

  return ok(
    res,
    broadcasts.map((b) => toBroadcastDto({ ...b, readCount: reads.get(b.id) ?? b.readCount })),
  );
});

export const getBroadcastSummary = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [total, sent, scheduled, recipientsToday] = await Promise.all([
    prisma.broadcast.count({ where: { centerId } }),
    prisma.broadcast.count({ where: { centerId, status: 'SENT' } }),
    prisma.broadcast.count({ where: { centerId, status: 'SCHEDULED' } }),
    prisma.broadcast.aggregate({
      where: {
        centerId,
        OR: [
          { status: 'SENT', sentAt: { gte: startOfToday } },
          { status: 'SCHEDULED', scheduledFor: { gte: startOfToday } },
        ],
      },
      _sum: { recipientCount: true },
    }),
  ]);

  return ok(res, {
    total,
    sent,
    scheduled,
    recipientsToday: recipientsToday._sum.recipientCount ?? 0,
  });
});

export const createBroadcast = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { audience, subject, message, groupId, scheduledFor, sendNow } = req.body ?? {};
  if (!subject || !message) throw ApiError.badRequest('subject and message are required');

  const targetAudience = (audience ?? 'EMPLOYEES') as BroadcastAudience;
  let groupName: string | null = null;
  if (targetAudience === 'GROUP') {
    if (!groupId) throw ApiError.badRequest('groupId is required for group broadcasts');
    const group = await prisma.group.findFirst({ where: { id: groupId, centerId }, include: { subject: true } });
    if (!group) throw ApiError.notFound('Group not found');
    groupName = group.subject?.name ?? group.name;
  }

  const recipientCount = await broadcastRecipientCount(centerId, targetAudience, groupId ?? null);

  const willSendNow = sendNow === true || !scheduledFor;
  const sendAt = willSendNow ? new Date() : new Date(scheduledFor);

  const broadcast = await prisma.broadcast.create({
    data: {
      centerId,
      audience: targetAudience,
      channel: 'APP',
      subject,
      message,
      status: willSendNow ? 'SENT' : 'SCHEDULED',
      scheduledFor: willSendNow ? null : sendAt,
      sentAt: willSendNow ? sendAt : null,
      recipientCount,
      readCount: 0,
      groupId: targetAudience === 'GROUP' ? groupId : null,
      groupName,
    },
  });

  if (willSendNow) {
    await deliverBroadcast(broadcast.id, centerId, targetAudience, broadcast.groupId, subject, message);
  }

  await recordActivity({ userId: req.user!.id, action: 'created_broadcast', entity: 'Broadcast', entityId: broadcast.id });

  return ok(res, toBroadcastDto(broadcast), 'Broadcast created');
});

export const duplicateBroadcast = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const source = await prisma.broadcast.findFirst({ where: { id, centerId } });
  if (!source) throw ApiError.notFound('Broadcast not found');

  const copy = await prisma.broadcast.create({
    data: {
      centerId,
      audience: source.audience,
      channel: source.channel,
      subject: `نسخة: ${source.subject}`,
      message: source.message,
      status: 'DRAFT',
      scheduledFor: null,
      sentAt: null,
      recipientCount: source.recipientCount,
      readCount: 0,
      groupId: source.groupId,
      groupName: source.groupName,
    },
  });

  await recordActivity({ userId: req.user!.id, action: 'duplicated_broadcast', entity: 'Broadcast', entityId: copy.id });

  return ok(res, toBroadcastDto(copy), 'Broadcast duplicated as draft');
});

export const sendBroadcastNow = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const broadcast = await prisma.broadcast.findFirst({ where: { id, centerId } });
  if (!broadcast) throw ApiError.notFound('Broadcast not found');
  if (broadcast.status === 'SENT') throw ApiError.badRequest('Broadcast already sent');

  const updated = await prisma.broadcast.update({
    where: { id },
    data: { status: 'SENT', scheduledFor: null, sentAt: new Date() },
  });

  await deliverBroadcast(updated.id, centerId, updated.audience, updated.groupId, updated.subject, updated.message);
  await recordActivity({ userId: req.user!.id, action: 'sent_broadcast', entity: 'Broadcast', entityId: id });

  return ok(res, toBroadcastDto(updated), 'Broadcast sent');
});

export const cancelBroadcast = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const broadcast = await prisma.broadcast.findFirst({ where: { id, centerId } });
  if (!broadcast) throw ApiError.notFound('Broadcast not found');
  if (broadcast.status === 'SENT') throw ApiError.badRequest('Cannot cancel a sent broadcast');

  const updated = await prisma.broadcast.update({ where: { id }, data: { status: 'CANCELLED' } });
  await recordActivity({ userId: req.user!.id, action: 'cancelled_broadcast', entity: 'Broadcast', entityId: id });

  return ok(res, toBroadcastDto(updated), 'Broadcast cancelled');
});

export const deleteBroadcast = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const broadcast = await prisma.broadcast.findFirst({ where: { id, centerId } });
  if (!broadcast) throw ApiError.notFound('Broadcast not found');

  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { broadcastId: id } }),
    prisma.broadcast.delete({ where: { id } }),
  ]);
  await recordActivity({ userId: req.user!.id, action: 'deleted_broadcast', entity: 'Broadcast', entityId: id });

  return ok(res, { id }, 'Broadcast deleted');
});
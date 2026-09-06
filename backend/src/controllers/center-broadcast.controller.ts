import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

export const listBroadcasts = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const broadcasts = await prisma.broadcast.findMany({
    where: { centerId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return ok(
    res,
    broadcasts.map((b) => ({
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
      createdAt: b.createdAt,
    })),
  );
});

export const getBroadcastSummary = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const [total, sent, scheduled, recipients] = await Promise.all([
    prisma.broadcast.count(),
    prisma.broadcast.count({ where: { status: 'SENT' } }),
    prisma.broadcast.count({ where: { status: 'SCHEDULED' } }),
    prisma.broadcast.aggregate({ _sum: { recipientCount: true } }),
  ]);

  return ok(res, {
    total,
    sent,
    scheduled,
    recipients: recipients._sum.recipientCount ?? 0,
  });
});

export const createBroadcast = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { audience, channel, subject, message, scheduledFor, sendNow } = req.body ?? {};
  if (!subject || !message) throw ApiError.badRequest('subject and message are required');

  const recipientCount =
    audience === 'EMPLOYEES'
      ? await prisma.user.count({ where: { centerId, role: { in: ['CENTER_EMPLOYEE', 'RECEPTIONIST', 'TEACHER_ASSISTANT', 'CENTER_ADMIN'] } } })
      : audience === 'TEACHERS'
        ? await prisma.teacher.count({ where: { centerId } })
        : await prisma.student.count({ where: { centerId } });

  const willSendNow = sendNow === true || !scheduledFor;
  const sendAt = willSendNow ? new Date() : new Date(scheduledFor);

  const broadcast = await prisma.broadcast.create({
    data: {
      centerId,
      audience: audience || 'EMPLOYEES',
      channel: channel || 'APP',
      subject,
      message,
      status: willSendNow ? 'SENT' : 'SCHEDULED',
      scheduledFor: willSendNow ? null : sendAt,
      sentAt: willSendNow ? sendAt : null,
      recipientCount,
      readCount: 0,
    },
  });

  await recordActivity({ userId: req.user!.id, action: 'created_broadcast', entity: 'Broadcast', entityId: broadcast.id });

  return ok(res, broadcast, 'Broadcast created');
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

  await recordActivity({ userId: req.user!.id, action: 'sent_broadcast', entity: 'Broadcast', entityId: id });

  return ok(res, updated, 'Broadcast sent');
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

  return ok(res, updated, 'Broadcast cancelled');
});

export const deleteBroadcast = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const broadcast = await prisma.broadcast.findFirst({ where: { id, centerId } });
  if (!broadcast) throw ApiError.notFound('Broadcast not found');

  await prisma.broadcast.delete({ where: { id } });
  await recordActivity({ userId: req.user!.id, action: 'deleted_broadcast', entity: 'Broadcast', entityId: id });

  return ok(res, { id }, 'Broadcast deleted');
});
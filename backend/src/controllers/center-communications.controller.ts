import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';

// ---------------------------------------------------------------- complaints

export const listComplaints = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { search, severity, status } = req.query as Record<string, string | undefined>;

  const complaints = await prisma.complaint.findMany({
    where: {
      ...(severity ? { severity: severity as any } : {}),
      ...(status ? { status: status as any } : {}),
      ...(search ? { OR: [{ subject: { contains: search } }, { reporterName: { contains: search } }, { code: { contains: search } }] } : {}),
    },
    include: {
      assignee: { select: { fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return ok(
    res,
    complaints.map((c) => ({
      id: c.id,
      code: c.code,
      source: c.source,
      severity: c.severity,
      score: c.score,
      subject: c.subject,
      description: c.description,
      reporterName: c.reporterName,
      assignee: c.assignee?.fullName || null,
      status: c.status,
      internalAssessment: c.internalAssessment,
      resolvedAt: c.resolvedAt,
      createdAt: c.createdAt,
    })),
  );
});

export const getComplaintsSummary = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const [total, critical, high, medium, low, open] = await Promise.all([
    prisma.complaint.count(),
    prisma.complaint.count({ where: { severity: 'CRITICAL' } }),
    prisma.complaint.count({ where: { severity: 'HIGH' } }),
    prisma.complaint.count({ where: { severity: 'MEDIUM' } }),
    prisma.complaint.count({ where: { severity: 'LOW' } }),
    prisma.complaint.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
  ]);

  return ok(res, { total, critical, high, medium, low, open });
});

export const createComplaint = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { source, severity, subject, description, reporterName, assigneeId } = req.body ?? {};
  if (!subject) throw ApiError.badRequest('Complaint subject is required');

  const year = new Date().getFullYear();
  const count = await prisma.complaint.count();
  const code = `COM-${year}-${String(count + 1).padStart(4, '0')}`;

  const complaint = await prisma.complaint.create({
    data: {
      centerId,
      code,
      source: source || 'EXTERNAL',
      severity: severity || 'MEDIUM',
      score: (severity
        ? { CRITICAL: 90, HIGH: 70, MEDIUM: 45, LOW: 20 }[severity as string]
        : 45) || 45,
      subject,
      description: description || null,
      reporterName: reporterName || null,
      assigneeId: assigneeId || null,
    },
  });

  await recordActivity({ userId: req.user!.id, action: 'created_complaint', entity: 'Complaint', entityId: complaint.id });

  return ok(res, complaint, 'Complaint recorded');
});

export const updateComplaint = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const complaint = await prisma.complaint.findFirst({ where: { id, centerId } });
  if (!complaint) throw ApiError.notFound('Complaint not found');

  const { status, assigneeId, internalAssessment } = req.body ?? {};
  const data: any = {};
  if (status !== undefined) {
    data.status = status;
    if (status === 'RESOLVED' || status === 'CLOSED') data.resolvedAt = new Date();
  }
  if (assigneeId !== undefined) data.assigneeId = assigneeId || null;
  if (internalAssessment !== undefined) data.internalAssessment = internalAssessment;

  const updated = await prisma.complaint.update({ where: { id }, data });
  await recordActivity({ userId: req.user!.id, action: 'updated_complaint', entity: 'Complaint', entityId: id, details: status });

  return ok(res, updated, 'Complaint updated');
});

// ------------------------------------------------------------- center messages

export const listCenterMessages = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { read } = req.query as Record<string, string | undefined>;

  const messages = await prisma.centerMessage.findMany({
    where: { ...(read !== undefined ? { read: read === 'true' } : {}) },
    include: {
      sender: { select: { fullName: true } },
      recipient: { select: { fullName: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return ok(
    res,
    messages.map((m) => ({
      id: m.id,
      subject: m.subject,
      message: m.message,
      read: m.read,
      readAt: m.readAt,
      sender: m.sender.fullName,
      recipient: m.recipient?.fullName || null,
      recipientRole: m.recipient?.role || null,
      createdAt: m.createdAt,
    })),
  );
});

export const getMessagesSummary = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const [total, unread] = await Promise.all([
    prisma.centerMessage.count(),
    prisma.centerMessage.count({ where: { read: false } }),
  ]);

  return ok(res, { total, unread });
});

export const sendCenterMessage = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { recipientId, subject, message } = req.body ?? {};
  if (!subject || !message) throw ApiError.badRequest('subject and message are required');

  const msg = await prisma.centerMessage.create({
    data: {
      centerId,
      senderId: req.user!.id,
      recipientId: recipientId || null,
      subject,
      message,
    },
  });

  await recordActivity({ userId: req.user!.id, action: 'sent_center_message', entity: 'CenterMessage', entityId: msg.id });

  return ok(res, msg, 'Message sent');
});

export const markMessageRead = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const msg = await prisma.centerMessage.findFirst({ where: { id, centerId } });
  if (!msg) throw ApiError.notFound('Message not found');

  const updated = await prisma.centerMessage.update({ where: { id }, data: { read: true, readAt: new Date() } });
  return ok(res, updated, 'Message marked as read');
});
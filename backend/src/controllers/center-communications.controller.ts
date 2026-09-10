import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentCenterId } from '../lib/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { recordActivity } from '../services/activity.service';
import { sendNotification } from '../services/notification.service';

const SEVERITY_SCORE: Record<string, number> = { CRITICAL: 92, HIGH: 74, MEDIUM: 50, LOW: 25 };
const SEVERITY_WEIGHT: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const INTERNAL_ASSESSMENT: Record<string, string> = {
  CRITICAL: 'خطورة قصوى ومخاطرة مباشرة — يُصعّد فورًا لمدير السنتر.',
  HIGH: 'أولوية عالية — يجب بدء المعالجة خلال دقائق من استقبال الشكوى.',
  MEDIUM: 'أولوية متوسطة — تحتاج متابعة خلال ساعات من استقبال الشكوى.',
  LOW: 'أولوية منخفضة — تُعالج ضمن دورة العمل العادية.',
};

// ------------------------------------------------------------ combined summary

export const getCommunicationsSummary = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const [employeeMessages, unread, openComplaints, criticalHigh] = await Promise.all([
    prisma.centerMessage.count({ where: { centerId } }),
    prisma.centerMessage.count({ where: { centerId, read: false } }),
    prisma.complaint.count({ where: { centerId, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
    prisma.complaint.count({
      where: { centerId, severity: { in: ['CRITICAL', 'HIGH'] }, status: { notIn: ['RESOLVED', 'CLOSED'] } },
    }),
  ]);

  return ok(res, { employeeMessages, unread, openComplaints, criticalHigh });
});

// ---------------------------------------------------------------- complaints

export const listComplaints = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { search, severity, status } = req.query as Record<string, string | undefined>;

  const complaints = await prisma.complaint.findMany({
    where: {
      centerId,
      ...(severity ? { severity: severity as any } : {}),
      ...(status ? { status: status as any } : {}),
      ...(search
        ? { OR: [{ subject: { contains: search } }, { reporterName: { contains: search } }, { code: { contains: search } }] }
        : {}),
    },
    include: {
      assignee: { select: { fullName: true, photo: true, role: true } },
    },
    take: 200,
  });

  complaints.sort((a, b) => {
    const sev = (SEVERITY_WEIGHT[a.severity] ?? 9) - (SEVERITY_WEIGHT[b.severity] ?? 9);
    if (sev !== 0) return sev;
    return b.createdAt.getTime() - a.createdAt.getTime();
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
      assigneeId: c.assigneeId,
      assignee: c.assignee?.fullName || null,
      assigneeRole: c.assignee?.role || null,
      status: c.status,
      internalAssessment: c.internalAssessment,
      internalNotes: c.internalNotes,
      resolvedAt: c.resolvedAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  );
});

export const getComplaintsSummary = asyncHandler(async (_req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const [total, critical, high, medium, low, open] = await Promise.all([
    prisma.complaint.count({ where: { centerId } }),
    prisma.complaint.count({ where: { centerId, severity: 'CRITICAL' } }),
    prisma.complaint.count({ where: { centerId, severity: 'HIGH' } }),
    prisma.complaint.count({ where: { centerId, severity: 'MEDIUM' } }),
    prisma.complaint.count({ where: { centerId, severity: 'LOW' } }),
    prisma.complaint.count({ where: { centerId, status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] } } }),
  ]);

  return ok(res, { total, critical, high, medium, low, open });
});

export const createComplaint = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { source, severity, subject, description, reporterName, assigneeId } = req.body ?? {};
  if (!subject) throw ApiError.badRequest('Complaint subject is required');

  const count = await prisma.complaint.count({ where: { centerId } });
  const code = `CMP-${String(count + 1).padStart(4, '0')}`;
  const sev =
    typeof severity === 'string' && severity in SEVERITY_SCORE ? (severity as any) : 'MEDIUM';

  const complaint = await prisma.complaint.create({
    data: {
      centerId,
      code,
      source: source || 'EXTERNAL',
      severity: sev,
      score: SEVERITY_SCORE[sev] ?? 45,
      subject,
      description: description || null,
      reporterName: reporterName || null,
      assigneeId: assigneeId || null,
      internalAssessment: INTERNAL_ASSESSMENT[sev] || null,
    },
  });

  if (assigneeId) {
    await sendNotification({
      userId: assigneeId,
      type: 'GENERAL',
      title: `${code} · شكوى جديدة`,
      message: `${subject}`,
    });
  }

  await recordActivity({ userId: req.user!.id, action: 'created_complaint', entity: 'Complaint', entityId: complaint.id });

  return ok(res, complaint, 'Complaint recorded');
});

export const updateComplaint = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { id } = req.params;
  const complaint = await prisma.complaint.findFirst({ where: { id, centerId } });
  if (!complaint) throw ApiError.notFound('Complaint not found');

  const { status, assigneeId, note } = req.body ?? {};
  const data: any = {};

  if (status !== undefined) {
    data.status = status;
    if (status === 'RESOLVED' || status === 'CLOSED') data.resolvedAt = new Date();
    else data.resolvedAt = null;
  }

  if (assigneeId !== undefined) {
    const nextAssigneeId = assigneeId || null;
    if (complaint.assigneeId !== nextAssigneeId) {
      data.assigneeId = nextAssigneeId;
      if (nextAssigneeId) {
        await sendNotification({
          userId: nextAssigneeId,
          type: 'GENERAL',
          title: `${complaint.code || 'شكوى'} · إسناد`,
          message: `أُسندت إليك شكوى "${complaint.subject}".`,
        });
      }
    }
  }

  if (note !== undefined && typeof note === 'string' && note.trim()) {
    const stamp = new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
    const nextNote = `• ${stamp}: ${note.trim()}`;
    data.internalNotes = complaint.internalNotes ? `${complaint.internalNotes}\n${nextNote}` : nextNote;
  }

  const updated = await prisma.complaint.update({ where: { id }, data });
  await recordActivity({ userId: req.user!.id, action: 'updated_complaint', entity: 'Complaint', entityId: id, details: status || note || '' });

  return ok(res, updated, 'Complaint updated');
});

// ------------------------------------------------------------- center messages

export const listCenterMessages = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.unauthorized();

  const { read } = req.query as Record<string, string | undefined>;

  const messages = await prisma.centerMessage.findMany({
    where: { centerId, ...(read !== undefined ? { read: read === 'true' } : {}) },
    include: {
      sender: { select: { fullName: true, photo: true, role: true } },
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
      senderRole: m.sender.role,
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
    prisma.centerMessage.count({ where: { centerId } }),
    prisma.centerMessage.count({ where: { centerId, read: false } }),
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

  if (recipientId) {
    await sendNotification({
      userId: recipientId,
      type: 'GENERAL',
      title: 'رسالة من إدارة السنتر',
      message: subject,
    });
  }

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
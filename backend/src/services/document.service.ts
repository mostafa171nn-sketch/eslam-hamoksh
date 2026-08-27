import { documentRepository } from '../repositories/document.repository';
import { notificationTemplateRepository } from '../repositories/notification-template.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { ApiError } from '../utils/ApiError';

interface Actor {
  userId: string;
  role: string;
}

export async function listDocuments(actor: Actor, query: {
  search?: string;
  status?: string;
  type?: string;
  ownerId?: string;
  page?: number;
  limit?: number;
}) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 25;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;
  if (query.ownerId) where.ownerId = query.ownerId;

  // Non-admin users can only see their own documents
  const isAdmin = actor.role === 'SUPER_ADMIN' || actor.role === 'CENTER_ADMIN' || actor.role === 'ADMIN' || actor.role === 'ADMIN' || actor.role === 'CENTER_EMPLOYEE';
  if (!isAdmin) {
    where.ownerId = actor.userId;
  }

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    documentRepository.findMany({
      where,
      include: {
        owner: { select: { id: true, fullName: true, role: true } },
        verifiedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    documentRepository.count(where),
  ]);

  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function getDocument(actor: Actor, id: string) {
  const doc = await documentRepository.findById(id);
  if (!doc) throw ApiError.notFound('Document not found.');

  // Ownership check: non-admins can only view own documents
  const isAdmin = actor.role === 'SUPER_ADMIN' || actor.role === 'CENTER_ADMIN' || actor.role === 'ADMIN' || actor.role === 'ADMIN' || actor.role === 'CENTER_EMPLOYEE';
  if (!isAdmin && doc.ownerId !== actor.userId) {
    throw ApiError.forbidden('You can only view your own documents.');
  }

  return doc;
}

export async function uploadDocument(actor: Actor, input: {
  title: string;
  description?: string;
  type?: string;
  fileUrl: string;
  mimeType?: string;
  fileSize?: number;
  expiresAt?: Date;
}) {
  const doc = await documentRepository.create({
    title: input.title,
    description: input.description,
    type: (input.type as any) ?? 'OTHER',
    fileUrl: input.fileUrl,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    expiresAt: input.expiresAt,
    owner: { connect: { id: actor.userId } },
  });

  return doc;
}

export async function updateDocument(actor: Actor, id: string, input: {
  title?: string;
  description?: string;
  type?: string;
}) {
  const doc = await documentRepository.findById(id);
  if (!doc) throw ApiError.notFound('Document not found.');

  const isAdmin = actor.role === 'SUPER_ADMIN' || actor.role === 'CENTER_ADMIN' || actor.role === 'ADMIN' || actor.role === 'ADMIN';
  if (!isAdmin && doc.ownerId !== actor.userId) {
    throw ApiError.forbidden('You can only update your own documents.');
  }

  // Only pending documents can be updated
  if (doc.status !== 'PENDING') {
    throw ApiError.badRequest('Only pending documents can be updated.');
  }

  return documentRepository.update(id, {
    title: input.title,
    description: input.description,
    type: input.type as any,
  });
}

export async function deleteDocument(actor: Actor, id: string) {
  const doc = await documentRepository.findById(id);
  if (!doc) throw ApiError.notFound('Document not found.');

  const isAdmin = actor.role === 'SUPER_ADMIN' || actor.role === 'CENTER_ADMIN' || actor.role === 'ADMIN' || actor.role === 'ADMIN';
  if (!isAdmin && doc.ownerId !== actor.userId) {
    throw ApiError.forbidden('You can only delete your own documents.');
  }

  return documentRepository.delete(id);
}

export async function verifyDocument(actor: Actor, id: string) {
  const doc = await documentRepository.findById(id);
  if (!doc) throw ApiError.notFound('Document not found.');

  if (doc.status !== 'PENDING') {
    throw ApiError.badRequest('Only pending documents can be verified.');
  }

  const verified = await documentRepository.verify(id, actor.userId);

  // Send notification to document owner
  try {
    const template = await notificationTemplateRepository.findByKey('PAYMENT_APPROVED');
    if (template) {
      await notificationRepository.createMany([{
        userId: doc.ownerId,
        type: 'SYSTEM' as any,
        title: template.titleTemplate,
        message: `تمت الموافقة على المستند "${doc.title}".`,
      }]);
    } else {
      await notificationRepository.createMany([{
        userId: doc.ownerId,
        type: 'SYSTEM' as any,
        title: 'تمت الموافقة على المستند',
        message: `تمت الموافقة على المستند "${doc.title}".`,
      }]);
    }
  } catch { /* notification failure must not break the flow */ }

  return verified;
}

export async function rejectDocument(actor: Actor, id: string, reason: string) {
  if (!reason || reason.trim().length === 0) {
    throw ApiError.badRequest('Rejection reason is required.');
  }

  const doc = await documentRepository.findById(id);
  if (!doc) throw ApiError.notFound('Document not found.');

  if (doc.status !== 'PENDING') {
    throw ApiError.badRequest('Only pending documents can be rejected.');
  }

  const rejected = await documentRepository.reject(id, actor.userId, reason);

  try {
    await notificationRepository.createMany([{
      userId: doc.ownerId,
      type: 'SYSTEM' as any,
      title: 'تم رفض المستند',
      message: `تم رفض المستند "${doc.title}". السبب: ${reason}`,
    }]);
  } catch { /* notification failure must not break the flow */ }

  return rejected;
}

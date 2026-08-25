import { centerRegistrationRepository } from '../repositories/center-registration.repository';
import { centerRepository } from '../repositories/center.repository';
import { ApiError } from '../utils/ApiError';

export interface CreateRegistrationRequestInput {
  centerId: string;
  requesterId: string;
  reason?: string;
}

export async function createRegistrationRequest(input: CreateRegistrationRequestInput) {
  const center = await centerRepository.findById(input.centerId);
  if (!center) throw ApiError.notFound('Center not found.');

  const existing = await centerRegistrationRepository.findPendingByCenterId(input.centerId);
  if (existing) {
    throw ApiError.badRequest(
      'A pending registration request already exists for this center.',
      'PENDING_REQUEST_EXISTS',
    );
  }

  return centerRegistrationRepository.create({
    center: { connect: { id: input.centerId } },
    requester: { connect: { id: input.requesterId } },
    status: 'PENDING',
    reason: input.reason,
  });
}

export async function approveRegistrationRequest(
  requestId: string,
  reviewerId: string,
  reviewNotes?: string,
) {
  const request = await centerRegistrationRepository.findById(requestId);
  if (!request) throw ApiError.notFound('Registration request not found.');
  if (request.status !== 'PENDING') {
    throw ApiError.badRequest('Only pending requests can be approved.', 'INVALID_STATUS');
  }

  return centerRegistrationRepository.approveWithCenterAndAdmin(
    requestId,
    {
      status: 'APPROVED',
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewNotes,
    },
    request.centerId,
    {
      status: 'ACTIVE',
      requiresApproval: false,
      approvedById: reviewerId,
      approvedAt: new Date(),
    },
    { centerId: request.centerId, role: 'CENTER_ADMIN', status: 'PENDING' },
    { status: 'ACTIVE' },
  );
}

export async function rejectRegistrationRequest(
  requestId: string,
  reviewerId: string,
  reason?: string,
  reviewNotes?: string,
) {
  const request = await centerRegistrationRepository.findById(requestId);
  if (!request) throw ApiError.notFound('Registration request not found.');
  if (request.status !== 'PENDING') {
    throw ApiError.badRequest('Only pending requests can be rejected.', 'INVALID_STATUS');
  }

  return centerRegistrationRepository.rejectWithCenter(
    requestId,
    {
      status: 'REJECTED',
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reason,
      reviewNotes,
    },
    request.centerId,
    {
      status: 'REJECTED',
      requiresApproval: false,
      rejectedReason: reason,
    },
  );
}

export async function cancelRegistrationRequest(requestId: string, userId: string) {
  const request = await centerRegistrationRepository.findById(requestId);
  if (!request) throw ApiError.notFound('Registration request not found.');
  if (request.requesterId !== userId) {
    throw ApiError.forbidden('You can only cancel your own registration requests.');
  }
  if (request.status !== 'PENDING') {
    throw ApiError.badRequest('Only pending requests can be cancelled.', 'INVALID_STATUS');
  }

  return centerRegistrationRepository.update(requestId, { status: 'CANCELLED' });
}

export async function listRegistrationRequests(filters: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;

  const [items, total] = await Promise.all([
    centerRegistrationRepository.findMany({
      where,
      include: {
        center: { select: { id: true, name: true, slug: true, city: true, status: true } },
        requester: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    centerRegistrationRepository.count(where),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getRegistrationRequest(id: string) {
  const items = await centerRegistrationRepository.findMany({
    where: { id },
    include: {
      center: {
        select: { id: true, name: true, slug: true, city: true, status: true },
      },
      requester: { select: { id: true, fullName: true, username: true } },
    },
  });
  return items[0] ?? null;
}

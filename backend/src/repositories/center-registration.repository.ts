import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const centerRegistrationRepository = {
  findById(id: string) {
    return prisma.centerRegistrationRequest.findUnique({ where: { id } });
  },

  findMany(args: Prisma.CenterRegistrationRequestFindManyArgs) {
    return prisma.centerRegistrationRequest.findMany(args);
  },

  count(where: Prisma.CenterRegistrationRequestWhereInput) {
    return prisma.centerRegistrationRequest.count({ where });
  },

  create(data: Prisma.CenterRegistrationRequestCreateInput) {
    return prisma.centerRegistrationRequest.create({ data });
  },

  update(id: string, data: Prisma.CenterRegistrationRequestUpdateInput) {
    return prisma.centerRegistrationRequest.update({ where: { id }, data });
  },

  findPendingByCenterId(centerId: string) {
    return prisma.centerRegistrationRequest.findFirst({
      where: { centerId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  },

  findLatestByCenterId(centerId: string) {
    return prisma.centerRegistrationRequest.findFirst({
      where: { centerId },
      orderBy: { createdAt: 'desc' },
    });
  },

  // ── Transactional operations ────────────────────────────────────────

  approveWithCenterAndAdmin(
    requestId: string,
    requestData: Prisma.CenterRegistrationRequestUpdateInput,
    centerId: string,
    centerData: Prisma.CenterUpdateInput,
    adminWhere: Prisma.UserWhereInput,
    adminData: Prisma.UserUpdateInput,
  ) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.centerRegistrationRequest.update({
        where: { id: requestId },
        data: requestData,
      });
      await tx.center.update({
        where: { id: centerId },
        data: centerData,
      });
      await tx.user.updateMany({
        where: adminWhere,
        data: adminData,
      });
      return updated;
    });
  },

  rejectWithCenter(
    requestId: string,
    requestData: Prisma.CenterRegistrationRequestUpdateInput,
    centerId: string,
    centerData: Prisma.CenterUpdateInput,
  ) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.centerRegistrationRequest.update({
        where: { id: requestId },
        data: requestData,
      });
      await tx.center.update({
        where: { id: centerId },
        data: centerData,
      });
      return updated;
    });
  },
};

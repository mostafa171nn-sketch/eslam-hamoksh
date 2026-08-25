import { prisma } from '../lib/prisma';
import { Prisma, DocumentStatus } from '@prisma/client';

export const documentRepository = {
  findById(id: string) {
    return prisma.document.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, fullName: true, role: true } },
        verifiedBy: { select: { id: true, fullName: true } },
      },
    });
  },

  findMany(args: Prisma.DocumentFindManyArgs) {
    return prisma.document.findMany(args);
  },

  count(where: Prisma.DocumentWhereInput) {
    return prisma.document.count({ where });
  },

  create(data: Prisma.DocumentCreateInput) {
    return prisma.document.create({ data });
  },

  update(id: string, data: Prisma.DocumentUpdateInput) {
    return prisma.document.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.document.delete({ where: { id } });
  },

  verify(id: string, verifiedById: string) {
    return prisma.document.update({
      where: { id },
      data: { status: 'APPROVED' as DocumentStatus, verifiedById, verifiedAt: new Date() },
    });
  },

  reject(id: string, verifiedById: string, rejectionReason: string) {
    return prisma.document.update({
      where: { id },
      data: { status: 'REJECTED' as DocumentStatus, verifiedById, verifiedAt: new Date(), rejectionReason },
    });
  },
};

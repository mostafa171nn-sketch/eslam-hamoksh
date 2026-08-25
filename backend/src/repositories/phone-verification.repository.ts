import { prisma } from '../lib/prisma';
export const phoneVerificationRepository = {
  create(data: any) { return prisma.phoneVerification.create({ data }); },
  findById(id: string) { return prisma.phoneVerification.findUnique({ where: { id } }); },
  findByPhone(phoneE164: string, purpose: string) {
    return prisma.phoneVerification.findFirst({ where: { phoneE164, purpose, verifiedAt: null }, orderBy: { createdAt: 'desc' } });
  },
  update(id: string, data: any) { return prisma.phoneVerification.update({ where: { id }, data }); },
  deleteExpired() { return prisma.phoneVerification.deleteMany({ where: { expiresAt: { lt: new Date() }, verifiedAt: null } }); },
};
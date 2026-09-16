import { prisma } from '../lib/prisma';
import { Prisma, User } from '@prisma/client';

export const userRepository = {
  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  /**
   * Session-scoped, column-pruned user lookup used by the auth handlers.
   * Only the fields the session/identity path consumes are read; the password
   * hash and other sensitive/managerial columns are never transferred.
   */
  findSessionUser(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true, centerId: true },
    });
  },

  findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  },

  findByPhoneE164(phoneE164: string) {
    return prisma.user.findUnique({ where: { phoneE164 } });
  },

  findFirst(where: Prisma.UserWhereInput) {
    return prisma.user.findFirst({ where });
  },

  findMany(args: Prisma.UserFindManyArgs) {
    return prisma.user.findMany(args);
  },

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  },

  update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  },

  updateMany(where: Prisma.UserWhereInput, data: Prisma.UserUpdateInput) {
    return prisma.user.updateMany({ where, data });
  },

  count(where: Prisma.UserWhereInput) {
    return prisma.user.count({ where });
  },

  groupBy(args: any) {
    return prisma.user.groupBy(args);
  },

  // ── Refresh tokens ──────────────────────────────────────────────────

  createRefreshToken(data: Prisma.RefreshTokenCreateInput) {
    return prisma.refreshToken.create({ data });
  },

  findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  updateRefreshToken(id: string, data: Prisma.RefreshTokenUpdateInput) {
    return prisma.refreshToken.update({ where: { id }, data });
  },

  revokeRefreshTokens(where: Prisma.RefreshTokenWhereInput) {
    return prisma.refreshToken.updateMany({
      where,
      data: { revokedAt: new Date() },
    });
  },

  // ── Password reset tokens ───────────────────────────────────────────

  createPasswordResetToken(data: Prisma.PasswordResetTokenCreateInput) {
    return prisma.passwordResetToken.create({ data });
  },

  findPasswordResetTokenByHash(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  },

  markPasswordResetTokenUsed(id: string) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },
};

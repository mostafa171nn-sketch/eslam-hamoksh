import { prisma } from '../lib/prisma';
import { Prisma, User } from '@prisma/client';

export const userRepository = {
  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
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

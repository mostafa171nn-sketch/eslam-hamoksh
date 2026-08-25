import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { hashToken, randomToken } from '../utils/tokens';
import { ApiError } from '../utils/ApiError';
import { userRepository } from '../repositories/user.repository';

export interface AccessTokenPayload {
  sub: string;
  role: string;
}

export function signAccessToken(userId: string, role: string): string {
  const payload: AccessTokenPayload = { sub: userId, role };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
    issuer: 'ecms',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'ecms' });
  if (typeof decoded === 'string' || !decoded.sub) {
    throw ApiError.unauthorized();
  }
  return { sub: String(decoded.sub), role: String((decoded as jwt.JwtPayload).role ?? '') };
}

export interface RefreshTokenRecord {
  token: string;
  expiresAt: Date;
}

export async function createRefreshToken(userId: string): Promise<RefreshTokenRecord> {
  const token = randomToken(48);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await userRepository.createRefreshToken({
    user: { connect: { id: userId } },
    tokenHash: hashToken(token),
    expiresAt,
  });
  return { token, expiresAt };
}

export async function rotateRefreshToken(
  userId: string,
  oldToken: string,
): Promise<RefreshTokenRecord> {
  const tokenHash = hashToken(oldToken);
  const existing = await userRepository.findRefreshTokenByHash(tokenHash);

  if (!existing || existing.userId !== userId) {
    throw ApiError.unauthorized('Session is invalid or has expired. Please log in again.');
  }
  if (existing.revokedAt) {
    throw ApiError.unauthorized('Session has been revoked. Please log in again.');
  }
  if (existing.expiresAt < new Date()) {
    throw ApiError.unauthorized('Session has expired. Please log in again.');
  }

  await userRepository.updateRefreshToken(existing.id, { revokedAt: new Date() });

  return createRefreshToken(userId);
}

export async function revokeRefreshToken(token: string): Promise<void> {
  if (!token) return;
  await userRepository.revokeRefreshTokens({
    tokenHash: hashToken(token),
    revokedAt: null,
  });
}

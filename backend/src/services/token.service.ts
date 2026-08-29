import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { hashToken, randomToken } from '../utils/tokens';
import { ApiError } from '../utils/ApiError';
import { userRepository } from '../repositories/user.repository';

export interface AccessTokenPayload {
  sub: string;
  role: string;
}

// Resolve ACCESS_TOKEN_TTL (e.g. "30m", "2h", "1800") to a positive number of
// milliseconds. A bare number like "210" would otherwise be treated by
// jsonwebtoken as 210 *milliseconds* (expiring instantly), which permanently
// logged users out in production. Clamp to a sane minimum so a misconfigured
// or zero/empty value can never produce an already-expired token.
export function accessTokenLifetimeMs(raw: string): number {
  const MIN_MS = 60_000; // 1 minute
  const value = String(raw ?? '').trim();
  if (!value) return MIN_MS;

  const match = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(value);
  if (!match) return MIN_MS;

  const n = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  const ms = n * multipliers[unit];
  return Number.isFinite(ms) && ms > 0 ? Math.max(ms, MIN_MS) : MIN_MS;
}

export function signAccessToken(userId: string, role: string): string {
  const payload: AccessTokenPayload = { sub: userId, role };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: Math.max(accessTokenLifetimeMs(env.ACCESS_TOKEN_TTL), 60_000),
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

import { centerRepository } from '../repositories/center.repository';
import { ApiError } from '../utils/ApiError';
import { currentCenterId } from '../lib/tenant';

export interface CenterSettingsInput {
  name?: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number;
  attendanceGraceMinutes?: number;
  timezone?: string;
  currency?: string;
}

/**
 * Returns the current center's settings row, creating sensible defaults if it
 * does not yet exist. In a multi-tenant deployment each center owns its own
 * settings; the tenant middleware scopes this query to the caller's center.
 */
export async function getCenterSettings() {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.badRequest('No center context available.', 'NO_CENTER');

  const existing = await centerRepository.findSettings(centerId);
  if (existing) return existing;

  return centerRepository.upsertSettings(centerId, {
    name: 'Center',
    radiusMeters: 100,
    attendanceGraceMinutes: 10,
    timezone: 'Africa/Cairo',
    currency: 'EGP',
  }, {});
}

export async function updateCenterSettings(input: CenterSettingsInput) {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.badRequest('No center context available.', 'NO_CENTER');

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.latitude !== undefined) data.latitude = input.latitude;
  if (input.longitude !== undefined) data.longitude = input.longitude;
  if (input.radiusMeters !== undefined) {
    if (input.radiusMeters < 10 || input.radiusMeters > 100000) {
      throw ApiError.badRequest('Radius must be between 10 and 100000 meters.', 'INVALID_RADIUS');
    }
    data.radiusMeters = input.radiusMeters;
  }
  if (input.attendanceGraceMinutes !== undefined) {
    if (input.attendanceGraceMinutes < 0 || input.attendanceGraceMinutes > 120) {
      throw ApiError.badRequest('Grace period must be between 0 and 120 minutes.', 'INVALID_GRACE');
    }
    data.attendanceGraceMinutes = input.attendanceGraceMinutes;
  }
  if (input.timezone !== undefined) data.timezone = input.timezone;
  if (input.currency !== undefined) data.currency = input.currency;

  return centerRepository.upsertSettings(centerId, data as any, data);
}

import { ApiError } from './ApiError';

export interface NormalizedPhone {
  e164: string;
  raw: string;
  country: string;
}

const COUNTRIES = [
  { code: '+20', iso: 'EG', name: 'Egypt', pattern: /^\+20\d{10}$/ },
  { code: '+1', iso: 'US', name: 'United States', pattern: /^\+1\d{10}$/ },
  { code: '+44', iso: 'GB', name: 'United Kingdom', pattern: /^\+44\d{10,11}$/ },
  { code: '+971', iso: 'AE', name: 'UAE', pattern: /^\+971\d{9}$/ },
  { code: '+966', iso: 'SA', name: 'Saudi Arabia', pattern: /^\+966\d{9}$/ },
];

export function normalizePhone(raw: string): NormalizedPhone {
  const cleaned = raw.replace(/[\s\-\(\)]/g, '');
  let e164 = cleaned;
  if (!e164.startsWith('+')) {
    if (e164.startsWith('0')) e164 = '+20' + e164.slice(1);
    else if (e164.startsWith('20')) e164 = '+' + e164;
    else e164 = '+20' + e164;
  }
  if (!/^\+\d{8,15}$/.test(e164)) {
    throw ApiError.badRequest('Invalid phone number. Use international format e.g. +201234567890.', 'INVALID_PHONE');
  }
  const matched = COUNTRIES.find(c => e164.startsWith(c.code));
  if (matched && !matched.pattern.test(e164)) {
    throw ApiError.badRequest('Invalid phone number for ' + matched.name + '.', 'INVALID_PHONE');
  }
  return { e164, raw, country: matched?.iso ?? 'UNKNOWN' };
}

export function maskPhone(e164: string): string {
  if (e164.length <= 4) return '***' + e164.slice(-2);
  return e164.slice(0, 4) + '****' + e164.slice(-4);
}

export function supportedCountries() {
  return COUNTRIES.map(c => ({ code: c.code, iso: c.iso, name: c.name }));
}
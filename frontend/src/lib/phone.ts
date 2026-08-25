export interface Country { code: string; iso: string; name: string; flag: string; }

export const COUNTRIES: Country[] = [
  { code: '+20', iso: 'EG', name: 'Egypt', flag: 'EG' },
  { code: '+1', iso: 'US', name: 'United States', flag: 'US' },
  { code: '+44', iso: 'GB', name: 'United Kingdom', flag: 'GB' },
  { code: '+971', iso: 'AE', name: 'UAE', flag: 'AE' },
  { code: '+966', iso: 'SA', name: 'Saudi Arabia', flag: 'SA' },
  { code: '+49', iso: 'DE', name: 'Germany', flag: 'DE' },
  { code: '+33', iso: 'FR', name: 'France', flag: 'FR' },
];

export function normalizePhone(raw: string, countryCode: string = '+20'): string {
  let cleaned = raw.replace(/[\s\-\(\)]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) cleaned = countryCode + cleaned.slice(1);
    else cleaned = countryCode + cleaned;
  }
  return cleaned;
}

export function maskPhone(e164: string): string {
  if (e164.length <= 4) return '***' + e164.slice(-2);
  return e164.slice(0, 4) + '****' + e164.slice(-4);
}

export function isValidPhone(phone: string): boolean {
  return /^\+\d{8,15}$/.test(phone);
}
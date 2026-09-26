import type { ApiMeta, ApiResponse } from '../lib/api';

/** Builds a successful API envelope in the app's exact wrapper shape. */
export function ok<T>(data: T, meta?: ApiMeta): ApiResponse<T> {
  return { success: true, message: 'OK', data, ...(meta ? { meta } : {}) };
}

/** Builds an error envelope (kept for parity with real API error shape). */
export function fail<T = unknown>(message: string, code?: string): ApiResponse<T> {
  return { success: false, message, data: undefined as unknown as T, ...(code ? { code } : {}) };
}

/** ISO date (YYYY-MM-DD) for `offsetDays` days from today (0 = today). */
export function daysFromNow(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** ISO datetime string relative to today, e.g. daysFromNowIso(0, '10:30'). */
export function atTime(offsetDays: number, time: string): string {
  return `${daysFromNow(offsetDays)}T${time}:00.000Z`;
}

/** Parses a query string (without leading `?`) into a plain record. */
export function parseQuery(query: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!query) return out;
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [key, ...rest] = pair.split('=');
    if (!key) continue;
    out[decodeURIComponent(key)] = decodeURIComponent(rest.join('='));
  }
  return out;
}

/** Slices a list into a page window and returns { page, limit, total, totalPages }. */
export function paginate<T>(list: T[], page = 1, limit = 10): { items: T[]; meta: ApiMeta } {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 10);
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const items = list.slice((safePage - 1) * safeLimit, safePage * safeLimit);
  return { items, meta: { page: safePage, limit: safeLimit, total, totalPages } };
}

/** Case-insensitive substring match against any of the given fields. */
export function matchesSearch(needle: string | undefined, ...haystacks: (string | null | undefined)[]): boolean {
  if (!needle) return true;
  const q = needle.trim().toLowerCase();
  if (!q) return true;
  return haystacks.some((h) => (h ?? '').toLowerCase().includes(q));
}
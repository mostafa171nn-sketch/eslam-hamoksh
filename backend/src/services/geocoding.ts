const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'ECMS/2.0 (Educational Center Management System; admin@ecms.local)';

interface NominatimResult {
  lat: string;
  lon: string;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

export type GeocodeOutcome =
  | { status: 'success'; result: GeocodeResult }
  | { status: 'empty' }
  | { status: 'error'; reason: string };

function isValidLatitude(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

function isValidLongitude(lon: number): boolean {
  return Number.isFinite(lon) && lon >= -180 && lon <= 180;
}

/** Minimal in-process cache so we do not re-query the same address twice. */
const cache = new Map<string, GeocodeResult | null>();
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;
const cacheTimes = new Map<string, number>();

/**
 * Build the most complete geocoding query from the available address pieces.
 * The physical address is the primary input; the country is appended when it
 * is useful (e.g. "Egypt") but never relied on alone.
 */
export function buildGeocodeQuery(input: {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}): string {
  const parts: string[] = [];
  if (input.address && input.address.trim()) parts.push(input.address.trim());
  if (input.city && input.city.trim()) parts.push(input.city.trim());
  if (input.country && input.country.trim()) parts.push(input.country.trim());
  // Fall back to the center name only when no physical address is available.
  if (parts.length === 0 && input.name && input.name.trim()) {
    parts.push(input.name.trim());
  }
  return parts.join(', ');
}

/**
 * Geocode an address string into coordinates using OpenStreetMap Nominatim.
 *
 * Returns { latitude, longitude } on success, or null when no result was found
 * or the request failed (network/timeout/rate-limit/invalid response).
 *
 * This never throws; callers should treat `null` as "location unknown".
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const trimmed = (address || '').trim();
  if (!trimmed) return null;

  const now = Date.now();
  const cachedAt = cacheTimes.get(trimmed);
  if (cachedAt !== undefined && now - cachedAt < CACHE_EXPIRY_MS) {
    return cache.get(trimmed) ?? null;
  }

  const outcome = await geocodeAddressRaw(trimmed);
  let result: GeocodeResult | null = null;

  if (outcome.status === 'success') {
    result = outcome.result;
    // Cache both hit and miss to avoid pointless repeat requests.
    cache.set(trimmed, result);
    cacheTimes.set(trimmed, now);
  } else if (outcome.status === 'empty') {
    cache.set(trimmed, null);
    cacheTimes.set(trimmed, now);
  }

  return result;
}

/**
 * Low-level Nominatim request with timeout, rate-limit handling and strict
 * coordinate validation. Exposed separately so the backfill script can log the
 * failure reason without losing it.
 */
export async function geocodeAddressRaw(address: string): Promise<GeocodeOutcome> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const url = new URL(NOMINATIM_ENDPOINT);
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('accept-language', 'en');

    const resp = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (resp.status === 429) {
      return { status: 'error', reason: 'rate_limited' };
    }
    if (resp.status === 403 || resp.status === 404) {
      return { status: 'error', reason: `http_${resp.status}` };
    }
    if (!resp.ok) {
      return { status: 'error', reason: `http_${resp.status}` };
    }

    const data: NominatimResult[] = (await resp.json()) as NominatimResult[];
    if (!Array.isArray(data) || data.length === 0) {
      return { status: 'empty' };
    }

    const lat = Number.parseFloat(data[0].lat);
    const lon = Number.parseFloat(data[0].lon);

    if (!isValidLatitude(lat) || !isValidLongitude(lon)) {
      return { status: 'error', reason: 'invalid_coordinates' };
    }

    return { status: 'success', result: { latitude: lat, longitude: lon } };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { status: 'error', reason: 'timeout' };
    }
    return { status: 'error', reason: 'network_error' };
  } finally {
    clearTimeout(timeout);
  }
}

/** No-op sleep helper for rate limiting the backfill script. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

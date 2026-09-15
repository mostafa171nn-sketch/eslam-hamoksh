import { cache } from 'react';
import { qs, type ApiResponse, type ApiMeta } from './api';

/**
 * Server-side fetch helper for the public pages.
 *
 * Next.js Server Components cannot rely on the client `/api` rewrite, so these
 * helpers call the backend directly using an absolute URL. The base URL matches
 * the one used by `next.config.mjs`:
 *
 *   - development          → http://localhost:4000
 *   - production (Vercel)  → NEXT_PUBLIC_API_URL (required at build time)
 *
 * `revalidateSeconds > 0` opts the fetch into the Next.js HTTP cache (ISR-style
 * revalidation). This is used only for the static catalog reference data —
 * mirroring the backend's own `Cache-Control: max-age=300` — so that server-
 * side renders do not burn the public discovery rate limit with repeated
 * catalog requests. Search/list endpoints stay fresh (`no-store`).
 */
export const PUBLIC_API_BASE =
  process.env.API_URL_INTERNAL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class PublicApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'PublicApiError';
    this.status = status;
  }
}

export interface PublicApiResult<T> {
  data: T;
  meta?: ApiMeta;
}

/**
 * Core fetch wrapper wrapped in React.cache so that identical (path, revalidate)
 * calls within the same server request are deduped. Without this, both
 * `generateMetadata` and the page component issue separate server-to-backend
 * calls for the same resource (e.g. /teachers/:id), doubling backend load.
 * Primitive args are used for the cache key (object identities would never
 * match). The PARSED result is cached (not the raw Response), so multiple
 * callers in the same request can each read the body safely instead of racing
 * to consume a single-response stream.
 */
const cachedGet = cache(
  async (url: string, revalidateSeconds: number): Promise<PublicApiResult<unknown>> => {
    const res = await fetch(url, {
      cache: revalidateSeconds > 0 ? 'force-cache' : 'no-store',
      ...(revalidateSeconds > 0 ? { next: { revalidate: revalidateSeconds } } : {}),
    });
    if (!res.ok) {
      throw new PublicApiError(`API ${res.status} for ${url.split('?')[0].replace('/api', '')}`, res.status);
    }
    const body = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
    if (!body || body.success !== true) {
      throw new PublicApiError(body?.message ?? 'Invalid API response', res.status);
    }
    return { data: body.data, meta: body.meta };
  },
);

export async function publicApiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined | null>,
  revalidateSeconds = 0,
): Promise<PublicApiResult<T>> {
  const url = `${PUBLIC_API_BASE}/api${path}${qs(params)}`;
  const { data, meta } = await cachedGet(url, revalidateSeconds);
  return { data: data as T, meta };
}
import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { ApiClientError, timeoutMessage, type ApiResponse } from '../lib/api';
import { getFormatLang } from '../lib/format';
import { dataCache } from '../lib/dataCache';

export function errorMessage(err: unknown, fallback?: string): string {
  const fallbackText = fallback ?? (getFormatLang() === 'ar' ? 'حدث خطأ ما.' : 'Something went wrong.');
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error && err.name === 'AbortError') return '';
  if (err instanceof DOMException && err.name === 'TimeoutError') return timeoutMessage();
  if (err instanceof Error && err.message === 'The operation was aborted.') return timeoutMessage();
  if (err instanceof Error && err.message) return err.message;
  return fallbackText;
}

export interface UseApiCacheOptions {
  /** Cache key — when provided the response is cached in memory. */
  cacheKey?: string;
  /** Milliseconds after which cached data is considered "stale" (still served
   *  instantly, but a background revalidation is triggered). Default: no stale
   *  behaviour. */
  staleTTL?: number;
  /** Milliseconds after which cached data expires and is no longer served.
   *  Default: 5 minutes. */
  cacheTTL?: number;
  /** Revalidate in the background when the tab regains focus and data is stale.
   *  Default: true (only when staleTTL > 0). */
  revalidateOnFocus?: boolean;
  /** Server-rendered initial data (SSR). When provided this skips the initial
   *  client fetch on first mount (unkeyed hooks) or seeds the SWR cache with it
   *  (keyed hooks), so the first paint never re-requests what the server has
   *  already fetched. */
  initialData?: unknown;
  /** Pagination metadata for the server-rendered initial data. */
  initialMeta?: ApiResponse<unknown>['meta'];
}

interface UseApiResult<T> {
  data: T | null;
  meta: ApiResponse<T>['meta'];
  loading: boolean;
  initialLoading: boolean;
  error: string;
  reload: () => void;
  /** Optimistically set data and sync the cache. */
  mutate: (updater: T | ((prev: T | null) => T | null)) => void;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useApi<T>(
  fetcher: (signal: AbortSignal) => Promise<ApiResponse<T>>,
  deps: DependencyList = [],
  options?: UseApiCacheOptions,
): UseApiResult<T> {
  const { cacheKey, staleTTL = 0, cacheTTL = 5 * 60_000, revalidateOnFocus = true, initialData, initialMeta } = options ?? {};
  const hasInitial = initialData !== undefined;

  const [data, setData] = useState<T | null>(hasInitial ? (initialData as T) : null);
  const [meta, setMeta] = useState<ApiResponse<T>['meta']>(hasInitial ? (initialMeta as ApiResponse<T>['meta']) : undefined);
  const [loading, setLoading] = useState(!hasInitial);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const initialRef = useRef(!hasInitial);
  // True only until the first (server-rendered) run completes; backs the
  // initialData skip/seed logic below.
  const skipInitialRef = useRef(hasInitial);
  const [initialLoading, setInitialLoading] = useState(!hasInitial);
  const runRef = useRef(0);
  const retriedRef = useRef(0);
  /** When true the next effect run bypasses the cache (triggered by reload). */
  const forceRefreshRef = useRef(false);

  useEffect(() => {
    const RETRY_LIMIT = 3;
    let controller = new AbortController();
    const runId = ++runRef.current;
    let cancelled = false;
    retriedRef.current = 0;

    const forceRefresh = forceRefreshRef.current;
    forceRefreshRef.current = false;

    let isBackgroundRefresh = false;

    // ── SSR pre-hydrated data ─────────────────────────────────────────
    // First run only: seed the SWR cache with the server-rendered payload and
    // skip the identical client refetch. Keyed hooks fall through to the cache
    // check below (fresh hit → early return); unkeyed hooks (e.g. the teacher
    // profile) return upfront without hitting the network. Later runs behave
    // normally, so reload()/filter changes always reach the API.
    if (!forceRefresh && skipInitialRef.current) {
      skipInitialRef.current = false;
      if (cacheKey && cacheTTL > 0 && !dataCache.has(cacheKey)) {
        dataCache.set(cacheKey, initialData as T, initialMeta, staleTTL, cacheTTL);
      }
      if (!cacheKey) {
        return () => {
          cancelled = true;
        };
      }
    }

    // ── SWR: check cache ──────────────────────────────────────────────
    if (cacheKey && cacheTTL > 0 && !forceRefresh) {
      const cached = dataCache.get<T>(cacheKey);
      if (cached) {
        setData(cached.data);
        setMeta(cached.meta);
        setError('');
        setLoading(false);
        if (initialRef.current) {
          initialRef.current = false;
          setInitialLoading(false);
        }

        if (cached.status === 'fresh') {
          // Data is fresh — no network request needed.
          return () => {
            cancelled = true;
          };
        }
        // Data is stale — show it immediately but trigger a background refresh.
        isBackgroundRefresh = true;
      }
    }

    // ── Fetch ─────────────────────────────────────────────────────────
    if (!isBackgroundRefresh) setLoading(true);
    setError('');

    const attempt = (signal: AbortSignal): Promise<void> =>
      fetcher(signal)
        .then((res) => {
          if (runId !== runRef.current) return;
          setData(res.data);
          setMeta(res.meta);
          // Populate / refresh cache
          if (cacheKey && cacheTTL > 0) {
            dataCache.set(cacheKey, res.data, res.meta, staleTTL, cacheTTL);
          }
        })
        .catch((err) => {
          if (runId !== runRef.current) return;
          if (!(err instanceof Error && err.name === 'AbortError')) {
            console.error('useApi request failed:', err);
            setError(errorMessage(err));
            return;
          }
          if (cancelled || retriedRef.current >= RETRY_LIMIT) {
            if (!cancelled) setError(timeoutMessage());
            return;
          }
          retriedRef.current += 1;
          const next = new AbortController();
          controller = next;
          return attempt(next.signal);
        })
        .finally(() => {
          if (runId !== runRef.current) return;
          setLoading(false);
          if (initialRef.current) {
            initialRef.current = false;
            setInitialLoading(false);
          }
        });

    void attempt(controller.signal);

    // ── Focus revalidation ────────────────────────────────────────────
    let focusHandler: (() => void) | null = null;
    if (cacheKey && staleTTL > 0 && revalidateOnFocus && typeof document !== 'undefined') {
      focusHandler = () => {
        if (cancelled || runRef.current !== runId) return;
        const cached = dataCache.get<T>(cacheKey);
        if (cached && cached.status === 'stale') {
          forceRefreshRef.current = false;
          setTick((t) => t + 1);
        }
      };
      document.addEventListener('visibilitychange', focusHandler);
      window.addEventListener('online', focusHandler);
    }

    return () => {
      cancelled = true;
      // Abort synchronously: at cleanup time runRef.current still holds this
      // run's ID (React invokes cleanup before the new effect increments it),
      // so the guard is always true here for a genuine deps-change or unmount.
      if (runRef.current === runId) controller.abort();
      if (focusHandler) {
        document.removeEventListener('visibilitychange', focusHandler);
        window.removeEventListener('online', focusHandler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, cacheKey]);

  const reload = useCallback(() => {
    forceRefreshRef.current = true;
    setTick((t) => t + 1);
  }, []);

  /** Optimistically update local state AND the cache. */
  const mutate = useCallback(
    (updater: T | ((prev: T | null) => T | null)) => {
      setData((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: T | null) => T | null)(prev) : updater;
        if (cacheKey && cacheTTL > 0) {
          dataCache.set(cacheKey, next, meta, staleTTL, cacheTTL);
        }
        return next;
      });
    },
    [cacheKey, cacheTTL, staleTTL, meta],
  );

  return { data, meta, loading, initialLoading, error, reload, mutate, setData };
}

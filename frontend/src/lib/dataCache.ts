import type { ApiResponse } from './api';

/**
 * In-memory SWR-like cache for API responses.
 *
 * Each entry has two time horizons:
 *   - staleTTL: after this many ms the data is considered "stale" — it is
 *     still served instantly but a background revalidation is triggered.
 *   - cacheTTL: after this many ms the data is "expired" — it is no longer
 *     served and a normal (blocking) fetch is required.
 *
 * The cache is keyed by an arbitrary string supplied by the caller (typically
 * a serialised API path + params). It lives in module scope so it survives
 * React remounts / page navigations within the same browser tab.
 */

export interface CacheEntry {
  data: unknown;
  meta: ApiResponse<unknown>['meta'];
  timestamp: number;
  staleTTL: number;
  cacheTTL: number;
  /** Last read/write time, used for least-recently-used eviction. */
  lastAccessed: number;
}

export type CacheStatus = 'fresh' | 'stale';

/**
 * Hard cap on the number of cached entries. Search/filter results multiply
 * quickly (every combination of filters produces its own key), so the cache is
 * bounded rather than open-ended. 100 entries comfortably covers all pages
 * (home, catalog, teacher/center search, profile/dashboard helpers) while
 * forcing the least-recently-used entries to be refetched instead of growing
 * without bound.
 */
const MAX_ENTRIES = 100;

class DataCache {
  private store = new Map<string, CacheEntry>();

  /** Retrieve a cached entry. Returns null if missing or expired. */
  get<T>(key: string): { data: T; meta: ApiResponse<T>['meta']; status: CacheStatus } | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    const age = Date.now() - entry.timestamp;
    if (age > entry.cacheTTL) {
      this.store.delete(key);
      return null;
    }
    entry.lastAccessed = Date.now();
    return {
      data: entry.data as T,
      meta: entry.meta as ApiResponse<T>['meta'],
      status: age > entry.staleTTL ? 'stale' : 'fresh',
    };
  }

  /** Store a response in the cache. */
  set<T>(key: string, data: T, meta: ApiResponse<T>['meta'], staleTTL: number, cacheTTL: number): void {
    const now = Date.now();
    // Opportunistic sweep: drop expired entries when the store is at capacity
    // so live data is not evicted in favour of dead entries.
    if (this.store.size >= MAX_ENTRIES) {
      for (const [k, entry] of this.store) {
        if (now - entry.timestamp > entry.cacheTTL) this.store.delete(k);
      }
    }
    // Enforce the cap with a least-recently-used eviction pass. Entries that
    // are actively being read (get() touches lastAccessed) are naturally the
    // last to go; evicted keys are simply refetched by the hook that needs
    // them, so no request loop or stale-survivor issue can arise.
    while (this.store.size >= MAX_ENTRIES) {
      let oldestKey: string | null = null;
      let oldestAt = Infinity;
      for (const [k, entry] of this.store) {
        if (entry.lastAccessed < oldestAt) {
          oldestAt = entry.lastAccessed;
          oldestKey = k;
        }
      }
      if (oldestKey == null) break;
      this.store.delete(oldestKey);
    }
    this.store.set(key, {
      data,
      meta,
      timestamp: now,
      staleTTL,
      cacheTTL,
      lastAccessed: now,
    });
  }

  /** Check if a key exists and is not expired (regardless of staleness). */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /** Remove a single cached entry. */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Remove all entries whose key starts with `prefix`. */
  invalidatePrefix(prefix: string): void {
    for (const k of [...this.store.keys()]) {
      if (k.startsWith(prefix)) this.store.delete(k);
    }
  }

  /** Drop every cached entry. */
  clear(): void {
    this.store.clear();
  }

  /** Number of live entries (diagnostics / tests). */
  get size(): number {
    return this.store.size;
  }
}

/** Singleton cache instance — one per browser tab. */
export const dataCache = new DataCache();
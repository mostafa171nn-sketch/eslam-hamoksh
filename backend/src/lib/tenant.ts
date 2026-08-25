import { AsyncLocalStorage } from 'async_hooks';

export type TenantScope = 'center' | 'platform';

export interface TenantContext {
  // The center the current request is scoped to. Null only for SUPER_ADMIN in
  // platform scope (cross-center) or for unauthenticated requests.
  centerId: string | null;
  scope: TenantScope;
  // Resolved center record cache (populated lazily by services that need it).
  center?: {
    id: string;
    status: string;
    subscriptionStatus: string;
    requiresApproval: boolean;
  } | null;
}

const storage = new AsyncLocalStorage<TenantContext>();

/**
 * Runs `fn` with the given tenant context. All database operations executed
 * inside `fn` will be automatically scoped to `centerId` by the Prisma
 * middleware, unless `scope` is `platform` (SUPER_ADMIN cross-center access).
 */
export function runWithTenant<T>(ctx: TenantContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

export function currentCenterId(): string | null {
  return storage.getStore()?.centerId ?? null;
}

export function isPlatformScope(): boolean {
  return storage.getStore()?.scope === 'platform';
}

export function setResolvedCenter(center: TenantContext['center']): void {
  const ctx = storage.getStore();
  if (ctx) ctx.center = center;
}

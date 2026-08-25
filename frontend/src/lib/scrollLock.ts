/**
 * Reference-counted body scroll lock.
 *
 * The previous approach captured `document.body.style.overflow` and restored it
 * on cleanup. That breaks when locks nest (e.g. the global route-change loader
 * and a page's own data loader overlap): the inner loader would capture
 * `hidden` and restore it after the outer loader already released the lock,
 * leaving the body permanently locked. A counter fixes this — scroll is only
 * unlocked once the last locker releases.
 */
let lockCount = 0;

export function lockScroll(): void {
  if (typeof document === 'undefined') return;
  lockCount += 1;
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden';
  }
}

export function unlockScroll(): void {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = '';
  }
}

/** Force-release every lock (used as a safety net after route changes). */
export function resetScrollLock(): void {
  if (typeof document === 'undefined') return;
  lockCount = 0;
  document.body.style.overflow = '';
}

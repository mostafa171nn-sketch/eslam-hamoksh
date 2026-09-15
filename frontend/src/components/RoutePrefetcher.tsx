'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Global route prefetching for the public navigation.
 * - After the browser is idle we warm the key public destinations.
 * - On pointer-over we prefetch any internal <a href> under the cursor
 *   (public nav, sidebar, footer, card links…).
 * Prefetch only downloads the route chunk/RSC payload – it never fires API
 * calls and never navigates, so it is invisible to the network-flow that pages
 * actually use. In development Next disables prefetch, making this a no-op.
 */
const KEY_ROUTES = ['/teachers', '/centers', '/search', '/student', '/parent', '/packages'] as const;

export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    const prefetched = new Set<string>();

    const prefetch = (href: string) => {
      if (!href || prefetched.has(href)) return;
      if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/api')) return;
      prefetched.add(href);
      router.prefetch(href);
    };

    const scheduleIdle = (cb: () => void) => {
      const w = window as Window & { requestIdleCallback?: (c: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout: 2000 });
      else setTimeout(cb, 1200);
    };

    scheduleIdle(() => {
      for (const route of KEY_ROUTES) prefetch(route);
    });

    const onPointerOver = (e: PointerEvent) => {
      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (anchor) prefetch(anchor.getAttribute('href') ?? '');
    };

    document.addEventListener('pointerover', onPointerOver, { passive: true });
    return () => document.removeEventListener('pointerover', onPointerOver);
  }, [router]);

  return null;
}
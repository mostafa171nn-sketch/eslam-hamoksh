'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Global route prefetching for the public navigation.
 * - On pointer-over we prefetch any internal <a href> under the cursor
 *   (public nav, sidebar, footer, card links…).
 * Prefetch only downloads the route chunk/RSC payload – it never fires API
 * calls and never navigates, so it is invisible to the network-flow that pages
 * actually use. In development Next disables prefetch, making this a no-op.
 *
 * Idle warm-up of KEY_ROUTES was removed (C3): next/link already viewport-
 * prefetches all visible nav links, making idle warm-up a redundant second
 * RSC render of every public route on every page load (measured: 6 extra
 * RSC fetches per page including /student and /parent which are not linked
 * from public pages).
 */
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

    const onPointerOver = (e: PointerEvent) => {
      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (anchor) prefetch(anchor.getAttribute('href') ?? '');
    };

    document.addEventListener('pointerover', onPointerOver, { passive: true });
    return () => document.removeEventListener('pointerover', onPointerOver);
  }, [router]);

  return null;
}
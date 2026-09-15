'use client';

import { useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const RISE_MS = 300;
const RISE_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const LIFT_PX = 10;

const DASHBOARD_PREFIXES = [
  '/student',
  '/teacher',
  '/parent',
  '/admin',
  '/center',
  '/dashboard',
  '/profile',
  '/notifications',
];

function reducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

type Mode = 'page' | 'shell';

interface RouteTransitionProps {
  children: ReactNode;
  className?: string;
  /** `page` = whole-page wrapper (root layout) that skips dashboard routes;
   *  `shell` = a dashboard's inner content wrapper that always animates. */
  mode?: Mode;
}

/**
 * Page-enter transition. On soft navigations the wrapper rises from below
 * (opacity 0 -> 1, translateY 10px -> 0) as a single unit — no per-card or
 * staggered motion. Runs via the Web Animations API so no global styles are
 * required, is skipped on the first (hydrated) render and under
 * prefers-reduced-motion, and never leaves a lingering transform.
 */
export function RouteTransition({ children, className, mode = 'page' }: RouteTransitionProps) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const prevPath = useRef<string | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || pathname === null) return;

    // First run (hydration) or same route: record and wait for a real change.
    const prev = prevPath.current;
    prevPath.current = pathname;
    if (prev === null || prev === pathname) return;
    // Page mode wraps the whole app; dashboards animate their own shell, so a
    // transform here would break the fixed sidebar/topbar during the motion.
    if (mode === 'page' && isDashboardPath(pathname)) return;
    if (reducedMotion()) return;

    // Cancel any in-flight animation from a faster navigation.
    el.getAnimations().forEach((anim) => anim.cancel());

    if (typeof el.animate !== 'function') {
      el.classList.remove('route-page-enter');
      void el.getBoundingClientRect();
      el.classList.add('route-page-enter');
      return;
    }

    el.animate(
      [
        { opacity: 0, transform: `translateY(${LIFT_PX}px)` },
        { opacity: 1, transform: 'translateY(0px)' },
      ],
      { duration: RISE_MS, easing: RISE_EASE, fill: 'backwards' },
    );
  }, [pathname, mode]);

  return (
    <div ref={ref} data-route-transition className={className}>
      {children}
    </div>
  );
}

export default RouteTransition;
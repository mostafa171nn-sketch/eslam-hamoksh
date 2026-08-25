'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { PencilLoader } from './ui/PencilLoader';

/**
 * Brief pencil loader shown on client-side route changes so the user gets
 * feedback while the next page renders. It is intentionally short-lived,
 * does not lock scrolling, and does not block data fetch states managed
 * inside individual pages.
 */
export function GlobalLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const prev = useRef(pathname);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (prev.current === pathname) return;
    prev.current = pathname;
    setVisible(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(false), 250);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [pathname]);

  if (!visible) return null;
  return <PencilLoader overlay lock={false} label="…" />;
}

export default GlobalLoader;

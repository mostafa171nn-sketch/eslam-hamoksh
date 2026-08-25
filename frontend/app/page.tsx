'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PencilLoader } from '../src/components/ui/PencilLoader';

/**
 * The public landing entry point. Visitors are taken straight to the public
 * Learning Centers discovery page — no login is required to browse.
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/centers');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <PencilLoader center />
    </div>
  );
}

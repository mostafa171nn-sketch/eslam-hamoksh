'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, Compass } from 'lucide-react';
import { useT } from '../../i18n';

export const JOURNEY_STORAGE_KEY = 'maarej-journey';
export const JOURNEY_FROM_KEY = 'maarej-journey-from';

/**
 * Student-only floating CTA for the Learning Journey.
 * Rendered centrally in DashboardLayout so it appears on all /student/* pages.
 * It never fetches data, so unrelated profile/API failures cannot break it.
 */
export function StudentJourneyFab() {
  const { t, lang } = useT();
  const pathname = usePathname();

  // Defensive guards (DashboardLayout also gates role + journey mode):
  // - only on student pages + the shared account page
  // - never on the journey page itself (the journey sidebar owns navigation there)
  if (pathname !== '/profile' && !pathname?.startsWith('/student')) return null;
  if (pathname === '/student/journey') return null;

  const isRtl = lang === 'ar';
  const Chevron = isRtl ? ChevronLeft : ChevronRight;

  const enterJourney = () => {
    try {
      window.sessionStorage.setItem(JOURNEY_STORAGE_KEY, '1');
      window.sessionStorage.setItem(JOURNEY_FROM_KEY, pathname);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-8">
      <Link
        href="/student/journey"
        onClick={enterJourney}
        aria-label={t('studentJourneyLabel')}
        className="group pointer-events-auto relative inline-flex w-full max-w-md items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-bl from-brand-600 to-brand-700 py-3.5 ps-3 pe-4 shadow-brand-lg ring-1 ring-inset ring-white/20 transition-[background-color,box-shadow] duration-200 hover:shadow-brand-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 motion-safe:transition-transform motion-safe:hover:-translate-y-0.5 active:translate-y-0 lg:max-w-sm"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -end-8 -top-10 h-24 w-24 rounded-full bg-white/15 blur-2xl"
        />

        <span
          aria-hidden
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20"
        >
          <Compass className="h-5 w-5 text-white" />
        </span>

        <span className="relative flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-bold tracking-tight text-white">
            {t('studentJourneyLabel')}
          </span>
          <span className="mt-0.5 hidden truncate text-xs text-brand-100 sm:block">
            {t('studentJourneyHint')}
          </span>
        </span>

        <Chevron
          aria-hidden
          className={`relative h-5 w-5 shrink-0 text-white/80 transition-transform duration-200 motion-safe:group-hover:${
            isRtl ? '-translate-x-1' : 'translate-x-1'
          }`}
        />
      </Link>
    </div>
  );
}

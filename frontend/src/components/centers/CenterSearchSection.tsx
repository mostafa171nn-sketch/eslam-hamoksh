'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Search, MapIcon, X } from 'lucide-react';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';
import { Button } from '@/src/components/ui/Button';
import { PencilLoader } from '@/src/components/ui/PencilLoader';
import { CenterCard } from '@/src/components/centers/CenterCard';
import { api, type PublicCenter } from '@/src/lib/api';
import { useApi } from '@/src/hooks/useApi';
import type { Subject, Grade, Location } from '@/src/lib/types';
import { useT } from '@/src/i18n';

const CenterMap = dynamic(() => import('@/src/components/centers/CenterMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <MapLoaderLabel />
    </div>
  ),
});

function MapLoaderLabel() {
  const { t } = useT();
  return <>{t('loadingMap')}</>;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

interface CenterFilters {
  q: string;
  city: string;
  subject: string;
  grade: string;
}

export default function CenterSearchSection() {
  const { t } = useT();
  const isDesktop = useIsDesktop();

  const [filters, setFilters] = useState<CenterFilters>({ q: '', city: '', subject: '', grade: '' });
  const [debounced, setDebounced] = useState<CenterFilters>(filters);
  const [catalog, setCatalog] = useState<{ subjects: Subject[]; grades: Grade[]; locations: Location[] }>({
    subjects: [],
    grades: [],
    locations: [],
  });

  const [showMapMode, setShowMapMode] = useState(false);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [activeCenterId, setActiveCenterId] = useState<string | null>(null);
  const [fitSignal, setFitSignal] = useState(0);

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(filters), 300);
    return () => window.clearTimeout(id);
  }, [filters]);

  useEffect(() => {
    Promise.all([
      api.get<Subject[]>('/catalog/subjects'),
      api.get<Grade[]>('/catalog/grades'),
      api.get<Location[]>('/catalog/locations'),
    ]).then(([subjects, grades, locations]) => {
      setCatalog({ subjects: subjects.data ?? [], grades: grades.data ?? [], locations: locations.data ?? [] });
    });
  }, []);

  const { data, loading } = useApi(
    () =>
      api.searchCenters({
        q: debounced.q || undefined,
        city: debounced.city || undefined,
        subject: debounced.subject || undefined,
        grade: debounced.grade || undefined,
        limit: 20,
      }),
    [debounced.q, debounced.city, debounced.subject, debounced.grade],
  );

  const results: PublicCenter[] = data?.items ?? [];

  const withCoords = useMemo(
    () => results.filter((c) => typeof c.latitude === 'number' && typeof c.longitude === 'number' && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)),
    [results],
  );

  const focusCenter = useCallback((id: string) => {
    setActiveCenterId(id);
    const el = cardRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  const patchFilters = (patch: Partial<CenterFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const handleShowMap = () => {
    if (isDesktop) {
      setShowMapMode(true);
      setFitSignal((s) => s + 1);
    } else {
      setMobileMapOpen(true);
    }
  };

  const handleCloseMap = () => {
    setShowMapMode(false);
    setActiveCenterId(null);
  };

  const handleCloseMobileMap = () => {
    setMobileMapOpen(false);
    setActiveCenterId(null);
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          NORMAL SECTION — embedded inside landing page
          ═══════════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        {/* Section header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">{t('centers')}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{t('homeCentersTitle')}</h2>
            <p className="mt-2 max-w-xl text-slate-500 dark:text-slate-400">{t('homeCentersSub')}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.q}
              onChange={(e) => patchFilters({ q: e.target.value })}
              placeholder={t('search')}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 ps-9 pe-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-brand-900"
            />
          </div>
          <Input value={filters.city} onChange={(e) => patchFilters({ city: e.target.value })} placeholder={t('city')} />
          <Select
            options={catalog.subjects.map((s) => ({ value: s.id, label: s.name }))}
            value={filters.subject}
            onChange={(e) => patchFilters({ subject: e.target.value })}
            placeholder={t('anySubject')}
          />
          <Select
            options={catalog.grades.map((g) => ({ value: g.id, label: g.name }))}
            value={filters.grade}
            onChange={(e) => patchFilters({ grade: e.target.value })}
            placeholder={t('anyGrade')}
          />
        </div>

        {loading && results.length === 0 ? (
          <div className="flex justify-center py-16">
            <PencilLoader />
          </div>
        ) : results.length === 0 ? (
          <div className="flex justify-center py-16 text-sm text-slate-500 dark:text-slate-400">{t('noCentersYet')}</div>
        ) : (
          <>
            {/* Show on map button + count */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {results.length} {t('centers')}
              </p>
              {withCoords.length > 0 && (
                <Button variant="primary" size="sm" onClick={handleShowMap}>
                  <MapIcon className="h-4 w-4" /> {t('showOnMap')}
                </Button>
              )}
            </div>

            {/* Desktop: 4-col grid */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {results.map((center, i) => {
                const isActive = center.id === activeCenterId;
                return (
                  <div key={center.id} ref={(el) => setCardRef(center.id, el)} className="min-w-0">
                    <CenterCard center={center} index={i} isActive={isActive} onFocus={focusCenter} />
                  </div>
                );
              })}
            </div>

            {/* Mobile: 2-col grid */}
            <div className="grid grid-cols-2 gap-3 sm:hidden">
              {results.map((center, i) => {
                const isActive = center.id === activeCenterId;
                return (
                  <div key={center.id} ref={(el) => setCardRef(center.id, el)} className="min-w-0">
                    <CenterCard center={center} index={i} isActive={isActive} onFocus={focusCenter} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP MAP OVERLAY — fixed fullscreen
          ═══════════════════════════════════════════════════════════════ */}
      {showMapMode && (
        <div className="fixed inset-0 z-50 hidden flex-col bg-white dark:bg-slate-900 lg:flex">
          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{t('centers')}</span>
            <Button variant="outline" size="sm" onClick={handleCloseMap}>
              <X className="h-4 w-4" /> {t('closeMap')}
            </Button>
          </div>
          {/* Split content */}
          <div className="flex min-h-0 flex-1">
            {/* Left: scrollable center list — 2 cards per row */}
            <div className="flex w-[38%] shrink-0 flex-col overflow-y-auto border-e border-slate-200 px-4 py-4 dark:border-slate-700">
              <p className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                {results.length} {t('centers')}
              </p>
              <div ref={listRef} className="grid grid-cols-2 gap-3">
                {results.map((center, i) => {
                  const isActive = center.id === activeCenterId;
                  return (
                    <div key={center.id} ref={(el) => setCardRef(center.id, el)} className="min-w-0">
                      <CenterCard center={center} index={i} isActive={isActive} onFocus={focusCenter} />
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Right: large map */}
            <div className="relative min-h-0 flex-1">
              <CenterMap
                centers={withCoords}
                focusCenterId={activeCenterId}
                onFocusCenter={focusCenter}
                fitSignal={fitSignal}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE MAP OVERLAY — fullscreen
          ═══════════════════════════════════════════════════════════════ */}
      {mobileMapOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{t('centers')}</span>
            <Button variant="outline" size="sm" onClick={handleCloseMobileMap}>
              <X className="h-4 w-4" /> {t('closeMap')}
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Map takes dominant area */}
            <div className="relative min-h-0 flex-[1.15]">
              <CenterMap
                centers={withCoords}
                focusCenterId={activeCenterId}
                onFocusCenter={focusCenter}
                fitSignal={fitSignal}
              />
            </div>
            {/* Scrollable center list */}
            <div className="min-h-0 flex-1 shrink overflow-y-auto border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-3 px-4 py-4">
                {results.map((center, i) => {
                  const isActive = center.id === activeCenterId;
                  return (
                    <div key={center.id} ref={(el) => setCardRef(center.id, el)} className="min-w-0">
                      <CenterCard center={center} index={i} isActive={isActive} onFocus={focusCenter} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

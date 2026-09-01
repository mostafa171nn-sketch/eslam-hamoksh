'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, SearchX, MapIcon, X } from 'lucide-react';
import { PublicNav } from '../../src/components/layout/PublicNav';
import { PencilLoader } from '../../src/components/ui/PencilLoader';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Alert } from '../../src/components/ui/ErrorAlert';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { CenterCard } from '../../src/components/centers/CenterCard';
import { api, type PublicCenter } from '../../src/lib/api';
import { useApi } from '../../src/hooks/useApi';
import { Select } from '../../src/components/ui/Select';
import { useT } from '../../src/i18n';
import type { Grade, Subject } from '../../src/lib/types';

const CenterMap = dynamic(() => import('../../src/components/centers/CenterMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <MapLoader />
    </div>
  ),
});

function MapLoader() {
  const { t } = useT();
  return <>{t('loadingMap')}</>;
}

interface CenterFilters {
  q: string;
  city: string;
  subject: string;
  grade: string;
  page: number;
}

export default function CentersPage() {
  const { t } = useT();
  const [filters, setFilters] = useState<CenterFilters>({ q: '', city: '', subject: '', grade: '', page: 1 });
  const [debounced, setDebounced] = useState<CenterFilters>(filters);
  const [showMap, setShowMap] = useState(false);
  const [activeCenterId, setActiveCenterId] = useState<string | null>(null);
  const [fitSignal, setFitSignal] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(filters), 300);
    return () => window.clearTimeout(id);
  }, [filters]);

  const { data, loading, initialLoading, error } = useApi(
    () =>
      api.searchCenters({
        q: debounced.q || undefined,
        city: debounced.city || undefined,
        subject: debounced.subject || undefined,
        grade: debounced.grade || undefined,
        page: debounced.page,
        limit: 12,
      }),
    [debounced.q, debounced.city, debounced.subject, debounced.grade, debounced.page],
  );

  const { data: catalog } = useApi(async () => {
    const [s, g] = await Promise.all([api.get<Subject[]>('/catalog/subjects'), api.get<Grade[]>('/catalog/grades')]);
    return Promise.resolve({ success: true as const, message: '', data: { subjects: s.data ?? [], grades: g.data ?? [] } });
  }, []);

  const results: PublicCenter[] = data?.items ?? [];
  const meta = data ? { total: data.total, totalPages: Math.ceil(data.total / data.limit) } : null;

  const patch = (p: Partial<CenterFilters>) => setFilters((f) => ({ ...f, page: 1, ...p }));

  const withCoords = useMemo(() => results.filter((c) => c.latitude != null && c.longitude != null), [results]);

  /** Set active center and scroll the list to that card. */
  const focusCenter = useCallback(
    (id: string) => {
      setActiveCenterId(id);
      const el = cardRefs.current.get(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },
    [],
  );

  /** Register a card ref for scroll-into-view. */
  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  const Pagination = () =>
    meta && meta.totalPages > 1 ? (
      <div className="mt-6 flex items-center justify-center gap-3">
        <Button variant="outline" size="sm" disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}>
          {t('back')}
        </Button>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {filters.page} / {meta.totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={filters.page >= meta.totalPages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
          {t('next')}
        </Button>
      </div>
    ) : null;

  /** A single center result card – premium reusable design. */
  const renderCard = (c: PublicCenter, idx: number) => {
    const isActive = c.id === activeCenterId;
    return (
      <div key={c.id} ref={(el) => setCardRef(c.id, el)} className="min-w-0">
        <CenterCard center={c} index={idx} isActive={isActive} onFocus={focusCenter} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PublicNav />
      <main className="container mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('centersTitle')}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('centersSubtitle')}</p>
          </div>
          {results.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                // Desktop: focus/fit the (already visible) map.
                // Mobile: open the full-screen map overlay.
                if (window.matchMedia('(min-width: 1024px)').matches) {
                  setFitSignal((s) => s + 1);
                } else {
                  setShowMap(true);
                }
              }}
            >
              <MapIcon className="h-4 w-4" /> {t('showOnMap')}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.q}
              onChange={(e) => patch({ q: e.target.value })}
              placeholder={t('search')}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 ps-9 pe-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-brand-900"
            />
          </div>
          <Input value={filters.city} onChange={(e) => patch({ city: e.target.value })} placeholder={t('city')} />
          <Select
            options={(catalog?.subjects ?? []).map((s: Subject) => ({ value: s.id, label: s.name }))}
            value={filters.subject}
            onChange={(e) => patch({ subject: e.target.value })}
            placeholder={t('anySubject')}
          />
          <Select
            options={(catalog?.grades ?? []).map((g: Grade) => ({ value: g.id, label: g.name }))}
            value={filters.grade}
            onChange={(e) => patch({ grade: e.target.value })}
            placeholder={t('anyGrade')}
          />
        </div>

        {error && <Alert message={error} className="mt-4" />}
        {!initialLoading && loading && (
          <div className="py-3">
            <PencilLoader size="sm" label={t('loading')} />
          </div>
        )}

        {initialLoading ? (
          <div className="flex justify-center py-20">
            <PencilLoader label={t('loading')} />
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>
        ) : results.length === 0 ? (
          <EmptyState icon={SearchX} title={t('noCenters')} description={t('centersSubtitle')} />
        ) : (
          <>
            {/* ── DESKTOP: split layout — map permanently visible on the right ── */}
            <div className="hidden lg:grid lg:grid-cols-[1fr_1.2fr] lg:gap-6">
              {/* Left: scrollable center list */}
              <div ref={listRef} className="ecms-centers-list lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto lg:pe-2">
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">{results.map((c, i) => renderCard(c, i))}</div>
                <Pagination />
              </div>
              {/* Right: sticky, large map */}
              <div className="sticky top-24 lg:h-[calc(100vh-11rem)]">
                <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700">
                  <CenterMap
                    centers={withCoords}
                    focusCenterId={activeCenterId}
                    onFocusCenter={focusCenter}
                    fitSignal={fitSignal}
                  />
                </div>
              </div>
            </div>

            {/* ── MOBILE: cards list only ── */}
            <div className="lg:hidden">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{results.map((c, i) => renderCard(c, i))}</div>
              <Pagination />
            </div>
          </>
        )}
      </main>

      {/* ── MOBILE: full-screen map overlay ── */}
      {showMap && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{t('centersTitle')}</span>
            <Button variant="outline" size="sm" onClick={() => { setShowMap(false); setActiveCenterId(null); }}>
              <X className="h-4 w-4" /> {t('closeMap')}
            </Button>
          </div>
          <div className="relative flex-1">
            <CenterMap centers={withCoords} focusCenterId={activeCenterId} onFocusCenter={focusCenter} fitSignal={fitSignal} />
          </div>
        </div>
      )}
    </div>
  );
}

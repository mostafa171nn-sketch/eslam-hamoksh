'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search, MapPin, Users, GraduationCap, SearchX, Star, MapIcon, X } from 'lucide-react';
import { PublicNav } from '../../src/components/layout/PublicNav';
import { PencilLoader } from '../../src/components/ui/PencilLoader';
import { Input } from '../../src/components/ui/Input';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Alert } from '../../src/components/ui/ErrorAlert';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { api, type PublicCenter } from '../../src/lib/api';
import { useApi } from '../../src/hooks/useApi';
import { Select } from '../../src/components/ui/Select';
import { useT } from '../../src/i18n';
import type { Grade, Subject } from '../../src/lib/types';

const CenterMap = dynamic(() => import('../../src/components/centers/CenterMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      Loading map…
    </div>
  ),
});

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

  /** A single center result card. */
  const renderCard = (c: PublicCenter) => {
    const isActive = c.id === activeCenterId;
    return (
      <div key={c.id} ref={(el) => setCardRef(c.id, el)}>
        <Card
          bodyClassName="p-5"
          className={`ecms-center-card transition-all duration-200 ${
            isActive
              ? 'border-brand-400 ring-2 ring-brand-100 dark:border-brand-500 dark:ring-brand-900/50'
              : 'hover:shadow-md'
          } dark:border-slate-700 dark:bg-slate-800`}
        >
          <div className="flex items-start gap-4">
            {c.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.photoUrl} alt={c.name} className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-50 text-xl font-bold text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                {c.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <Link
                href={`/centers/${c.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  focusCenter(c.id);
                }}
                className="text-base font-semibold text-slate-900 hover:text-brand-600 dark:text-white"
              >
                {c.name}
              </Link>
              {c.city && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="h-3.5 w-3.5" /> {c.city}
                </p>
              )}
              {(c.ratingCount ?? 0) > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {(c.ratingAverage ?? 0).toFixed(1)}
                  <span className="text-slate-400 dark:text-slate-500">({c.ratingCount})</span>
                </p>
              )}
            </div>
          </div>
          {c.description && (
            <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{c.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-1">
            {c.subjects.slice(0, 4).map((s) => (
              <span key={s.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                {s.name}
              </span>
            ))}
            {c.subjects.length > 4 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                +{c.subjects.length - 4}
              </span>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
            <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" /> {c.studentCount}
              </span>
              <span className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4" /> {c.teacherCount}
              </span>
            </div>
            <Link href={`/centers/${c.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300">
              {t('centerDetails')} →
            </Link>
          </div>
        </Card>
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
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.q}
              onChange={(e) => patch({ q: e.target.value })}
              placeholder={t('search')}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-brand-900"
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
              <div ref={listRef} className="ecms-centers-list lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto lg:pr-2">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{results.map(renderCard)}</div>
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{results.map(renderCard)}</div>
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

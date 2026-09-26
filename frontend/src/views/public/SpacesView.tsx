'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Search, MapPinOff } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { PencilLoader } from '@/src/components/ui/PencilLoader';
import { Alert } from '@/src/components/ui/ErrorAlert';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { SpaceCardV637 } from '@/src/components/spaces/SpaceCardV637';
import { PublicBottomNav, FiltersIcon, MapIcon, ResultsIcon } from '@/src/components/layout/PublicBottomNav';
import { api, type PublicSpace, type SearchSpacesResult } from '@/src/lib/api';
import { useApi } from '@/src/hooks/useApi';
import { useT } from '@/src/i18n';

/*
  /spaces — faithful rebuild of the reference `spaces.html` (V6.37 co-space
  "youth marketplace" search), adapted to the agreed future `PublicSpace`
  contract.

  Reference → adaptation notes:
    - The backend has NO public co-space endpoint yet, so `searchSpaces` is a
      future contract and this page currently renders its honest loading →
      error → empty state. It lights up automatically when `GET /spaces/search`
      ships (no rebuild needed).
    - Map hero (#spaceMap) renders real space coordinates via the shared Leaflet
      map when they exist; otherwise its "no locations yet" message.
    - Market kind switch (v15): the "المساحات/Co-space" tile is the active page;
      the "السناتر/قاعات تعليمية" tile links to /centers.
    - Only المحافظة (governorate) is backed by real data: its options come from
      distinct governorates seen in the results. المنطقة/نوع المساحة/السعة/
      السعر/التجهيزات/الميعاد are rendered disabled like the reference's
      `opacity:.45` chips — they auto-enable when that field exists on results.
    - Sort "الأقرب إليك" uses real coordinates (browser location when granted),
      "الأعلى تقييمًا" sorts by rating. The two price sorts are disabled until
      a price exists in the contract.
    - Results are paged server-side at 12; "تحميل المزيد" appends pages.
*/

const SPACES_BOTTOM_NAV = [
  { id: 'filters', targetId: 'spaceFilters', labelKey: 'spacesFiltersNav', icon: <FiltersIcon /> },
  { id: 'map', targetId: 'spaceMap', labelKey: 'spacesMapNav', icon: <MapIcon /> },
  { id: 'results', targetId: 'spaceResultsHead', labelKey: 'spacesResultsNav', icon: <ResultsIcon /> },
] as const;

const EGYPT_DEFAULT = { lat: 30.0444, lng: 31.2357, zoom: 9 };

const SpaceMap = dynamic(() => import('@/src/components/spaces/SpaceMap'), {
  ssr: false,
  loading: SpaceMapLoader,
});

function SpaceMapLoader() {
  const { t } = useT();
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#eef2ec] text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      {t('loadingMap')}
    </div>
  );
}

function UiIcon({ children, className = 'h-4 w-4' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

const ICON_PIN = (
  <>
    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.6" />
  </>
);

const ICON_USERS = (
  <>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20c.6-3.4 2.6-5.2 5.5-5.2S13.9 16.6 14.5 20" />
    <path d="M16 4.6c1.7.5 3 2 3 3.4s-1.3 2.9-3 3.4" />
    <path d="M18.2 14.2c1.6.9 2.6 2.6 2.9 5.3" />
  </>
);

const ICON_CALENDAR = (
  <>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </>
);

const ICON_CHECK = (
  <>
    <path d="M20 6 9 17l-5-5" />
  </>
);

const ICON_SPARKLE = (
  <>
    <path d="m12 3 1.2 3.3L16.5 8l-3.3 1.7L12 13l-1.2-3.3L7.5 8l3.3-1.7L12 3Z" />
    <path d="m18.5 13 .7 1.8L21 15.5l-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
  </>
);

const ICON_REFRESH = (
  <>
    <path d="M20 6v5h-5" />
    <path d="M4 18v-5h5" />
    <path d="M6.1 9a7 7 0 0 1 11.6-2.6L20 11M4 13l2.3 4.6A7 7 0 0 0 17.9 15" />
  </>
);

const ICON_BUILDING = (
  <>
    <path d="M3 21h18" />
    <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
    <path d="M15 9h4a2 2 0 0 1 2 2v10" />
    <path d="M9 7h2" />
    <path d="M9 11h2" />
    <path d="M9 15h2" />
    <path d="M13 21v-3a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3" />
  </>
);

const ICON_BRIEFCASE = (
  <>
    <rect width="20" height="14" x="2" y="7" rx="2" />
    <path d="M16 21V7a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v14" />
  </>
);

type SpaceFilterId = 'governorate' | 'area' | 'category' | 'capacity' | 'price' | 'equipment' | 'availability';
type SortId = 'near' | 'rating' | 'priceAsc' | 'priceDesc';

function haversineKm(latA: number, lngA: number, latB: number, lngB: number): number {
  const R = 6371;
  const dLat = ((latB - latA) * Math.PI) / 180;
  const dLng = ((lngB - lngA) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((latA * Math.PI) / 180) * Math.cos((latB * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface SpacesViewProps {
  /** Server-rendered results for the default (no filter, page 1) query. */
  initialResult?: SearchSpacesResult | null;
}

function governoratesFrom(items: readonly PublicSpace[]): string[] {
  const seen = new Set<string>();
  for (const s of items) {
    if (s.governorate) seen.add(s.governorate as string);
  }
  return [...seen].sort((a, b) => a.localeCompare(b, 'ar'));
}

export default function SpacesView({ initialResult }: SpacesViewProps) {
  const { t } = useT();

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortId>('near');
  const [openFilter, setOpenFilter] = useState<SpaceFilterId | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  const [governorateOptions, setGovernorateOptions] = useState<string[]>(() =>
    governoratesFrom(initialResult?.items ?? []),
  );

  /* Debounce the search input (300 ms, like the reference's `#sq` keyup). */
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => window.clearTimeout(id);
  }, [q]);

  /* Silent geolocation for the "nearest to you" sort — never blocks. */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { timeout: 3000, maximumAge: 600_000 },
    );
  }, []);

  const { data, loading, initialLoading, error } = useApi<SearchSpacesResult>(
    () =>
      api.searchSpaces({
        q: debouncedQ || undefined,
        governorate: governorate || undefined,
        page,
        limit: 12,
      }),
    [debouncedQ, governorate, page],
    {
      cacheKey: `spaces:search:${debouncedQ}:${governorate}:${page}`,
      staleTTL: 30_000,
      cacheTTL: 120_000,
      initialData: page === 1 ? (initialResult ?? undefined) : undefined,
      initialMeta:
        page === 1 && initialResult
          ? {
              page: initialResult.page,
              limit: initialResult.limit,
              total: initialResult.total,
              totalPages: initialResult.totalPages,
            }
          : undefined,
    },
  );

  /* Accumulate loaded pages so "تحميل المزيد" appends instead of replacing. */
  const [allItems, setAllItems] = useState<PublicSpace[]>(() => initialResult?.items ?? []);
  useEffect(() => {
    if (!data) return;
    setAllItems((prev) => {
      if (page === 1) return data.items;
      const seen = new Set(prev.map((c) => c.id));
      const next = [...prev];
      for (const c of data.items) {
        if (!seen.has(c.id)) next.push(c);
      }
      return next;
    });
  }, [data, page]);

  /* Trace the distinct governorates we've seen (survives the active filter). */
  useEffect(() => {
    if (!data) return;
    setGovernorateOptions((prev) => {
      const merged = [...new Set([...prev, ...governoratesFrom(data.items)])];
      return merged.sort((a, b) => a.localeCompare(b, 'ar'));
    });
  }, [data]);

  /* The reference keeps the default sort while filters/search change. */
  useEffect(() => {
    setSort('near');
  }, [q, governorate]);

  const displayed = useMemo(() => {
    let list = allItems;
    if (sort === 'rating') {
      list = [...list].sort(
        (a, b) => (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0) || (b.ratingCount ?? 0) - (a.ratingCount ?? 0),
      );
    } else if (sort === 'near' && userPos) {
      const pos = userPos;
      list = [...list].sort((a, b) => {
        const da =
          a.latitude != null && a.longitude != null
            ? haversineKm(pos.lat, pos.lng, a.latitude, a.longitude)
            : Infinity;
        const db =
          b.latitude != null && b.longitude != null
            ? haversineKm(pos.lat, pos.lng, b.latitude, b.longitude)
            : Infinity;
        return da - db;
      });
    }
    return list;
  }, [allItems, sort, userPos]);

  const total = data?.total ?? allItems.length;
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil((initialResult?.total ?? 0) / 12));
  const hasMore = page < totalPages;

  const withCoords = useMemo(
    () => allItems.filter((c) => c.latitude != null && c.longitude != null),
    [allItems],
  );

  const hasFilters = Boolean(q) || Boolean(governorate);

  const clearFilters = () => {
    setQ('');
    setDebouncedQ('');
    setGovernorate('');
    setSort('near');
    setPage(1);
    setOpenFilter(null);
  };

  const changeFilter = (id: SpaceFilterId, value: string) => {
    if (id === 'governorate') setGovernorate(value);
    setPage(1);
    setOpenFilter(null);
  };

  const labels: Record<SpaceFilterId, { value: string; label: string; icon: ReactNode }> = {
    governorate: {
      value: governorate,
      label: governorate ? t('chipGovernorate') + ': ' + governorate : t('chipGovernorate'),
      icon: <UiIcon>{ICON_PIN}</UiIcon>,
    },
    area: { value: '', label: t('chipArea'), icon: <UiIcon>{ICON_PIN}</UiIcon> },
    category: { value: '', label: t('chipCategory'), icon: <UiIcon>{ICON_BRIEFCASE}</UiIcon> },
    capacity: { value: '', label: t('chipCapacity'), icon: <UiIcon>{ICON_USERS}</UiIcon> },
    price: { value: '', label: t('chipPrice'), icon: <UiIcon>{ICON_SPARKLE}</UiIcon> },
    equipment: { value: '', label: t('chipEquipment'), icon: <UiIcon>{ICON_CHECK}</UiIcon> },
    availability: { value: '', label: t('chipAvailability'), icon: <UiIcon>{ICON_CALENDAR}</UiIcon> },
  };

  const enabled: Partial<Record<SpaceFilterId, true>> = { governorate: true };
  const chipIds: SpaceFilterId[] = ['governorate', 'area', 'category', 'capacity', 'price', 'equipment', 'availability'];

  const openPanelTitle = openFilter === 'governorate' ? t('chipGovernorate') : '';
  const openOptions =
    openFilter === 'governorate'
      ? [{ value: '', label: t('chipGovernorateAll') }, ...governorateOptions.map((g) => ({ value: g, label: g }))]
      : [];
  const currentValue = openFilter ? labels[openFilter].value : '';

  return (
    <div className="min-h-screen bg-[#f7fbff] dark:bg-slate-900">
      {/* ── Map hero (#spaceMap) — full-bleed, honest empty Leaflet state ── */}
      <section id="spaceMap" aria-label={t('spacesMapRegion')} className="sm:px-[22px] sm:pt-[14px]">
        <div
          role="region"
          aria-label={t('spacesMapRegion')}
          className="relative h-[300px] w-full overflow-hidden border-y border-[#dbe9f7] bg-[#eef2ec] sm:h-[390px] sm:max-h-none sm:rounded-[24px] sm:border dark:border-slate-600 max-[600px]:h-[290px]"
        >
          <SpaceMap
            spaces={withCoords}
            focusSpaceId={null}
            onFocusSpace={() => {}}
            defaultPos={EGYPT_DEFAULT}
          />
        </div>
      </section>

      {/* ── Market kind switch (reference `nav.market-kind-switch-v15`) ── */}
      <nav aria-label={t('spacesCategoryLabel')} className="mx-auto mb-1.5 mt-3 w-[min(680px,calc(100%-24px))]">
        <div className="relative grid grid-cols-2 items-stretch gap-[7px] overflow-hidden rounded-[24px] border border-[#d9e8f4] bg-[linear-gradient(135deg,#f4f9ff_0%,#eef7ff_50%,#f6fbff_100%)] p-[6px] shadow-[0_10px_28px_rgba(18,65,104,0.09)] dark:border-slate-600 dark:bg-slate-800/80">
          {/* Active tile → /spaces (this page) */}
          <a
            href="/spaces"
            aria-current="page"
            className="relative grid h-[60px] grid-cols-[40px_minmax(0,1fr)_24px] items-center gap-[9px] rounded-[18px] border border-transparent bg-[linear-gradient(135deg,#078af2_0%,#146ee7_55%,#6259e8_125%)] px-[10px] text-white shadow-[0_12px_28px_rgba(8,119,228,0.26)] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.18)_42%,transparent_62%)]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-white/18 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]">
              <UiIcon className="h-[22px] w-[22px]">{ICON_BRIEFCASE}</UiIcon>
            </span>
            <span className="flex min-w-0 flex-col items-start text-[14px] font-extrabold leading-[1.2]">
              {t('centersKindSpaces')}
              <small className="mt-[3px] text-[8.5px] font-bold text-white/75">{t('centersKindSpacesSub')}</small>
            </span>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[12px] font-black text-[#0a78e7]">
              ←
            </span>
          </a>

          {/* Non-active tile → /centers */}
          <a
            href="/centers"
            className="grid h-[60px] grid-cols-[40px_minmax(0,1fr)_24px] items-center gap-[9px] rounded-[18px] border border-[rgba(216,231,243,0.92)] bg-white/84 px-[10px] text-[#567087] shadow-[0_5px_16px_rgba(15,67,110,0.05)] transition-transform duration-150 hover:-translate-y-0.5 dark:border-slate-600 dark:bg-slate-900/50"
          >
            <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#edf7ff] text-[#087bd8] shadow-[inset_0_0_0_1px_#d8ebfa]">
              <UiIcon className="h-[22px] w-[22px]">{ICON_BUILDING}</UiIcon>
            </span>
            <span className="flex min-w-0 flex-col items-start text-[14px] font-extrabold leading-[1.2]">
              {t('centersKindCenters')}
              <small className="mt-[3px] text-[8.5px] font-bold text-[#567087]/75">{t('centersKindCentersSub')}</small>
            </span>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#edf6fd] text-[12px] font-black text-[#1878c7]">
              ←
            </span>
          </a>
        </div>
      </nav>

      {/* ── Location status (reference #spaceLocationState) ── */}
      {!governorate && (
        <p className="mx-auto mb-0 mt-1 w-full max-w-[1180px] px-[22px] text-center text-[11px] font-semibold text-[#8a96b3]">
          {t('spacesLocationStatus')}
        </p>
      )}

      {/* ── Search + filter chips (#spaceFilters, max-width 1180) ── */}
      <section
        id="spaceFilters"
        aria-label={t('spacesSearchControls')}
        className="mx-auto w-full max-w-[1180px] px-[22px] py-4"
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8a99b8]"
            aria-hidden
          />
          <input
            id="spaceSearch"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={t('spacesSearchPlaceholder')}
            aria-label={t('spacesSearchPlaceholder')}
            className="h-[50px] w-full rounded-[17px] border border-[#dbe7f1] bg-white ps-11 pe-11 text-[14px] font-medium text-[#0b1b61] placeholder:text-[#9aa8c4] transition-colors focus:border-[#0e9c80] focus:outline-none dark:border-slate-600 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500"
          />
          {q && (
            <button
              type="button"
              aria-label={t('spacesSearchClear')}
              onClick={() => {
                setQ('');
                setPage(1);
              }}
              className="absolute end-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-[#eef3fb] text-[#6e7b98] transition-colors hover:text-[#0b1b61]"
            >
              ×
            </button>
          )}
        </div>

        {/* Quick-filter chips row (reference `.market-quick-filters`) */}
        <div className="relative mt-3">
          <div id="spaceFilterRow" className="flex flex-wrap items-center gap-2">
            {chipIds.map((id) => {
              const isEnabled = !!enabled[id];
              const isActive = labels[id].value !== '';
              return (
                <button
                  key={id}
                  type="button"
                  data-filter-target={id}
                  aria-expanded={openFilter === id}
                  aria-haspopup="listbox"
                  disabled={!isEnabled}
                  onClick={() => setOpenFilter((cur) => (cur === id ? null : id))}
                  className={`inline-flex h-11 max-w-full items-center gap-1.5 rounded-[14px] border-[0.8px] px-3 text-[12px] font-semibold transition-colors ${
                    isEnabled
                      ? isActive
                        ? 'border-[#0e9c80] bg-[#e7f8f2] text-[#0e9c80] dark:border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300'
                        : 'border-[#d6e4f4] bg-[#f7fbff] text-[#4d6281] hover:border-[#bcd6ef] hover:text-[#0b1b61] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      : 'border-[#d6e4f4] bg-[#f7fbff] text-[#4d6281] opacity-45 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  } ${isEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <span className="shrink-0">{labels[id].icon}</span>
                  <b className="truncate font-semibold">{labels[id].label}</b>
                  <span className="shrink-0 text-[11px] opacity-70">⌄</span>
                </button>
              );
            })}

            <button
              type="button"
              id="spaceReset"
              disabled={!hasFilters}
              onClick={clearFilters}
              className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-[14px] border-[0.8px] border-[#d6e4f4] px-3 text-[12px] font-semibold text-[#4d6281] transition-colors hover:border-[#bcd6ef] hover:text-[#0b1b61] disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-600 dark:text-slate-300"
            >
              <UiIcon className="h-4 w-4">{ICON_REFRESH}</UiIcon>
              <span>{t('resetFilters')}</span>
            </button>
          </div>

          {/* Dropdown filter panel (reference `.market-filter-host`) */}
          {openFilter && openFilter in enabled && (
            <>
              <button
                aria-label="close"
                onClick={() => setOpenFilter(null)}
                className="fixed inset-0 z-20 cursor-default"
              />
              <div
                id="spaceFilterSheet"
                role="listbox"
                aria-label={openPanelTitle}
                className="absolute start-0 top-full z-30 mt-2 w-full max-w-[520px] rounded-[18px] border-[0.8px] border-[#dfe9f4] bg-white p-3 shadow-[0_16px_40px_rgba(20,73,137,0.16)] dark:border-slate-600 dark:bg-slate-800"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <strong className="text-[14px] font-extrabold text-[#0b1b61] dark:text-white">{openPanelTitle}</strong>
                  <div className="flex items-center gap-2">
                    {currentValue !== '' && (
                      <button
                        type="button"
                        onClick={() => {
                          changeFilter(openFilter, '');
                          setOpenFilter(null);
                        }}
                        className="text-[12px] font-bold text-[#0e9c80] hover:underline dark:text-emerald-300"
                      >
                        {t('clear')}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="close"
                      onClick={() => setOpenFilter(null)}
                      className="grid h-7 w-7 place-items-center rounded-full bg-[#eef3fb] text-[#6e7b98] hover:text-[#0b1b61] dark:bg-slate-700 dark:text-slate-300"
                    >
                      ×
                    </button>
                  </div>
                </div>
                {openOptions.length > 0 ? (
                  <div className="grid max-h-[260px] grid-cols-2 gap-1.5 overflow-y-auto">
                    {openOptions.map((o) => {
                      const selected = o.value === currentValue;
                      return (
                        <button
                          key={`${openFilter}:${o.value}`}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => changeFilter(openFilter, o.value)}
                          className={`flex min-h-[42px] items-center justify-between gap-2 rounded-[13px] border-[0.8px] px-3 text-[13px] font-semibold text-start transition-colors ${
                            selected
                              ? 'border-[#0e9c80] bg-[#e7f8f2] text-[#0e9c80] dark:border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300'
                              : 'border-[#e4edf7] bg-[#fafcfe] text-[#4d6281] hover:border-[#bcd6ef] hover:text-[#0b1b61] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300'
                          }`}
                        >
                          <span className="truncate">{o.label}</span>
                          {selected && <span aria-hidden className="shrink-0 text-[13px] font-black">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="px-2 py-5 text-center text-[12px] font-medium text-[#7b8d9e] dark:text-slate-400">
                    {t('noSpacesData')}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Results head — total count + sort (reference #spaceResultsHead) ── */}
      <section id="spaceResultsHead" aria-label={t('spacesResultsNav')} className="w-full px-[24px] pt-3">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3">
          <strong className="text-[19px] font-extrabold text-[#123457] sm:text-[20px] dark:text-white">
            {t('spacesCount', { count: total.toLocaleString() })}
          </strong>
          <label className="relative flex h-10 shrink-0 items-center gap-2 rounded-[14px] border-[0.8px] border-[#d6e4f4] bg-white pe-2 ps-3 dark:border-slate-600 dark:bg-slate-800">
            <span className="hidden text-[11px] font-medium text-[#75879b] sm:inline">{t('spacesSortLabel')}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              aria-label={t('spacesSortLabel')}
              className="h-full appearance-none bg-transparent text-[12px] font-semibold text-[#354469] focus:outline-none dark:text-slate-200"
            >
              <option value="near">{t('sortNear')}</option>
              <option value="rating">{t('sortRating')}</option>
              <option value="priceAsc" disabled>{t('sortPriceAsc')}</option>
              <option value="priceDesc" disabled>{t('sortPriceDesc')}</option>
            </select>
            <span aria-hidden className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8a99b8]">
              ⌄
            </span>
          </label>
        </div>
      </section>

      {error && allItems.length === 0 && <Alert title={t('errorOccurred')} message={error} className="mx-auto mt-4 w-full max-w-[1180px] px-4" />}

      {initialLoading && page === 1 ? (
        <div className="flex justify-center py-16" aria-live="polite">
          <PencilLoader />
        </div>
      ) : (
        <section id="spaceResults" aria-label={t('spaceCardKind')} className="w-full px-[24px] py-4">
          {displayed.length === 0 ? (
            <div className="mx-auto mt-4 w-full max-w-[1180px]">
              <EmptyState
                icon={MapPinOff}
                title={t('spacesNoMatch')}
                description={t('spacesNoMatchHint')}
                action={
                  hasFilters ? (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      {t('resetFilters')}
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-[14px] min-[801px]:grid-cols-2">
              {displayed.map((space, i) => (
                <SpaceCardV637 key={space.id} space={space} index={i} />
              ))}
            </div>
          )}

          {loading && displayed.length > 0 && (
            <div className="mt-5 flex justify-center" aria-live="polite">
              <PencilLoader size="sm" />
            </div>
          )}

          {hasMore && !error && displayed.length > 0 && (
            <div className="mt-7 flex justify-center">
              <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                {t('loadMore')}
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Contextual bottom nav — الفلاتر / الخريطة / النتائج (mobile) */}
      <PublicBottomNav sections={SPACES_BOTTOM_NAV} />
    </div>
  );
}
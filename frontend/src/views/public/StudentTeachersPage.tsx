'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { GraduationCap, Search } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/ErrorAlert';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { useApi } from '../../hooks/useApi';
import { api, type ApiMeta } from '../../lib/api';
import { useT, type DictKey } from '../../i18n';
import type { Grade, Location, Subject } from '../../lib/types';
import { MapHero } from './teachers/MapHero';
import { TeacherCard } from './teachers/TeacherCard';
import { TeacherCardCompact } from './teachers/TeacherCardCompact';
import { ICON_BOOK, ICON_PIN, ICON_SCHOOL } from './teachers/TeacherCard';

export interface StudentTeachersPageProps {
  initialData?: readonly PublicTeacherLike[];
  initialMeta?: ApiMeta;
  initialCatalog?: { subjects: Subject[]; grades: Grade[]; locations: Location[] };
}

import type { PublicTeacher } from '../../lib/types';
type PublicTeacherLike = PublicTeacher;

const STAGES = [
  { key: '', re: null },
  { key: 'primary', re: /primary/i },
  { key: 'preparatory', re: /preparatory/i },
  { key: 'secondary', re: /secondary/i },
] as const;

const STAGE_KEYS: Record<string, DictKey> = {
  primary: 'stagePrimary',
  preparatory: 'stagePreparatory',
  secondary: 'stageSecondary',
};

type FilterId = 'subject' | 'stage' | 'location' | 'day' | 'rating' | 'price';

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

const ICON_CALENDAR = (
  <>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </>
);

const ICON_STAR = (
  <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
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

type SortId = '' | 'rating' | 'priceAsc' | 'priceDesc';

function teacherCountText(n: number, singular: string, plural: string): string {
  const mod = n % 100;
  const word = mod >= 3 && mod <= 10 ? plural : singular;
  return `${n.toLocaleString()} ${word}`;
}

export default function StudentTeachersPage({ initialData, initialMeta, initialCatalog }: StudentTeachersPageProps) {
  const { t, lang } = useT();
  const searchParams = useSearchParams();
  const centerId = searchParams?.get('center') ?? '';

  // Read landing page search params: q (text), location, subject, date
  const landingQ = searchParams?.get('q') ?? '';
  const landingLocation = searchParams?.get('location') ?? '';
  const landingSubject = searchParams?.get('subject') ?? '';
  const landingDate = searchParams?.get('date') ?? '';

  const [page, setPage] = useState(1);
  const [name, setName] = useState(landingQ);
  const [subjectId, setSubjectId] = useState(landingSubject);
  const [stageKey, setStageKey] = useState<string>('');
  const [locationId, setLocationId] = useState(landingLocation);
  const [day, setDay] = useState(() => {
    if (!landingDate) return '';
    try {
      const dateObj = new Date(landingDate);
      return isNaN(dateObj.getTime()) ? '' : String(dateObj.getDay());
    } catch {
      return '';
    }
  });
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sort, setSort] = useState<SortId>('');
  const [openFilter, setOpenFilter] = useState<FilterId | null>(null);

  useEffect(() => {
    setPage(1);
  }, [centerId]);

  // The reference sort stays "default" whenever filters/search change.
  useEffect(() => {
    setSort('');
  }, [name, subjectId, stageKey, locationId, day, minRating, maxPrice, centerId]);

  const DAY_OPTIONS = [
    { value: '', label: t('anyDay') },
    { value: '0', label: t('sunday') },
    { value: '1', label: t('monday') },
    { value: '2', label: t('tuesday') },
    { value: '3', label: t('wednesday') },
    { value: '4', label: t('thursday') },
    { value: '5', label: t('friday') },
    { value: '6', label: t('saturday') },
  ];

  const PRICE_OPTIONS = [
    { value: '', label: t('priceFilter') },
    { value: '100', label: t('upToPrice', { price: lang === 'ar' ? 'ج.م 100' : 'EGP 100' }) },
    { value: '150', label: t('upToPrice', { price: lang === 'ar' ? 'ج.م 150' : 'EGP 150' }) },
    { value: '200', label: t('upToPrice', { price: lang === 'ar' ? 'ج.م 200' : 'EGP 200' }) },
    { value: '250', label: t('upToPrice', { price: lang === 'ar' ? 'ج.م 250' : 'EGP 250' }) },
    { value: '300', label: t('upToPrice', { price: lang === 'ar' ? 'ج.م 300' : 'EGP 300' }) },
  ];

  const RATING_OPTIONS = [
    { value: '', label: t('rating') },
    { value: '4.5', label: `4.5 ★ ${t('andAbove')}` },
    { value: '4', label: `4 ★ ${t('andAbove')}` },
    { value: '3', label: `3 ★ ${t('andAbove')}` },
  ];

  const { data: catalog } = useApi(
    () =>
      Promise.all([
        api.get<Subject[]>('/catalog/subjects'),
        api.get<Grade[]>('/catalog/grades'),
        api.get<Location[]>('/catalog/locations'),
      ]).then(([s, g, l]) =>
        Promise.resolve({ success: true as const, message: '', data: { subjects: s.data ?? [], grades: g.data ?? [], locations: l.data ?? [] } }),
      ),
    [],
    {
      cacheKey: 'catalog:teachers',
      staleTTL: 300_000,
      cacheTTL: 600_000,
      initialData: initialCatalog,
    },
  );

  const stageGradeIds = useMemo(() => {
    const stage = STAGES.find((s) => s.key === stageKey);
    if (!stage?.re || !catalog?.grades) return [];
    return catalog.grades.filter((g: Grade) => stage.re!.test(g.name)).map((g: Grade) => g.id);
  }, [stageKey, catalog?.grades]);

  const { data, meta, loading, initialLoading, error } = useApi(
    () =>
      api.searchTeachers({
        page,
        limit: 12,
        name: name || undefined,
        subjectId: subjectId || undefined,
        grades: stageKey ? stageGradeIds : undefined,
        locationId: locationId || undefined,
        centerId: centerId || undefined,
        day: day ? Number(day) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        minRating: minRating ? Number(minRating) : undefined,
      }),
    [page, name, subjectId, stageKey, stageGradeIds, locationId, day, maxPrice, minRating, centerId],
    {
      cacheKey: `teachers:search:${page}:${name}:${subjectId}:${stageKey}:${locationId}:${day}:${maxPrice}:${minRating}:${centerId}`,
      staleTTL: 30_000,
      cacheTTL: 120_000,
      initialData: Array.isArray(initialData) ? (initialData as PublicTeacher[]) : undefined,
      initialMeta,
    },
  );

  // The sort dropdown mirrors the reference; ordering is applied to the loaded
  // page (the /teachers API has no server-side order param).
  const displayed = useMemo(() => {
    const list = data ?? [];
    if (!sort) return list;
    const sorted = [...list];
    if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount);
    else if (sort === 'priceAsc') sorted.sort((a, b) => a.hourlyRate - b.hourlyRate);
    else if (sort === 'priceDesc') sorted.sort((a, b) => b.hourlyRate - a.hourlyRate);
    return sorted;
  }, [data, sort]);

  const clearFilters = () => {
    setName('');
    setSubjectId('');
    setStageKey('');
    setLocationId('');
    setDay('');
    setMaxPrice('');
    setMinRating('');
    setSort('');
    setPage(1);
  };

  const clearOne = (id: FilterId) => {
    const setters: Record<FilterId, () => void> = {
      subject: () => setSubjectId(''),
      stage: () => setStageKey(''),
      location: () => setLocationId(''),
      day: () => setDay(''),
      rating: () => setMinRating(''),
      price: () => setMaxPrice(''),
    };
    setters[id]();
    setPage(1);
  };

  const hasFilters =
    Boolean(name) ||
    Boolean(subjectId) ||
    Boolean(stageKey) ||
    Boolean(locationId) ||
    Boolean(day) ||
    Boolean(minRating) ||
    Boolean(maxPrice);

  const subjectName = catalog?.subjects.find((s) => s.id === subjectId)?.name;
  const locationName = catalog?.locations.find((l) => l.id === locationId)?.name;
  const dayLabel = day ? DAY_OPTIONS.find((o) => o.value === day)?.label ?? t('anyDay') : t('anyDay');
  const stageLabel = stageKey ? t(STAGE_KEYS[stageKey]) : t('allStages');

  interface ChipOption {
    value: string;
    label: string;
  }
  const panels: Record<FilterId, { title: string; options: ChipOption[] }> = {
    subject: {
      title: t('anySubject'),
      options: [{ value: '', label: t('anySubject') }, ...(catalog?.subjects ?? []).map((s) => ({ value: s.id, label: s.name }))],
    },
    stage: {
      title: t('allStages'),
      options: [
        { value: '', label: t('allStages') },
        { value: 'primary', label: t('stagePrimary') },
        { value: 'preparatory', label: t('stagePreparatory') },
        { value: 'secondary', label: t('stageSecondary') },
      ],
    },
    location: {
      title: t('filterArea'),
      options: [{ value: '', label: t('filterArea') }, ...(catalog?.locations ?? []).map((l) => ({ value: l.id, label: l.name }))],
    },
    day: {
      title: t('anyDay'),
      options: DAY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    },
    rating: { title: t('rating'), options: RATING_OPTIONS },
    price: { title: t('priceFilter'), options: PRICE_OPTIONS },
  };

  const activeValue: Record<FilterId, string> = {
    subject: subjectId,
    stage: stageKey,
    location: locationId,
    day,
    rating: minRating,
    price: maxPrice,
  };

  const labels: Record<FilterId, { value: string; icon: ReactNode; label: string }> = {
    subject: { value: subjectId, icon: <UiIcon>{ICON_BOOK}</UiIcon>, label: subjectName ?? t('anySubject') },
    stage: { value: stageKey, icon: <UiIcon>{ICON_SCHOOL}</UiIcon>, label: stageLabel },
    location: { value: locationId, icon: <UiIcon>{ICON_PIN}</UiIcon>, label: locationName ?? t('filterArea') },
    day: { value: day, icon: <UiIcon>{ICON_CALENDAR}</UiIcon>, label: dayLabel },
    rating: { value: minRating, icon: <UiIcon>{ICON_STAR}</UiIcon>, label: minRating ? `${minRating} ★ ${t('andAbove')}` : t('rating') },
    price: { value: maxPrice, icon: <UiIcon>{ICON_SPARKLE}</UiIcon>, label: maxPrice ? PRICE_OPTIONS.find((o) => o.value === maxPrice)?.label ?? t('priceFilter') : t('priceFilter') },
  };

  const chipIds: FilterId[] = ['subject', 'stage', 'location', 'day', 'rating', 'price'];
  if (centerId) chipIds.splice(2, 1); // hide the location chip when browsing a single center

  const changeFilter = (id: FilterId, value: string) => {
    const setters: Record<FilterId, (v: string) => void> = {
      subject: (v) => setSubjectId(v),
      stage: (v) => setStageKey(v),
      location: (v) => setLocationId(v),
      day: (v) => setDay(v),
      rating: (v) => setMinRating(v),
      price: (v) => setMaxPrice(v),
    };
    setters[id](value);
    setPage(1);
    setOpenFilter(null);
  };

  const openPanel = panels[openFilter ?? 'subject'];
  const currentValue = openFilter ? activeValue[openFilter] : '';

  return (
    <div>
      {/* Interactive teacher map */}
      <MapHero teachers={data ?? []} />

      {/* Search + filter chips */}
      <div id="teacherFilters" className="rounded-[24px] border-[0.8px] border-[#e0eaf2] bg-white p-3 sm:p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="relative">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8a99b8]" aria-hidden />
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setPage(1);
            }}
            placeholder={t('teacherSearchPlaceholder')}
            aria-label={t('teacherSearchPlaceholder')}
            className="h-[52px] w-full rounded-[16px] border border-[#dbe9f7] bg-white ps-11 pe-4 text-[15px] font-medium text-[#0b1b61] placeholder:text-[#9aa8c4] transition-colors focus:border-[#0878f8] focus:outline-none dark:border-slate-600 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        {/* Chips row (reference quick filters) */}
        <div className="relative mt-3">
          <div id="teacherFilterRow" className="flex flex-wrap items-center gap-2">
            {chipIds.map((id) => (
              <button
                key={id}
                type="button"
                data-filter-target={id}
                aria-expanded={openFilter === id}
                aria-haspopup="listbox"
                onClick={() => setOpenFilter((cur) => (cur === id ? null : id))}
                className={`inline-flex h-10 max-w-full items-center gap-1.5 rounded-[14px] border-[0.8px] px-3 text-[13px] font-semibold transition-colors ${
                  labels[id].value
                    ? 'border-[#0878f8] bg-[#e8f4ff] text-[#0878f8] dark:border-sky-400 dark:bg-sky-500/15 dark:text-sky-300'
                    : 'border-[#d6e4f4] bg-[#f7fbff] text-[#4d6281] hover:border-[#bcd6ef] hover:text-[#0b1b61] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <span className="shrink-0">{labels[id].icon}</span>
                <b className="truncate font-semibold">{labels[id].label}</b>
                <span className="shrink-0 text-[11px] opacity-70">⌄</span>
              </button>
            ))}

            <button
              type="button"
              id="resetFilters"
              disabled={!hasFilters}
              onClick={clearFilters}
              className="inline-flex h-10 items-center gap-1.5 rounded-[14px] border-[0.8px] border-[#d6e4f4] px-3 text-[13px] font-semibold text-[#4d6281] transition-colors hover:border-[#bcd6ef] hover:text-[#0b1b61] disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-600 dark:text-slate-300"
            >
              <UiIcon className="h-4 w-4">{ICON_REFRESH}</UiIcon>
              <span>{t('resetFilters')}</span>
            </button>
          </div>

          {/* Dropdown filter panel */}
          {openFilter && (
            <>
              <button aria-label="close" onClick={() => setOpenFilter(null)} className="fixed inset-0 z-20 cursor-default" />
              <div
                id="filterSheet"
                role="listbox"
                aria-label={openPanel.title}
                className="absolute start-0 top-full z-30 mt-2 w-full max-w-[520px] rounded-[18px] border-[0.8px] border-[#dfe9f4] bg-white p-3 shadow-[0_16px_40px_rgba(20,73,137,0.16)] dark:border-slate-600 dark:bg-slate-800"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <strong className="text-[14px] font-extrabold text-[#0b1b61] dark:text-white">{openPanel.title}</strong>
                  <div className="flex items-center gap-2">
                    {currentValue !== '' && (
                      <button type="button" onClick={() => { clearOne(openFilter); setOpenFilter(null); }} className="text-[12px] font-bold text-[#0878f8] hover:underline dark:text-sky-300">
                        {t('clear')}
                      </button>
                    )}
                    <button type="button" aria-label="close" onClick={() => setOpenFilter(null)} className="grid h-7 w-7 place-items-center rounded-full bg-[#eef3fb] text-[#6e7b98] hover:text-[#0b1b61] dark:bg-slate-700 dark:text-slate-300">
                      ×
                    </button>
                  </div>
                </div>
                <div className="grid max-h-[260px] grid-cols-2 gap-1.5 overflow-y-auto">
                  {openPanel.options.map((o) => {
                    const selected = o.value === currentValue;
                    return (
                      <button
                        key={`${openFilter}:${o.value}`}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => changeFilter(openFilter, o.value)}
                        className={`flex min-h-[42px] items-center justify-between gap-2 rounded-[13px] border-[0.8px] px-3 text-[13px] font-semibold text-start transition-colors ${
                          selected
                            ? 'border-[#0878f8] bg-[#e8f4ff] text-[#0878f8] dark:border-sky-400 dark:bg-sky-500/15 dark:text-sky-300'
                            : 'border-[#e4edf7] bg-[#fafcfe] text-[#4d6281] hover:border-[#bcd6ef] hover:text-[#0b1b61] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300'
                        }`}
                      >
                        <span className="truncate">{o.label}</span>
                        {selected && <span aria-hidden className="shrink-0 text-[13px] font-black">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Results head — count + sort (reference) */}
      <div id="teacherResultsHead" className="mt-5 flex items-center justify-between gap-3 sm:mt-7">
        <strong className="text-[17px] font-extrabold text-[#0b1b61] sm:text-[20px] dark:text-white">
          {teacherCountText(
            meta?.total ?? 0,
            t('teachersCountSingular'),
            t('teachersCountPlural'),
          )}
        </strong>
        <label className="relative shrink-0">
          <span className="sr-only">{t('sortLabel')}</span>
          <select
            value={sort}
            aria-label={t('sortLabel')}
            onChange={(e) => setSort(e.target.value as SortId)}
            className="h-10 w-auto appearance-none rounded-[14px] border-[0.8px] border-[#d6e4f4] bg-white pe-7 ps-3 text-[13px] font-semibold text-[#354469] transition-colors hover:border-[#bcd6ef] focus:border-[#0878f8] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">{t('sortDefault')}</option>
            <option value="near" disabled>{t('sortNear')}</option>
            <option value="rating">{t('sortRating')}</option>
            <option value="priceAsc">{t('sortPriceAsc')}</option>
            <option value="priceDesc">{t('sortPriceDesc')}</option>
          </select>
          <span aria-hidden className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8a99b8]">⌄</span>
        </label>
      </div>

      {error && <Alert title={t('couldNotLoadTeachers')} message={error} className="mt-4" />}
      {loading && (initialLoading ? <PencilLoader label={t('searchingTeachers')} /> : <PencilLoader size="sm" label={t('searchingTeachers')} />)}

      {!loading && data && (
        <>
          {data.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={GraduationCap}
                title={t('noTeachersMatch')}
                description={t('adjustFilters')}
                action={
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    {t('resetFilters')}
                  </Button>
                }
              />
            </div>
          ) : (
            <ul id="teacherResults" className="mt-4 grid grid-cols-1 gap-2.5 sm:mt-5 lg:grid-cols-3 lg:gap-4">
              {displayed.map((teacher) => (
                <li key={teacher.id} className="lg:flex lg:min-w-0">
                  {/* Horizontal compact card — mobile & tablet */}
                  <div className="lg:hidden">
                    <TeacherCard teacher={teacher} />
                  </div>
                  {/* Vertical compact card — desktop 3-column grid */}
                  <div className="hidden lg:flex lg:flex-1">
                    <TeacherCardCompact teacher={teacher} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-7">
            <Pagination page={page} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}
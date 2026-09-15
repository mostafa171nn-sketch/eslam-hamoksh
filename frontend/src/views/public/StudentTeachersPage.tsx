'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, GraduationCap, Search } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/ErrorAlert';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { useApi } from '../../hooks/useApi';
import { api, type ApiMeta } from '../../lib/api';
import { useT } from '../../i18n';
import type { Grade, Location, Subject } from '../../lib/types';
import { MapHero } from './teachers/MapHero';
import { TeacherCard } from './teachers/TeacherCard';
import { TeacherCardCompact } from './teachers/TeacherCardCompact';

export interface StudentTeachersPageProps {
  /** Server-rendered first-page results (matches the default / searchParams filters). */
  initialData?: readonly PublicTeacherLike[];
  initialMeta?: ApiMeta;
  /** Server-rendered catalog reference data (subjects / grades / locations). */
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

function FilterSelect({
  value,
  onChange,
  children,
  ariaLabel,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full appearance-none rounded-[15px] border-[0.8px] border-[#d8e5f3] bg-white px-3 pe-8 text-base font-medium text-[#354469] transition-colors hover:border-[#bcd6ef] focus:border-[#0878f8] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a99b8]" aria-hidden />
    </div>
  );
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

  useEffect(() => {
    setPage(1);
  }, [centerId]);

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
    { value: '', label: t('maxPricePlaceholder') },
    { value: '100', label: t('upToPrice', { price: lang === 'ar' ? 'ج.م 100' : 'EGP 100' }) },
    { value: '150', label: t('upToPrice', { price: lang === 'ar' ? 'ج.م 150' : 'EGP 150' }) },
    { value: '200', label: t('upToPrice', { price: lang === 'ar' ? 'ج.م 200' : 'EGP 200' }) },
    { value: '250', label: t('upToPrice', { price: lang === 'ar' ? 'ج.م 250' : 'EGP 250' }) },
    { value: '300', label: t('upToPrice', { price: lang === 'ar' ? 'ج.م 300' : 'EGP 300' }) },
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
      }),
    [page, name, subjectId, stageKey, stageGradeIds, locationId, day, maxPrice, centerId],
    {
      cacheKey: `teachers:search:${page}:${name}:${subjectId}:${stageKey}:${locationId}:${day}:${maxPrice}:${centerId}`,
      staleTTL: 30_000,
      cacheTTL: 120_000,
      initialData: Array.isArray(initialData) ? (initialData as PublicTeacher[]) : undefined,
      initialMeta,
    },
  );

  const clearFilters = () => {
    setName('');
    setSubjectId('');
    setStageKey('');
    setLocationId('');
    setDay('');
    setMaxPrice('');
    setPage(1);
  };

  return (
    <div>
      {/* Hero + stylized teachers map */}
      <MapHero teachers={data ?? []} />

      {/* Search + filters */}
      <div className="rounded-[24px] border border-[#e2ebf6] bg-white p-3 shadow-[0_10px_30px_rgba(20,73,137,0.05)] sm:p-4 dark:border-slate-700 dark:bg-slate-800">
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
            className="h-14 w-full rounded-[18px] border border-[#dbe9f7] bg-white ps-11 pe-4 text-[15px] font-medium text-[#0b1b61] placeholder:text-[#9aa8c4] transition-colors focus:border-[#0878f8] focus:outline-none sm:h-[60px] dark:border-slate-600 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
          <FilterSelect value={subjectId} onChange={(v) => { setSubjectId(v); setPage(1); }} ariaLabel={t('anySubject')}>
            <option value="">{t('anySubject')}</option>
            {(catalog?.subjects ?? []).map((s: Subject) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </FilterSelect>

          <FilterSelect value={stageKey} onChange={(v) => { setStageKey(v); setPage(1); }} ariaLabel={t('allStages')}>
            <option value="">{t('allStages')}</option>
            <option value="primary">{t('stagePrimary')}</option>
            <option value="preparatory">{t('stagePreparatory')}</option>
            <option value="secondary">{t('stageSecondary')}</option>
          </FilterSelect>

          {!centerId && (
            <FilterSelect value={locationId} onChange={(v) => { setLocationId(v); setPage(1); }} ariaLabel={t('filterArea')} className="col-span-2 sm:col-span-1">
              <option value="">{t('filterArea')}</option>
              {(catalog?.locations ?? []).map((l: Location) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </FilterSelect>
          )}

          <FilterSelect value={day} onChange={(v) => { setDay(v); setPage(1); }} ariaLabel={t('anyDay')}>
            {DAY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </FilterSelect>

          <FilterSelect value={maxPrice} onChange={(v) => { setMaxPrice(v); setPage(1); }} ariaLabel={t('maxPricePlaceholder')}>
            {PRICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </FilterSelect>

          <button
            type="button"
            onClick={clearFilters}
            className="col-span-2 inline-flex h-12 w-full items-center justify-center rounded-[15px] border-[0.8px] border-[#d6e4f4] bg-[#f6fbff] px-3 text-base font-semibold text-[#4d6281] transition-colors hover:border-[#bcd6ef] hover:text-[#0b1b61] sm:col-span-3 sm:self-center lg:col-span-1 lg:h-12 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
          >
            {t('clearFiltersShort')}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="mt-7 sm:mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[24px] font-bold text-[#0b1b61] sm:text-[28px] dark:text-white">
            {t('teachersSectionTitle')}{' '}
            <span className="text-[#0878f8] dark:text-sky-300">({meta?.total ?? 0})</span>
          </h2>
        </div>
        <p className="mt-1 text-xs text-[#6e7b98] sm:text-sm dark:text-slate-400">{t('priceNote')}</p>
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
                    {t('clearFiltersShort')}
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="mt-5 space-y-4 sm:space-y-5 xl:grid xl:grid-cols-4 xl:gap-4 xl:space-y-0">
              {data.map((teacher) => (
                <li key={teacher.id} className="xl:flex xl:min-w-0 xl:flex-col">
                  {/* Horizontal card — mobile & tablet */}
                  <div className="xl:hidden">
                    <TeacherCard teacher={teacher} />
                  </div>
                  {/* Compact card — desktop 4-per-row grid (xl+) */}
                  <div className="hidden xl:flex xl:flex-1">
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
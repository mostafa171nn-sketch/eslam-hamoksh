'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Search, Star, MapIcon, X } from 'lucide-react';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { PencilLoader } from '@/src/components/ui/PencilLoader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Pagination } from '@/src/components/ui/Pagination';
import { DateRangePicker } from '@/src/components/ui/DateRangePicker';
import { PublicNav } from '@/src/components/layout/PublicNav';
import { CenterCard } from '@/src/components/centers/CenterCard';
import { api, type PublicCenter } from '@/src/lib/api';
import type { Subject, Grade, Location, PublicTeacher } from '@/src/lib/types';
import { dayName, formatCurrency } from '@/src/lib/format';
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

interface SearchFilters {
  q: string;
  location?: string;
  subjectId?: string;
  gradeId?: string;
  date?: string;
  time?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  page: number;
}

function SearchPageInner() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<SearchFilters>({
    q: searchParams.get('q') || '',
    location: searchParams.get('location') || '',
    subjectId: searchParams.get('subject') || '',
    gradeId: searchParams.get('grade') || '',
    date: searchParams.get('date') || '',
    time: searchParams.get('time') || '',
    minPrice: undefined,
    maxPrice: undefined,
    minRating: undefined,
    page: 1,
  });
  const [debounced, setDebounced] = useState<SearchFilters>(filters);
  const [catalog, setCatalog] = useState<{ subjects: Subject[]; grades: Grade[]; locations: Location[] }>({
    subjects: [],
    grades: [],
    locations: [],
  });

  const [centerResults, setCenterResults] = useState<PublicCenter[]>([]);
  const [teacherResults, setTeacherResults] = useState<PublicTeacher[]>([]);
  const [meta, setMeta] = useState<{ total: number; totalPages: number }>({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showMapMode, setShowMapMode] = useState(false);
  const [activeCenterId, setActiveCenterId] = useState<string | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  useEffect(() => {
    search();
  }, [debounced]);

  const search = async () => {
    setLoading(true);
    setError('');
    try {
      const centerRes = await api.searchCenters({
        q: debounced.q || undefined,
        city: debounced.location || undefined,
        subject: debounced.subjectId || undefined,
        grade: debounced.gradeId || undefined,
        page: debounced.page,
        limit: 12,
      });

      const teacherRes = await api.searchTeachers({
        name: debounced.q || undefined,
        subjectId: debounced.subjectId || undefined,
        gradeId: debounced.gradeId || undefined,
        page: debounced.page,
        limit: 12,
      });

      const centers = centerRes.data?.items ?? [];
      const teachers = teacherRes.data ?? [];

      setCenterResults(centers);
      setTeacherResults(teachers);

      const totalCenters = centerRes.data?.total ?? 0;
      const totalTeachers = teachers.length;

      setMeta({
        total: totalCenters + totalTeachers,
        totalPages: centerRes.data?.totalPages ?? Math.max(1, Math.ceil((totalCenters + totalTeachers) / 12)),
      });
    } catch (err) {
      setError(t('failedLoadSearchResults'));
    } finally {
      setLoading(false);
    }
  };

  const patchFilters = (patch: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...patch, page: 1 }));
  };

  const goToPage = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const withCoords = centerResults.filter(c => c.latitude != null && c.longitude != null);

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

  const handleShowMap = () => {
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
      setShowMapMode(true);
      setFitSignal(s => s + 1);
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

  const centerListContent = (compact = false) => (
    <div className={compact ? 'flex flex-col gap-5 sm:grid-cols-2' : 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'}>
      {centerResults.map((center, i) => {
        const isActive = center.id === activeCenterId;
        return (
          <div
            key={center.id}
            ref={(el) => setCardRef(center.id, el)}
            className="min-w-0"
          >
            <CenterCard
              center={center}
              index={i}
              isActive={isActive}
              onFocus={focusCenter}
            />
          </div>
        );
      })}
    </div>
  );

  if (loading && !(centerResults.length || teacherResults.length)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <PublicNav />
        <div className="flex justify-center py-24">
          <PencilLoader label={t('loading')} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <PublicNav />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          <Button onClick={() => patchFilters({ q: '' })} className="mt-4 inline-block">
            {t('tryAgain')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PublicNav />

      {/* Search Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('searchResults')}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t('searchDescription')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Input
                value={filters.q}
                onChange={(e) => patchFilters({ q: e.target.value })}
                placeholder={t('searchByName')}
                className="max-w-xs w-full md:w-48"
              />
              <Button variant="primary" size="sm" onClick={search}>
                {t('search')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Filters */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Input
              value={filters.location}
              onChange={(e) => patchFilters({ location: e.target.value })}
              placeholder={t('city')}
            />
            <Select
              options={catalog.subjects.map(s => ({ value: s.id, label: s.name }))}
              value={filters.subjectId}
              onChange={(e) => patchFilters({ subjectId: e.target.value })}
              placeholder={t('anySubject')}
            />
            <Select
              options={catalog.grades.map(g => ({ value: g.id, label: g.name }))}
              value={filters.gradeId}
              onChange={(e) => patchFilters({ gradeId: e.target.value })}
              placeholder={t('anyGrade')}
            />
            <DateRangePicker
              value={filters.date ? { startDate: filters.date, endDate: null } : undefined}
              onChange={(value) => {
                if (value.startDate) {
                  patchFilters({ date: value.startDate });
                } else {
                  patchFilters({ date: '' });
                }
              }}
              placeholder={t('anyDay')}
            />
            <Input
              type="number"
              value={String(filters.minPrice ?? '')}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                patchFilters({ minPrice: isNaN(val) ? undefined : val });
              }}
              placeholder={t('hourlyRate')}
            />
            <Input
              type="number"
              value={String(filters.maxPrice ?? '')}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                patchFilters({ maxPrice: isNaN(val) ? undefined : val });
              }}
              placeholder={t('maxHourlyRate')}
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {centerResults.length === 0 && teacherResults.length === 0 ? (
          <div className="text-center py-12">
            <EmptyState
              icon={Search}
              title={t('noResults')}
              description={t('noTeachersMatch')}
              action={
                <Button variant="outline" onClick={() => patchFilters({ q: '' })}>
                  {t('clearFilters')}
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {(centerResults.length + teacherResults.length)} {t('teachersFound')}
              </p>
              <div className="flex items-center gap-3">
                {centerResults.length > 0 && (
                  <Button variant="primary" size="sm" onClick={handleShowMap}>
                    <MapIcon className="h-4 w-4" /> {t('showOnMap')}
                  </Button>
                )}
                <Pagination
                  page={debounced.page}
                  totalPages={meta.totalPages}
                  onChange={goToPage}
                />
              </div>
            </div>

            <div className="grid gap-6">
              {/* Centers Section — with small map preview on left (LTR) / right (RTL) */}
              <div>
                <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                  {t('centers')} ({centerResults.length})
                </h2>
                {centerResults.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('noCenters')}</p>
                ) : (
                  <>
                    {/* Desktop: map preview on the left, cards on the right */}
                    {!showMapMode && (
                    <div className="hidden lg:grid lg:grid-cols-[340px_1fr] lg:gap-6">
                      {/* Small map preview */}
                      <div className="flex flex-col gap-3">
                        <div className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700">
                          {withCoords.length > 0 ? (
                            <CenterMap
                              centers={withCoords}
                              focusCenterId={activeCenterId}
                              onFocusCenter={focusCenter}
                              fitSignal={fitSignal}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              {t('noCenterLocations')}
                            </div>
                          )}
                        </div>
                        <Button variant="primary" size="sm" onClick={handleShowMap} className="w-full">
                          <MapIcon className="h-4 w-4" /> {t('showOnMap')}
                        </Button>
                      </div>
                      {/* Cards grid */}
                      <div>{centerListContent(true)}</div>
                    </div>
                    )}

                    {/* Mobile: cards + compact map preview */}
                    <div className="lg:hidden">
                      {/* Compact map preview */}
                      {!mobileMapOpen && withCoords.length > 0 && (
                        <div className="mb-4">
                          <div className="relative h-[200px] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700">
                            <CenterMap
                              centers={withCoords}
                              focusCenterId={activeCenterId}
                              onFocusCenter={focusCenter}
                              fitSignal={fitSignal}
                            />
                          </div>
                          <Button variant="primary" size="sm" onClick={handleShowMap} className="mt-3 w-full">
                            <MapIcon className="h-4 w-4" /> {t('showOnMap')}
                          </Button>
                        </div>
                      )}
                      {centerListContent(false)}
                    </div>
                  </>
                )}
              </div>

              {/* Teachers Section */}
              <div>
                <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                  {t('teachers')} ({teacherResults.length})
                </h2>
                {teacherResults.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('noTeachersMatch')}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {teacherResults.map(teacher => (
                      <Link key={teacher.id} href={`/teachers/${teacher.id}`} className="group">
                        <Card bodyClassName="p-5 transition group-hover:border-brand-300 group-hover:shadow dark:group-hover:border-brand-500/50">
                          <div className="flex items-start gap-4">
                            {teacher.photo ? (
                              <img src={teacher.photo} alt={teacher.fullName} className="h-12 w-12 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white text-lg font-semibold">
                                {teacher.fullName.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-brand-700 dark:text-white">
                                {teacher.fullName}
                              </p>
                              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                <span className="font-medium text-slate-700 dark:text-slate-200">{teacher.rating.toFixed(1)}</span>
                                <span>({teacher.ratingCount})</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1">
                            {teacher.subjects.slice(0, 3).map(subject => (
                              <Badge key={subject.id} tone="blue">{subject.name}</Badge>
                            ))}
                            {teacher.subjects.length > 3 && <Badge tone="slate">+{teacher.subjects.length - 3}</Badge>}
                          </div>
                          <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <p>{formatCurrency(teacher.hourlyRate)} {t('perHour')} · {teacher.yearsExperience} {t('yrsExp')}</p>
                            <p>
                              {teacher.location ? teacher.location.name : t('anyBranch')} ·{' '}
                              {teacher.availability.length > 0
                                ? teacher.availability
                                    .slice(0, 2)
                                    .map((a) => dayName(a.day))
                                    .join(', ')
                                : t('noSetSchedule')}
                            </p>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Pagination Bottom */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {(centerResults.length + teacherResults.length)} {t('teachersFound')}
          </p>
          <Pagination
            page={debounced.page}
            totalPages={meta.totalPages}
            onChange={goToPage}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          DESKTOP: Full map mode (split layout — list + map)
          ══════════════════════════════════════════════════════════════ */}
      {showMapMode && (
        <div className="fixed inset-0 z-50 hidden flex-col bg-white dark:bg-slate-900 lg:flex">
          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{t('searchResults')}</span>
            <Button variant="outline" size="sm" onClick={handleCloseMap}>
              <X className="h-4 w-4" /> {t('closeMap')}
            </Button>
          </div>
          {/* Split content */}
          <div className="flex min-h-0 flex-1">
            {/* Left: scrollable center list */}
            <div className="ecms-centers-list flex w-[420px] shrink-0 flex-col overflow-y-auto border-e border-slate-200 px-4 py-4 dark:border-slate-700">
              <p className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                {centerResults.length} {t('centers')} · {teacherResults.length} {t('teachers')}
              </p>
              <div className="flex flex-col gap-4">
                {centerResults.map((center, i) => {
                  const isActive = center.id === activeCenterId;
                  return (
                    <div
                      key={center.id}
                      ref={(el) => setCardRef(center.id, el)}
                      className="min-w-0"
                    >
                      <CenterCard
                        center={center}
                        index={i}
                        isActive={isActive}
                        onFocus={focusCenter}
                      />
                    </div>
                  );
                })}
              </div>
              {teacherResults.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                    {t('teachers')} ({teacherResults.length})
                  </h3>
                  <div className="flex flex-col gap-3">
                    {teacherResults.map(teacher => (
                      <Link key={teacher.id} href={`/teachers/${teacher.id}`} className="group">
                        <Card bodyClassName="p-4 transition group-hover:border-brand-300 group-hover:shadow dark:group-hover:border-brand-500/50">
                          <div className="flex items-start gap-3">
                            {teacher.photo ? (
                              <img src={teacher.photo} alt={teacher.fullName} className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white text-sm font-semibold">
                                {teacher.fullName.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-brand-700 dark:text-white">
                                {teacher.fullName}
                              </p>
                              <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span className="font-medium text-slate-700 dark:text-slate-200">{teacher.rating.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Right: map */}
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

      {/* ══════════════════════════════════════════════════════════════
          MOBILE: Full map overlay
          ══════════════════════════════════════════════════════════════ */}
      {mobileMapOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{t('searchResults')}</span>
            <Button variant="outline" size="sm" onClick={handleCloseMobileMap}>
              <X className="h-4 w-4" /> {t('closeMap')}
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-[1.15]">
              <CenterMap
                centers={withCoords}
                focusCenterId={activeCenterId}
                onFocusCenter={focusCenter}
                fitSignal={fitSignal}
              />
            </div>
            <div className="ecms-centers-list min-h-0 flex-1 shrink overflow-y-auto border-t border-slate-200 dark:border-slate-700">
              <div className="flex flex-col gap-4 px-4 py-4">
                {centerResults.map((center, i) => {
                  const isActive = center.id === activeCenterId;
                  return (
                    <div
                      key={center.id}
                      ref={(el) => setCardRef(center.id, el)}
                      className="min-w-0"
                    >
                      <CenterCard
                        center={center}
                        index={i}
                        isActive={isActive}
                        onFocus={focusCenter}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-900" />}>
      <SearchPageInner />
    </Suspense>
  );
}

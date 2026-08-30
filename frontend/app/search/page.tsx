'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, MapPin, Star } from 'lucide-react';
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
import { api, type PublicCenter } from '@/src/lib/api';
import type { Subject, Grade, Location, PublicTeacher } from '@/src/lib/types';
import { dayName, formatCurrency } from '@/src/lib/format';
import { useT } from '@/src/i18n';

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

  useEffect(() => {
    // Debounce search
    const id = window.setTimeout(() => setDebounced(filters), 300);
    return () => window.clearTimeout(id);
  }, [filters]);

  useEffect(() => {
    // Load catalog data
    Promise.all([
      api.get<Subject[]>('/catalog/subjects'),
      api.get<Grade[]>('/catalog/grades'),
      api.get<Location[]>('/catalog/locations'),
    ]).then(([subjects, grades, locations]) => {
      setCatalog({ subjects: subjects.data ?? [], grades: grades.data ?? [], locations: locations.data ?? [] });
    });
  }, []);

  useEffect(() => {
    if (debounced.page <= 1) setDebounced(prev => ({ ...prev, page: 1 }));
    search();
  }, [debounced]);

  const search = async () => {
    setLoading(true);
    setError('');
    try {
      // Search centers
      const centerRes = await api.searchCenters({
        q: debounced.q || undefined,
        city: debounced.location || undefined,
        subject: debounced.subjectId || undefined,
        grade: debounced.gradeId || undefined,
        page: debounced.page,
        limit: 12,
      });

      // Search teachers
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
      
      // Calculate total and pages based on available results
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
              <Pagination
                page={debounced.page}
                totalPages={meta.totalPages}
                onChange={(page) => patchFilters({ page })}
              />
            </div>

            <div className="grid gap-6">
              {/* Centers Section */}
              <div>
                <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                  {t('centers')} ({centerResults.length})
                </h2>
                {centerResults.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('noCenters')}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {centerResults.map(center => (
                      <Link key={center.id} href={`/centers/${center.id}`} className="group">
                        <Card bodyClassName="p-5 transition group-hover:border-brand-300 group-hover:shadow dark:group-hover:border-brand-500/50">
                          <div className="flex items-start gap-4">
                            {center.photoUrl ? (
                              <img src={center.photoUrl} alt={center.name} className="h-16 w-16 rounded-xl object-cover" />
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-50 text-xl font-bold text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                                {center.name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base font-semibold text-slate-900 group-hover:text-brand-700 dark:text-white">
                                {center.name}
                              </h3>
                              {center.city && (
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                  <MapPin className="h-3.5 w-3.5" /> {center.city}
                                </p>
                              )}
                              {(center.ratingCount ?? 0) > 0 && (
                                <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                  {(center.ratingAverage ?? 0).toFixed(1)}
                                  <span className="text-slate-400 dark:text-slate-500">({center.ratingCount})</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1">
                            {center.subjects.slice(0, 3).map(subject => (
                              <Badge key={subject.id} tone="blue">{subject.name}</Badge>
                            ))}
                            {center.subjects.length > 3 && <Badge tone="slate">+{center.subjects.length - 3}</Badge>}
                          </div>
                          <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <p>{center.teacherCount} {t('teachers')}</p>
                            <p>{center.studentCount} {t('studentsCount')}</p>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
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
            onChange={(page) => patchFilters({ page })}
          />
        </div>
      </div>
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
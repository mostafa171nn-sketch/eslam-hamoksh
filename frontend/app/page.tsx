'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, MapPin, CalendarDays, Users, GraduationCap, ArrowRight, Shield, Clock, Sparkles } from 'lucide-react';
import { PublicNav } from '@/src/components/layout/PublicNav';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';
import { Button } from '@/src/components/ui/Button';
import { PencilLoader } from '@/src/components/ui/PencilLoader';
import { DatePicker } from '@/src/components/ui/DatePicker';
import { useApi } from '@/src/hooks/useApi';
import { api } from '@/src/lib/api';
import type { Subject, Grade, Location } from '@/src/lib/types';
import { useT } from '@/src/i18n';

const CenterMap = dynamic(() => import('@/src/components/centers/CenterMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <TinyLoader />
    </div>
  ),
});

function TinyLoader() {
  const { t } = useT();
  return <>{t('loadingMap')}</>;
}

export default function HomePage() {
  const { t } = useT();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [catalog, setCatalog] = useState<{ subjects: Subject[]; grades: Grade[]; locations: Location[] }>({
    subjects: [],
    grades: [],
    locations: [],
  });

  useEffect(() => {
    Promise.all([
      api.get<Subject[]>('/catalog/subjects'),
      api.get<Grade[]>('/catalog/grades'),
      api.get<Location[]>('/catalog/locations'),
    ]).then(([subjects, grades, locations]) => {
      setCatalog({
        subjects: subjects.data ?? [],
        grades: grades.data ?? [],
        locations: locations.data ?? [],
      });
    });
  }, []);

  const [activeCenterId, setActiveCenterId] = useState<string | null>(null);

  const { data: centers, loading } = useApi(
    () => api.searchCenters({ limit: 20 }),
    [],
  );

  const featuredCenters = centers?.items ?? [];

  const focusCenter = useCallback((id: string) => {
    setActiveCenterId(id);
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedLocation) params.set('location', selectedLocation);
    if (selectedSubject) params.set('subject', selectedSubject);
    if (selectedDate) params.set('date', selectedDate);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PublicNav />

      {/* Hero Section — THE ASCENT */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 dark:from-brand-800 dark:via-brand-900 dark:to-surface-950">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>
        {/* Gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gold-400/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-brand-300/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-brand-100 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-gold-400" />
              {t('authTaglineBadge')}
            </div>

            {/* Heading */}
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {t('findTeacher')}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-100 sm:text-xl">
              {t('heroSubtitle')}
            </p>
          </div>

          {/* Search Bar */}
          <div className="mx-auto mt-10 max-w-4xl">
            <div className="rounded-2xl border border-white/20 bg-white/95 p-4 shadow-2xl backdrop-blur-sm sm:p-6 dark:bg-surface-800/95 dark:border-surface-700/50">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <div className="lg:col-span-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchForTeachersCenters')}
                    className="w-full"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Select
                  options={catalog.locations.map(l => ({ value: l.id, label: l.name }))}
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  placeholder={t('anyBranch')}
                />
                <Select
                  options={catalog.subjects.map(s => ({ value: s.id, label: s.name }))}
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  placeholder={t('anySubject')}
                />
                <DatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  placeholder={t('selectDate')}
                  minDate={new Date()}
                />
                <Button
                  size="lg"
                  className="lg:col-span-1"
                  onClick={handleSearch}
                >
                  <Search className="h-4 w-4" />
                  {t('search')}
                </Button>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-brand-200/80">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>{t('authTaglineTitle')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{t('heroSubtitle')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Centers + Map */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('centers')}
          </h2>
          <Link href="/centers" className="group inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
            {t('viewAll')} {t('centers')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: list of centers */}
          <div className="order-2 lg:order-1 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pr-2 lg:[scrollbar-width:thin]">
            {loading ? (
              <div className="flex justify-center py-16">
                <PencilLoader />
              </div>
            ) : featuredCenters.length === 0 ? (
              <div className="flex justify-center py-16 text-sm text-slate-500 dark:text-slate-400">{t('noCentersYet')}</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 lg:gap-3">
                {featuredCenters.map((center) => {
                  const hasCoords = center.latitude != null && center.longitude != null;
                  const active = center.id === activeCenterId;
                  return (
                    <button
                      key={center.id}
                      type="button"
                      onClick={() => focusCenter(center.id)}
                      className={`group rounded-xl border bg-white p-4 text-start transition-all duration-200 dark:bg-slate-800 ${
                        active
                          ? 'border-brand-400 shadow-brand ring-2 ring-brand-400/30 dark:border-brand-500'
                          : 'border-slate-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-elevated dark:border-slate-700 dark:hover:border-brand-500/60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {center.photoUrl ? (
                          <img src={center.photoUrl} alt={center.name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg font-bold text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                            {center.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold text-slate-900 group-hover:text-brand-700 dark:text-white">
                            {center.name}
                          </h3>
                          {center.city && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <MapPin className="h-3.5 w-3.5" /> {center.city}
                            </p>
                          )}
                          {(center.ratingCount ?? 0) > 0 && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <span className="text-amber-400">★</span>
                              {(center.ratingAverage ?? 0).toFixed(1)}
                              <span className="text-slate-400">({center.ratingCount})</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {center.studentCount}</span>
                          <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {center.teacherCount}</span>
                        </div>
                        {hasCoords ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                            <MapPin className="h-3 w-3" /> {t('onMap')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                            {t('noLocation')}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: large map */}
          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-24 h-[420px] lg:h-[calc(100vh-12rem)]">
              <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700">
                <CenterMap centers={featuredCenters} focusCenterId={activeCenterId} onFocusCenter={focusCenter} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works — THE ASCENT */}
      <section className="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="mb-12 text-2xl font-bold text-slate-900 dark:text-white text-center">
            {t('howItWorks')}
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300">
                <Search className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-slate-900 dark:text-white">{t('search')}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t('howItWorksSearchSub')}
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-100 text-gold-600 dark:bg-gold-900/50 dark:text-gold-300">
                <CalendarDays className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-slate-900 dark:text-white">{t('howItWorksSelectDate')}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t('howItWorksSelectDateSub')}
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300">
                <GraduationCap className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-slate-900 dark:text-white">{t('howItWorksBookLearn')}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t('howItWorksBookLearnSub')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

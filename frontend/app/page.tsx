'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  ShieldCheck,
  CalendarClock,
  LineChart,
  Layers,
  BookOpen,
  ScanLine,
  BarChart3,
  TrendingUp,
  GraduationCap,
} from 'lucide-react';
import { PublicNav } from '@/src/components/layout/PublicNav';
import { api } from '@/src/lib/api';
import type { Subject, Grade, Location } from '@/src/lib/types';
import { useT } from '@/src/i18n';
import CenterSearchSection from '@/src/components/centers/CenterSearchSection';
import {
  AscentScene,
  SearchIllustration,
  CalendarIllustration,
  LearnIllustration,
  ProgressIllustration,
} from '@/src/components/illustrations/EducationArt';

const WHY = [
  { icon: ShieldCheck, key: 'homeWhyVerified', tint: 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' },
  { icon: CalendarClock, key: 'homeWhyFlexible', tint: 'bg-gold-100 text-gold-600 dark:bg-gold-500/15 dark:text-gold-300' },
  { icon: LineChart, key: 'homeWhyProgress', tint: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
  { icon: Layers, key: 'homeWhyAllInOne', tint: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300' },
] as const;

export default function HomePage() {
  const { t } = useT();
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PublicNav />

      {/* Hero — THE ASCENT */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 dark:from-brand-800 dark:via-brand-900 dark:to-surface-950">
        <div className="absolute inset-0 opacity-[0.035]">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '36px 36px' }} />
        </div>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-28 -end-28 h-96 w-96 rounded-full bg-gold-400/15 blur-3xl" />
          <div className="absolute -bottom-32 -start-32 h-[28rem] w-[28rem] rounded-full bg-brand-400/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-28">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Left: message */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-brand-100 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-gold-400" />
                {t('authTaglineBadge')}
              </div>

              <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
                {t('findTeacher')}
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-brand-100/90 sm:text-xl">
                {t('heroSubtitle')}
              </p>

              {/* CTA buttons */}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xl press-effect"
                >
                  {t('search')}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
              </div>

              {/* Trust badges */}
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-brand-200/85">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gold-400" />
                  <span>{t('homeWhyVerifiedTitle')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gold-400" />
                  <span>{t('homeWhyFlexibleTitle')}</span>
                </div>
              </div>
            </div>

            {/* Right: illustration scene */}
            <div className="relative mx-auto w-full max-w-[520px]">
              {/* Slanted floor glow */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 rounded-full bg-white/10 blur-3xl" />
              <AscentScene className="relative w-full animate-fade-in-up" />

              {/* Floating feature chips */}
              <div className="animate-float-soft absolute start-2 top-10 hidden items-center gap-2 rounded-xl border border-white/40 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 shadow-elevated-lg backdrop-blur-md sm:flex dark:border-white/10 dark:bg-surface-800/90 dark:text-white" style={{ animationDelay: '0.4s' }}>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                  <BookOpen className="h-4 w-4" />
                </span>
                {t('heroChipLessons')}
              </div>

              <div className="animate-float-soft-slow absolute end-4 top-1/3 hidden items-center gap-2 rounded-xl border border-white/40 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 shadow-elevated-lg backdrop-blur-md sm:flex dark:border-white/10 dark:bg-surface-800/90 dark:text-white" style={{ animationDelay: '1s' }}>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <ScanLine className="h-4 w-4" />
                </span>
                {t('heroChipLive')}
              </div>

              <div className="animate-float-soft absolute bottom-8 end-8 hidden items-center gap-2 rounded-xl border border-white/40 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 shadow-elevated-lg backdrop-blur-md sm:flex dark:border-white/10 dark:bg-surface-800/90 dark:text-white" style={{ animationDelay: '1.6s' }}>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-100 text-gold-600 dark:bg-gold-500/20 dark:text-gold-300">
                  <BarChart3 className="h-4 w-4" />
                </span>
                {t('heroChipResults')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Maarej — features */}
      <section className="border-b border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">{t('authTaglineBadge')}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">{t('homeWhyTitle')}</h2>
            <p className="mt-3 text-lg leading-relaxed text-slate-500 dark:text-slate-400">{t('homeWhySub')}</p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map(({ icon: Icon, key, tint }, i) => (
              <div
                key={key}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-elevated-lg hover:bg-white dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-brand-500/40 dark:hover:bg-slate-800"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="absolute -end-10 -top-10 h-24 w-24 rounded-full bg-current opacity-[0.04] transition-transform duration-300 group-hover:scale-150" aria-hidden />
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${tint}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{t(`${key}Title`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t(`${key}Sub`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Centers + Search Section — integrated landing page experience */}
      <CenterSearchSection />

      {/* How It Works — THE ASCENT steps */}
      <section className="relative overflow-hidden border-y border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="absolute inset-0 opacity-[0.03]" aria-hidden>
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #4f46e5 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">{t('howItWorks')}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">{t('homeProgressTitle')}</h2>
            <p className="mt-3 text-lg leading-relaxed text-slate-500 dark:text-slate-400">{t('homeProgressSub')}</p>
          </div>

          <div className="relative mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6">
            {/* Connector line (desktop) */}
            <div className="absolute left-1/2 top-10 hidden w-3/4 -translate-x-1/2 sm:block" aria-hidden>
              <svg viewBox="0 0 600 4" className="w-full" preserveAspectRatio="none">
                <line x1="0" y1="2" x2="600" y2="2" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 12" />
              </svg>
            </div>

            <div className="relative flex flex-col items-center text-center">
              <div className="relative">
                <SearchIllustration className="h-28 w-28" />
                <span className="absolute -end-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-brand">
                  1
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{t('search')}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {t('howItWorksSearchSub')}
              </p>
            </div>

            <div className="relative flex flex-col items-center text-center">
              <div className="relative">
                <CalendarIllustration className="h-28 w-28" />
                <span className="absolute -end-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-white shadow-gold">
                  2
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{t('howItWorksSelectDate')}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {t('howItWorksSelectDateSub')}
              </p>
            </div>

            <div className="relative flex flex-col items-center text-center">
              <div className="relative">
                <LearnIllustration className="h-28 w-28" />
                <span className="absolute -end-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-white">
                  3
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{t('howItWorksBookLearn')}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {t('howItWorksBookLearnSub')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Subjects band */}
      {catalog.subjects.length > 0 && (
        <section className="bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 dark:from-brand-900 dark:via-brand-950 dark:to-surface-950">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-wider text-gold-400">{t('homeSubjectsTitle')}</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">{t('homeSubjectsTitle')}</h2>
                <p className="mt-3 text-lg leading-relaxed text-brand-100/90">{t('homeSubjectsSub')}</p>
              </div>

              <div className="flex w-full max-w-2xl flex-wrap justify-start gap-2.5 lg:justify-end">
                {catalog.subjects.slice(0, 8).map((s) => (
                  <Link
                    key={s.id}
                    href={`/search?subject=${encodeURIComponent(s.id)}`}
                    className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all duration-150 hover:border-gold-400/60 hover:bg-white/15"
                  >
                    <BookOpen className="h-4 w-4 text-gold-300" />
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Teachers band + CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              <GraduationCap className="h-4 w-4" />
              {t('teachersNav')}
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">{t('homeTeachersTitle')}</h2>
            <p className="mt-3 max-w-xl text-lg leading-relaxed text-slate-500 dark:text-slate-400">{t('homeTeachersSub')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/teachers"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-brand transition-all duration-150 hover:bg-brand-700 hover:shadow-brand-lg press-effect"
              >
                {t('homeBrowseTeachers')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
              <Link
                href="/centers"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-150 hover:border-brand-300 hover:text-brand-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-500/60 dark:hover:text-brand-300"
              >
                {t('homeExploreCenters')}
              </Link>
            </div>
          </div>

          <div className="relative">
            <ProgressIllustration className="mx-auto w-full max-w-sm" />
          </div>
        </div>
      </section>

      {/* Final CTA band */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-14 text-center shadow-elevated-lg sm:px-12 sm:py-16 dark:from-brand-800 dark:via-brand-900 dark:to-surface-950">
          <div className="absolute inset-0 opacity-[0.04]" aria-hidden>
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
          </div>
          <div className="absolute -top-16 -end-16 h-48 w-48 rounded-full bg-gold-400/20 blur-2xl" />
          <div className="absolute -bottom-16 -start-16 h-48 w-48 rounded-full bg-brand-300/20 blur-2xl" />

          <div className="relative">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <TrendingUp className="h-7 w-7 text-gold-400" />
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('homeCtaTitle')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-brand-100/90">{t('homeCtaSub')}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-700 shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xl press-effect"
              >
                {t('homeCtaPrimary')}
              </Link>
              <Link
                href="/centers"
                className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-150 hover:bg-white/20 press-effect"
              >
                {t('homeCtaSecondary')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

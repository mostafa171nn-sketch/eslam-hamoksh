'use client';

import { memo, useState, type FormEvent, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Sparkles,
  Search,
  GraduationCap,
  Building2,
  BookOpen,
  School,
  BadgeCheck,
  DoorOpen,
  CalendarClock,
  LineChart,
  Star,
  TrendingUp,
} from 'lucide-react';
import { PublicNav } from '@/src/components/layout/PublicNav';
import { Avatar } from '@/src/components/ui/Avatar';
import { PencilLoader } from '@/src/components/ui/PencilLoader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { useApi } from '@/src/hooks/useApi';
import { api } from '@/src/lib/api';
import type { PublicCenter, SearchCentersResult } from '@/src/lib/api';
import type { PublicTeacher } from '@/src/lib/types';
import { formatCurrency } from '@/src/lib/format';
import { useT } from '@/src/i18n';
import { useAuth } from '@/src/context/AuthContext';
import { AscentScene } from '@/src/components/illustrations/EducationArt';

export interface HomeViewProps {
  initialTeachers?: PublicTeacher[];
  initialCentersResult?: SearchCentersResult | null;
}

function SectionHeader({ title, sub, href, viewAll }: { title: string; sub: string; href: string; viewAll: string }) {
  const { t } = useT();
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1b61] sm:text-[1.7rem] dark:text-white">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{sub}</p>
      </div>
      <Link
        href={href}
        className="group inline-flex shrink-0 items-center gap-1.5 rounded-[13px] border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#0878f8] transition-colors hover:border-[#0878f8]/40 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-300 dark:hover:border-sky-500/40 dark:hover:bg-slate-700"
      >
        {viewAll || t('viewAll')}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 rtl:rotate-180" />
      </Link>
    </div>
  );
}

const MiniTeacherCard = memo(function MiniTeacherCard({ teacher }: { teacher: PublicTeacher }) {
  const { t } = useT();
  const { user } = useAuth();
  const router = useRouter();
  const subjects = teacher.subjects ?? [];
  const grades = teacher.grades ?? [];
  const meta = [
    subjects.slice(0, 3).map((s) => s.name).join(' · '),
    teacher.location?.name,
  ]
    .filter(Boolean)
    .join(' · ');
  const visibleGrades = grades.slice(0, 3);
  const price = `${formatCurrency(teacher.hourlyRate)} ${t('perSession')}`;

  const handleBookNow = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const profilePath = `/teachers/${teacher.id}`;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`${profilePath}?book=1`)}`);
    } else if (user.role === 'STUDENT') {
      router.push(`${profilePath}?book=1`);
    } else {
      router.push(profilePath);
    }
  };

  return (
    <article className="group flex h-full flex-col rounded-[22px] border border-slate-200/70 bg-white p-4 shadow-[0_2px_10px_rgba(20,73,137,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(20,73,137,0.14)] dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-3">
        <Avatar name={teacher.fullName} src={teacher.photo} size="lg" />
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold text-[#0b1b61] dark:text-white">
            <Link href={`/teachers/${teacher.id}`} className="transition-colors hover:text-[#0878f8] dark:hover:text-sky-300">
              {teacher.fullName}
            </Link>
          </h3>
          {meta && <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{meta}</p>}
        </div>
      </div>

      {visibleGrades.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {visibleGrades.map((g) => (
            <span key={g.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {g.name}
            </span>
          ))}
          {grades.length > 3 && (
            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              +{grades.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-1 items-end justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
        <span className="flex items-baseline gap-1">
          <Star className="h-3.5 w-3.5 translate-y-0.5 fill-amber-400 text-amber-400" />
          <span className="text-[15px] font-extrabold leading-none text-[#0b1b61] dark:text-white">{teacher.rating.toFixed(1)}</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">({teacher.ratingCount})</span>
        </span>
        <span className="flex flex-col items-end gap-1.5">
          <span className="text-[11px] font-bold leading-none text-[#0b1b61] dark:text-white">{price}</span>
          <button
            type="button"
            onClick={handleBookNow}
            aria-label={`${t('bookNow')} — ${teacher.fullName}`}
            className="inline-flex min-h-[38px] items-center justify-center rounded-[13px] bg-gradient-to-br from-[#1499ff] to-[#0878f8] px-4 py-2 text-xs font-bold text-white shadow-[0_6px_16px_rgba(8,120,248,0.35)] transition-all duration-150 hover:brightness-110 hover:shadow-[0_8px_20px_rgba(8,120,248,0.45)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0878f8] dark:shadow-[0_6px_16px_rgba(20,100,255,0.25)]"
          >
            {t('bookNow')}
          </button>
        </span>
      </div>
    </article>
  );
});

const MiniCenterCard = memo(function MiniCenterCard({ center }: { center: PublicCenter }) {
  const { t } = useT();
  const meta = [
    center.city ?? null,
    center.teacherCount != null ? `${center.teacherCount} ${t('teachersLabel')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const subjects = center.subjects ?? [];
  const chips = subjects.slice(0, 3);
  const overflow = subjects.length - chips.length;
  const rating = center.ratingAverage ?? 0;
  const ratingCount = center.ratingCount ?? 0;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-slate-200/70 bg-white shadow-[0_2px_10px_rgba(20,73,137,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(20,73,137,0.14)] dark:border-slate-700 dark:bg-slate-800">
      <Link href={`/centers/${center.id}`} className="relative block aspect-[16/10] overflow-hidden rounded-t-[22px] bg-slate-100 dark:bg-slate-700">
        {center.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={center.photoUrl} alt={center.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1499ff] to-[#0878f8]">
            <span className="text-4xl font-extrabold tracking-tight text-white/95">{center.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-[15px] font-bold text-[#0b1b61] dark:text-white">
          <Link href={`/centers/${center.id}`} className="transition-colors hover:text-[#0878f8] dark:hover:text-sky-300">
            {center.name}
          </Link>
        </h3>
        {meta && <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{meta}</p>}

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {chips.map((s) => (
              <span key={s.id} className="rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-[#0878f8] dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
                {s.name}
              </span>
            ))}
            {overflow > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                +{overflow}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-1 items-end justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
          <span className="flex items-baseline gap-1">
            <Star className="h-3.5 w-3.5 translate-y-0.5 fill-amber-400 text-amber-400" />
            <span className="text-[15px] font-extrabold leading-none text-[#0b1b61] dark:text-white">{rating.toFixed(1)}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">({ratingCount})</span>
          </span>
          <Link
            href={`/centers/${center.id}`}
            className="text-right text-xs font-bold text-[#0878f8] transition-colors hover:text-[#0656c4] dark:text-sky-300 dark:hover:text-sky-200"
          >
            {t('viewCenter')}
          </Link>
        </div>
      </div>
    </article>
  );
});

const TRUST = [
  { icon: BadgeCheck, key: 'homeTrustVerified', tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' },
  { icon: DoorOpen, key: 'homeTrustRooms', tint: 'bg-sky-50 text-[#0878f8] dark:bg-sky-500/10 dark:text-sky-300' },
  { icon: CalendarClock, key: 'homeTrustTime', tint: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300' },
  { icon: LineChart, key: 'homeTrustFollow', tint: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300' },
] as const;

export default function HomeView({ initialTeachers, initialCentersResult }: HomeViewProps) {
  const { t } = useT();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const { data: teachers, initialLoading: teachersLoading, error: teachersError } = useApi(
    () => api.searchTeachers({ page: 1, limit: 8 }),
    [],
    { cacheKey: 'teachers:home', staleTTL: 60_000, cacheTTL: 300_000, initialData: initialTeachers },
  );
  const { data: centersResult, initialLoading: centersLoading, error: centersError } = useApi(
    () => api.searchCenters({ page: 1, limit: 4 }),
    [],
    { cacheKey: 'centers:home', staleTTL: 60_000, cacheTTL: 300_000, initialData: initialCentersResult ?? undefined },
  );

  const centers = centersResult?.items ?? [];

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/teachers?q=${encodeURIComponent(q)}` : '/teachers');
  };

  return (
    <main className="min-h-screen bg-[#f7fbff] dark:bg-slate-900">
      <PublicNav />

      {/* Hero — marketplace reference */}
      <section className="px-4 pt-5 sm:px-6">
        <div className="relative mx-auto w-full max-w-[1180px] overflow-hidden rounded-[30px] bg-gradient-to-br from-[#e9f5ff] via-white to-[#fceffc] shadow-[0_18px_60px_rgba(20,73,137,0.12)] sm:rounded-[38px] dark:from-[#0f2557] dark:via-[#0a1b42] dark:to-[#1e1b4b] dark:shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <div className="absolute -top-20 -end-20 h-64 w-64 rounded-full bg-[#1499ff]/15 blur-3xl dark:bg-sky-400/10" aria-hidden />
          <div className="absolute -bottom-24 -start-16 h-64 w-64 rounded-full bg-[#0878f8]/10 blur-3xl dark:bg-sky-500/10" aria-hidden />
          <div className="absolute -start-10 top-1/3 h-32 w-32 rounded-full bg-gold-300/25 blur-3xl dark:bg-gold-400/10" aria-hidden />

          <div className="relative grid grid-cols-1 items-center gap-8 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:px-14 lg:py-16">
            {/* Copy */}
            <div className="text-center lg:text-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/70 px-4 py-1.5 text-xs font-semibold text-[#0878f8] backdrop-blur-sm sm:text-sm dark:border-sky-400/20 dark:bg-white/5 dark:text-sky-300">
                <Sparkles className="h-4 w-4 text-amber-400" />
                {t('homeEyebrow')}
              </div>

              <h1 className="mt-5 text-[1.8rem] font-extrabold leading-[1.28] tracking-tight text-[#0b1b61] sm:text-4xl lg:text-[2.6rem] dark:text-white">
                {t('homeHeroTitlePre')}{' '}
                <span className="text-[#0878f8] dark:text-sky-300">{t('homeHeroTitleHighlight')}</span>{' '}
                {t('homeHeroTitlePost')}
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-500 lg:mx-0 sm:text-lg dark:text-slate-400">
                {t('homeHeroSub')}
              </p>

              <form
                onSubmit={submitSearch}
                className="mx-auto mt-7 flex max-w-xl flex-col gap-2 rounded-[18px] border border-white/70 bg-white p-2 shadow-[0_18px_50px_rgba(20,73,137,0.16)] sm:flex-row sm:items-center lg:mx-0 dark:border-slate-700 dark:bg-slate-800"
              >
                <label className="flex flex-1 items-center gap-2 rounded-[13px] px-3 py-2.5" htmlFor="home-search">
                  <Search className="h-5 w-5 shrink-0 text-[#0878f8] dark:text-sky-300" />
                  <input
                    id="home-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('homeHeroSearchPlaceholder')}
                    className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-[13px] bg-gradient-to-br from-[#1499ff] to-[#0878f8] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(8,120,248,0.4)] transition-all duration-150 hover:shadow-[0_10px_26px_rgba(8,120,248,0.5)]"
                >
                  {t('homeHeroSearchButton')}
                </button>
              </form>
            </div>

            {/* Visual */}
            <div className="relative mx-auto w-full max-w-[420px] lg:max-w-none">
              <div className="rotate-2 rounded-[28px] border-[6px] border-white bg-white/60 p-2 shadow-[0_24px_60px_rgba(20,73,137,0.18)] transition-transform duration-300 hover:rotate-0 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="overflow-hidden rounded-[20px] bg-sky-50 dark:bg-slate-800">
                  <AscentScene className="w-full" />
                </div>
              </div>
              <div className="absolute -end-2 -top-4 rounded-full bg-[#0b1b61] px-5 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(11,27,97,0.35)] sm:-end-4 dark:bg-white dark:text-[#0b1b61]">
                {t('homeHeroSticker')}
              </div>
              <span className="absolute -start-4 bottom-12 h-3 w-3 rounded-full bg-[#1499ff]/70 sm:-start-6" aria-hidden />
              <span className="absolute end-1/4 bottom-6 h-2.5 w-2.5 rounded-full bg-gold-400/80" aria-hidden />
            </div>
          </div>
        </div>
      </section>

      {/* Mode links */}
      <section className="mx-auto mt-7 w-full max-w-[1180px] px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/teachers"
            className="group flex items-center gap-4 rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-[0_2px_10px_rgba(20,73,137,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0878f8]/30 hover:shadow-[0_16px_40px_rgba(20,73,137,0.12)] dark:border-slate-700 dark:bg-slate-800"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-[#0878f8] dark:bg-sky-500/10 dark:text-sky-300">
              <GraduationCap className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-[#0b1b61] dark:text-white">{t('homeModeTeacher')}</span>
              <span className="mt-0.5 block truncate text-xs text-slate-400 dark:text-slate-500">{t('homeModeTeacherSub')}</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-[#0878f8] rtl:rotate-180 rtl:group-hover:-translate-x-1 dark:text-slate-600" />
          </Link>
          <Link
            href="/centers"
            className="group flex items-center gap-4 rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-[0_2px_10px_rgba(20,73,137,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0878f8]/30 hover:shadow-[0_16px_40px_rgba(20,73,137,0.12)] dark:border-slate-700 dark:bg-slate-800"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-[#0878f8] dark:bg-sky-500/10 dark:text-sky-300">
              <Building2 className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-[#0b1b61] dark:text-white">{t('homeModeCenter')}</span>
              <span className="mt-0.5 block truncate text-xs text-slate-400 dark:text-slate-500">{t('homeModeCenterSub')}</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-[#0878f8] rtl:rotate-180 rtl:group-hover:-translate-x-1 dark:text-slate-600" />
          </Link>
        </div>
      </section>

      {/* Quick + trust strip */}
      <section className="mx-auto mt-6 w-full max-w-[1180px] px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <article className="rounded-[24px] border border-slate-200/70 bg-white p-6 shadow-[0_2px_10px_rgba(20,73,137,0.05)] dark:border-slate-700 dark:bg-slate-800">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-[#0878f8] dark:bg-sky-500/10 dark:text-sky-300">
              <BookOpen className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-[#0b1b61] dark:text-white">{t('homeQuickTeacherTitle')}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t('homeQuickTeacherSub')}</p>
            <Link href="/teachers" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#0878f8] transition-colors hover:text-[#0656c4] dark:text-sky-300">
              {t('homeQuickTeacherCta')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </article>
          <article className="rounded-[24px] border border-slate-200/70 bg-white p-6 shadow-[0_2px_10px_rgba(20,73,137,0.05)] dark:border-slate-700 dark:bg-slate-800">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-[#0878f8] dark:bg-sky-500/10 dark:text-sky-300">
              <School className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-[#0b1b61] dark:text-white">{t('homeQuickCenterTitle')}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t('homeQuickCenterSub')}</p>
            <Link href="/centers" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#0878f8] transition-colors hover:text-[#0656c4] dark:text-sky-300">
              {t('homeQuickCenterCta')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </article>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 rounded-[24px] border border-slate-200/60 bg-white/70 px-6 py-7 backdrop-blur-sm sm:px-8 lg:grid-cols-4 dark:border-slate-700/70 dark:bg-slate-800/70">
          {TRUST.map(({ icon: Icon, key, tint }) => (
            <div key={key} className="flex flex-col items-center text-center lg:flex-row lg:items-start lg:gap-3 lg:text-start">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tint}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-2 lg:mt-0">
                <span className="block text-sm font-bold text-[#0b1b61] dark:text-white">{t(`${key}Title`)}</span>
                <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">{t(`${key}Sub`)}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured data — one page-level loader until both sections are ready */}
      {((teachersLoading && !teachers && !teachersError) || (centersLoading && !centers && !centersError)) ? (
        <section className="mx-auto mt-12 w-full max-w-[1180px] px-4 sm:px-6">
          <div className="flex justify-center py-12">
            <PencilLoader size="md" />
          </div>
        </section>
      ) : (
        <>
          {/* Featured teachers */}
          <section className="mx-auto mt-12 w-full max-w-[1180px] px-4 sm:px-6">
            <SectionHeader
              title={t('homeFeaturedTeachersTitle')}
              sub={t('homeFeaturedTeachersSub')}
              href="/teachers"
              viewAll={t('viewAll')}
            />
            {teachersError ? (
              <p className="mt-6 text-center text-sm text-slate-400 dark:text-slate-500">{teachersError}</p>
            ) : teachers && teachers.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {teachers.map((teacher) => (
                  <MiniTeacherCard key={teacher.id} teacher={teacher} />
                ))}
              </div>
            ) : (
              <div className="mt-6">
                <EmptyState
                  icon={GraduationCap}
                  title={t('noTeachersMatch')}
                  description={t('homeNoData')}
                  action={
                    <Link href="/teachers" className="rounded-lg bg-[#0878f8] px-4 py-2 text-sm font-semibold text-white">
                      {t('viewAll')}
                    </Link>
                  }
                />
              </div>
            )}
          </section>

          {/* Featured centers */}
          <section className="mx-auto mt-12 w-full max-w-[1180px] px-4 sm:px-6">
            <SectionHeader
              title={t('homeFeaturedCentersTitle')}
              sub={t('homeFeaturedCentersSub')}
              href="/centers"
              viewAll={t('viewAll')}
            />
            {centersError ? (
              <p className="mt-6 text-center text-sm text-slate-400 dark:text-slate-500">{centersError}</p>
            ) : centers.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {centers.map((center) => (
                  <MiniCenterCard key={center.id} center={center} />
                ))}
              </div>
            ) : (
              <p className="mt-6 text-center text-sm text-slate-400 dark:text-slate-500">{t('homeNoData')}</p>
            )}
          </section>
        </>
      )}

      {/* CTA band */}
      <section className="mx-auto mt-14 w-full max-w-[1180px] px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#0b1b61] via-[#12308f] to-[#0878f8] px-6 py-14 text-center shadow-[0_24px_60px_rgba(8,120,248,0.3)] sm:px-12">
          <div className="absolute -top-16 -end-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="absolute -bottom-20 -start-16 h-56 w-56 rounded-full bg-gold-400/20 blur-3xl" aria-hidden />
          <div className="relative">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <TrendingUp className="h-7 w-7 text-amber-300" />
            </div>
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{t('homeCtaTitle')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-sky-100/90">{t('homeCtaSub')}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#0878f8] shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xl"
              >
                {t('homeCtaPrimary')}
              </Link>
              <Link
                href="/centers"
                className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-150 hover:bg-white/20"
              >
                {t('homeCtaSecondary')}
              </Link>
              <Link
                href="/packages"
                className="rounded-xl px-5 py-3 text-sm font-semibold text-sky-100 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                {t('packagesNav')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
'use client';

import Link from 'next/link';
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Crosshair,
  FileCheck,
  Flag,
  Gift,
  GraduationCap,
  Lock,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { useT, type Dict } from '../../i18n';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { StudentDashboard } from '../../lib/types';
import { formatDate, formatTime, isOverdue } from '../../lib/format';

import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { ProgressRing } from '../../components/dashboard/ProgressRing';

type LevelKey = 'journeyLevelExcellent' | 'journeyLevelStrong' | 'journeyLevelGood' | 'journeyLevelStable';

function levelFor(value: number): LevelKey {
  if (value >= 85) return 'journeyLevelExcellent';
  if (value >= 70) return 'journeyLevelStrong';
  if (value >= 50) return 'journeyLevelGood';
  return 'journeyLevelStable';
}

function clampPct(numerator: number, denominator: number, target: number): number {
  if (denominator <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * target)));
}

/** Flat-style student illustration for the home hero (inline SVG, no assets). */
function JourneyHomeCharacter() {
  return (
    <svg viewBox="0 0 200 300" className="h-auto w-full" aria-hidden="true">
      <ellipse cx="100" cy="150" rx="88" ry="126" fill="#FFFFFF" opacity="0.45" />
      <ellipse cx="100" cy="282" rx="52" ry="10" fill="#635BDF" opacity="0.12" />
      <rect x="84" y="178" width="21" height="76" rx="9" fill="#2E63A8" />
      <rect x="113" y="178" width="21" height="76" rx="9" fill="#2B5C9C" />
      <rect x="76" y="250" width="32" height="15" rx="7" fill="#FFFFFF" />
      <rect x="76" y="260" width="32" height="5" rx="2.5" fill="#C9CEDA" />
      <rect x="112" y="250" width="32" height="15" rx="7" fill="#FFFFFF" />
      <rect x="112" y="260" width="32" height="5" rx="2.5" fill="#C9CEDA" />
      <path d="M70 102 Q100 90 130 102 L139 188 Q100 199 61 188 Z" fill="#43419E" />
      <rect x="63" y="180" width="74" height="11" rx="5.5" fill="#37357F" />
      <path d="M129 106 L138 172" stroke="#43419E" strokeWidth="21" strokeLinecap="round" />
      <g transform="rotate(-8 96 150)">
        <rect x="78" y="128" width="37" height="47" rx="3.5" fill="#1FA3A3" />
        <rect x="78" y="128" width="9" height="47" rx="3.5" fill="#178080" />
        <rect x="108" y="132" width="4" height="39" rx="2" fill="#E4F2F2" />
      </g>
      <path d="M71 108 L60 150 L92 143" stroke="#43419E" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="94" cy="142" r="7.5" fill="#F2C9A0" />
      <rect x="93" y="76" width="14" height="18" rx="6" fill="#EAB88F" />
      <circle cx="79" cy="63" r="4.5" fill="#F2C9A0" />
      <circle cx="121" cy="63" r="4.5" fill="#F2C9A0" />
      <circle cx="100" cy="61" r="21" fill="#F2C9A0" />
      <path
        d="M79 63 Q75 35 100 34 Q125 35 121 63 L116 63 Q117 50 109 46 L91 46 Q83 50 84 63 Z"
        fill="#232338"
      />
      <circle cx="92" cy="62" r="2.1" fill="#232338" />
      <circle cx="108" cy="62" r="2.1" fill="#232338" />
      <path d="M94 73 Q100 77.5 106 73" stroke="#B97B55" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M88 97 Q100 105 112 97" stroke="#37357F" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

interface Stage {
  key: string;
  labelKey: keyof Dict;
  subKey: keyof Dict;
  done: boolean;
  progress: number;
  href: string;
}

type UpKind = 'assignment' | 'exam' | 'lesson';

interface UpItem {
  key: string;
  kind: UpKind;
  title: string;
  sub: string;
  time: string;
  date: string;
  sortTs: number;
  href: string;
}

function isoToHHMM(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function tsOf(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

export default function StudentJourneyHome() {
  const { t, dir, lang } = useT();
  const { user } = useAuth();
  const fmtLang = lang === 'ar' ? 'ar' : 'en';

  const { data, initialLoading, error } = useApi(
    () => api.get<StudentDashboard>('/students/dashboard'),
    [],
  );

  if (initialLoading) return <PencilLoader label={t('loadingDashboard')} />;
  if (error && !data) return <Alert message={error || t('failedLoadDashboard')} />;

  const attendance = data?.attendance ?? [];
  const assignments = data?.pendingAssignments ?? [];
  const recentResults = data?.recentResults ?? [];
  const upcomingExams = data?.upcomingExams ?? [];
  const upcomingLessons = data?.upcomingLessons ?? [];

  const presentCount = attendance.filter((a) => a.status === 'PRESENT').length;
  const absentCount = attendance.filter((a) => a.status === 'ABSENT').length;
  const lateCount = attendance.filter((a) => a.status === 'LATE').length;
  const attendanceRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 0;

  const percentages = recentResults
    .map((r) => r.percentage)
    .filter((p): p is number => p !== null);
  const avgScore = percentages.length
    ? Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length)
    : 0;

  const submittedAssignments = assignments.filter((a) => a.submitted).length;
  const openAssignments = assignments.length - submittedAssignments;

  // ── Journey stages (same honest rules as the journey roadmap) ──────────
  const rawStages: Stage[] = [
    {
      key: 'start',
      labelKey: 'journeyStageStart',
      subKey: 'journeyStageStartSub',
      done: attendance.length > 0,
      progress: clampPct(attendance.length, 3, 100),
      href: '/student/lessons',
    },
    {
      key: 'assignments',
      labelKey: 'journeyStageAssignments',
      subKey: 'journeyStageAssignmentsSub',
      done: assignments.length > 0 && openAssignments === 0,
      progress: clampPct(submittedAssignments, assignments.length, 100),
      href: '/student/assignments',
    },
    {
      key: 'attendance',
      labelKey: 'journeyStageAttendance',
      subKey: 'journeyStageAttendanceSub',
      done: attendance.length >= 5 && attendanceRate >= 75,
      progress: attendanceRate,
      href: '/student/attendance',
    },
    {
      key: 'exams',
      labelKey: 'journeyStageExams',
      subKey: 'journeyStageExamsSub',
      done: recentResults.length > 0,
      progress: clampPct(recentResults.length, 3, 100),
      href: '/student/exams',
    },
    {
      key: 'results',
      labelKey: 'journeyStageResults',
      subKey: 'journeyStageResultsSub',
      done: percentages.length > 0 && avgScore >= 70,
      progress: avgScore,
      href: '/student/results',
    },
    {
      key: 'initiative',
      labelKey: 'journeyStageInitiative',
      subKey: 'journeyStageInitiativeSub',
      done: upcomingLessons.length > 0,
      progress: upcomingLessons.length > 0 ? 100 : 0,
      href: '/student/lessons',
    },
  ];
  const stages: Stage[] = [];
  let stillOpen = false;
  for (const stage of rawStages) {
    const done = !stillOpen && stage.done;
    if (!done) stillOpen = true;
    stages.push({ ...stage, done });
  }
  const doneCount = stages.filter((s) => s.done).length;
  const lastStage = stages[stages.length - 1] as Stage;
  const currentStage = stages.find((s) => !s.done) ?? lastStage;
  const allDone = doneCount === stages.length;
  const currentIdx = stages.findIndex((s) => s.key === currentStage.key);
  const journeyPct = Math.round((doneCount / stages.length) * 100);

  const identityLevel: keyof Dict = attendance.length
    ? levelFor(attendanceRate)
    : percentages.length
      ? levelFor(avgScore)
      : 'journeyCommitmentTitle';

  // ── Hero next action: most urgent real item ─────────────────────────────
  const openSorted = assignments
    .filter((a) => !a.submitted)
    .map((a) => ({ a, ts: tsOf(a.deadline) }))
    .sort((x, y) => x.ts - y.ts)
    .map((x) => x.a);
  const overdue = openSorted.find((a) => a.deadline && isOverdue(a.deadline));
  const nextExam = [...upcomingExams].sort((a, b) => tsOf(a.startTime) - tsOf(b.startTime))[0];
  const nextLesson = [...upcomingLessons].sort(
    (a, b) => tsOf(`${a.date}T${a.startTime}`) - tsOf(`${b.date}T${b.startTime}`),
  )[0];

  const hero: { title: string; meta: string; href: string } = (() => {
    if (overdue) {
      const subject = overdue.subject?.name ?? '';
      return {
        title: overdue.title,
        meta: subject ? `${subject} · ${t('journeyHeroAssignmentOverdue')}` : t('journeyHeroAssignmentOverdue'),
        href: '/student/assignments',
      };
    }
    if (openSorted[0]) {
      const subject = openSorted[0].subject?.name ?? '';
      return {
        title: openSorted[0].title,
        meta: subject ? `${subject} · ${t('journeyHeroAssignment')}` : t('journeyHeroAssignment'),
        href: '/student/assignments',
      };
    }
    if (nextExam) {
      const subject = nextExam.subject?.name ?? '';
      return {
        title: nextExam.name,
        meta: subject ? `${subject} · ${t('journeyHeroExam')}` : t('journeyHeroExam'),
        href: '/student/exams',
      };
    }
    if (nextLesson) {
      const subject = nextLesson.subject?.name ?? '';
      const teacher = nextLesson.teacher?.fullName ?? '';
      return {
        title: subject || teacher || t('journeyHeroLesson'),
        meta: subject && teacher ? `${subject} · ${teacher}` : t('journeyHeroLesson'),
        href: '/student/lessons',
      };
    }
    return { title: t(currentStage.labelKey), meta: t(currentStage.subKey), href: currentStage.href };
  })();

  const firstName = (user?.fullName ?? '').split(' ')[0] || t('studentRole');
  const hour = new Date().getHours();
  const greetKey: keyof Dict = hour < 12 ? 'journeyGreetingMorning' : 'journeyGreetingEvening';

  // ── "Now and next": nearest 3 real items across lessons/exams/assignments ──
  const upItems: UpItem[] = [
    ...upcomingLessons.map((l, i) => {
      const hhmm = l.startTime && l.startTime.includes(':') && l.startTime.length <= 5
        ? l.startTime
        : isoToHHMM(`${l.date}T${l.startTime ?? '00:00'}`);
      return {
        key: `lesson-${l.id ?? i}`,
        kind: 'lesson' as UpKind,
        title: l.subject?.name ?? l.teacher?.fullName ?? t('journeyHeroLesson'),
        sub: l.teacher?.fullName ?? '',
        time: hhmm ? formatTime(hhmm, fmtLang) : '—',
        date: formatDate(l.date, fmtLang),
        sortTs: tsOf(`${l.date}T${l.startTime}`),
        href: '/student/lessons',
      };
    }),
    ...upcomingExams.map((e, i) => {
      const hhmm = isoToHHMM(e.startTime);
      return {
        key: `exam-${e.id ?? i}`,
        kind: 'exam' as UpKind,
        title: e.name,
        sub: e.subject?.name ?? '',
        time: hhmm ? formatTime(hhmm, fmtLang) : '—',
        date: formatDate(e.startTime, fmtLang),
        sortTs: tsOf(e.startTime),
        href: '/student/exams',
      };
    }),
    ...openSorted.map((a, i) => ({
      key: `assignment-${a.id ?? i}`,
      kind: 'assignment' as UpKind,
      title: a.title,
      sub: a.subject?.name ?? '',
      time: a.deadline && isoToHHMM(a.deadline) ? formatTime(isoToHHMM(a.deadline) as string, fmtLang) : '—',
      date: a.deadline ? formatDate(a.deadline, fmtLang) : '—',
      sortTs: tsOf(a.deadline),
      href: '/student/assignments',
    })),
  ]
    .sort((a, b) => a.sortTs - b.sortTs)
    .slice(0, 3);

  const UP_ICON: Record<UpKind, typeof ClipboardList> = {
    assignment: ClipboardList,
    exam: FileCheck,
    lesson: GraduationCap,
  };
  const UP_TONE: Record<UpKind, string> = {
    assignment: 'bg-[#E1F3F5] text-[#187E96] dark:bg-teal-500/15 dark:text-teal-300',
    exam: 'bg-[#ECE9FB] text-[#635BDF] dark:bg-brand-500/15 dark:text-brand-300',
    lesson: 'bg-[#FDF3D9] text-[#B97F0E] dark:bg-amber-500/15 dark:text-amber-300',
  };

  // ── Performance: last-6-weeks average + trend + sparkline ──────────────
  const SIX_WEEKS_MS = 42 * 24 * 60 * 60 * 1000;
  const windowPts = recentResults
    .filter((r) => r.percentage !== null && r.submittedAt && new Date(r.submittedAt).getTime() >= Date.now() - SIX_WEEKS_MS)
    .map((r) => r.percentage as number)
    .filter((p) => Number.isFinite(p));
  // submittedAt ordering is unreliable across pages; keep reporting order.
  const perfAvg = windowPts.length ? Math.round(windowPts.reduce((s, p) => s + p, 0) / windowPts.length) : avgScore;
  let trend: number | null = null;
  if (windowPts.length >= 2) {
    const half = Math.floor(windowPts.length / 2);
    const first = windowPts.slice(0, half);
    const second = windowPts.slice(half);
    const mean = (xs: number[]) => xs.reduce((s, p) => s + p, 0) / xs.length;
    trend = Math.round(mean(second) - mean(first));
  }
  const spark = windowPts.slice(-12);
  const sparkMin = spark.length ? Math.min(...spark) : 0;
  const sparkMax = spark.length ? Math.max(...spark) : 0;
  const sparkRange = sparkMax - sparkMin || 1;
  const sparkPts = spark
    .map((p, i) => {
      const x = spark.length === 1 ? 60 : (i / (spark.length - 1)) * 120;
      const y = 32 - ((p - sparkMin) / sparkRange) * 26;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // ── Roadmap preview: previous, current, next ───────────────────────────
  const previewIdxs = (() => {
    if (allDone) return [stages.length - 3, stages.length - 2, stages.length - 1].filter((i) => i >= 0);
    if (currentIdx <= 0) return [0, 1, 2].filter((i) => i < stages.length);
    return [currentIdx - 1, currentIdx, currentIdx + 1].filter((i) => i >= 0 && i < stages.length);
  })();

  const CtaChevron = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const isRtl = dir === 'rtl';

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[9fr_5fr] lg:items-start lg:gap-x-4 lg:gap-y-5">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section
        aria-label={t('journeyNextStep')}
        className="journey-enter relative overflow-hidden rounded-[20px] bg-[linear-gradient(120deg,#D7E3F8_0%,#E9E6FE_55%,#DCD4F7_100%)] text-[#242640] dark:bg-slate-800 dark:bg-none dark:text-white dark:ring-1 dark:ring-inset dark:ring-slate-700 lg:col-start-1 lg:row-start-1"
      >
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -start-16 h-64 w-64 rounded-full bg-white/40 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -top-20 end-1/4 h-48 w-48 rounded-full bg-[#B9A8F2]/25 blur-2xl" />
        <div className="relative p-5 sm:p-6">
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#4A4A68] dark:text-slate-300">
                {t(greetKey, { name: firstName })}
              </p>
              <p className="mt-2 text-sm font-extrabold text-[#635BDF] dark:text-brand-300">{t('journeyNextStep')}:</p>
              <h1 className="mt-1 text-balance text-[clamp(1.5rem,5vw,2.1rem)] font-black leading-[1.3] tracking-tight">
                {hero.title}
              </h1>
              <p className="mt-1.5 truncate text-[13px] font-bold text-[#7A5FD0] dark:text-brand-300">{hero.meta}</p>
              <div className="mt-3">
                <p className="text-xs font-medium text-[#6E6E8C] dark:text-slate-400">{t('journeyIdentityNow')}:</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm font-extrabold text-[#635BDF] dark:text-brand-300">
                  <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                  {t(identityLevel)}
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-[#6E6E8C] dark:text-slate-400">
                  {allDone ? t('journeyAllStagesDone') : t(currentStage.labelKey)}
                </p>
              </div>
            </div>
            <div className="w-[40%] max-w-[200px] shrink-0 self-end sm:w-[36%]">
              <JourneyHomeCharacter />
            </div>
          </div>
          <div className="mt-4 flex gap-2.5">
            <Link
              href={hero.href}
              className="inline-flex flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-[13px] bg-[#635BDF] px-4 py-3 text-[15px] font-extrabold text-white shadow-[0_4px_12px_rgba(99,91,223,0.35)] transition-colors hover:bg-[#5249C7] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF]"
            >
              {t('journeyStartNow')}
              <CtaChevron className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/student/schedule"
              className="inline-flex touch-manipulation items-center justify-center gap-1.5 rounded-[13px] bg-white/85 px-4 py-3 text-sm font-extrabold text-[#3A3A5C] shadow-sm ring-1 ring-inset ring-white transition-colors hover:bg-white motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF] dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-600"
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              {t('journeyTodaySchedule')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Now and next ─────────────────────────────────────────────── */}
      <section
        aria-label={t('journeyNowAndNext')}
        className="journey-enter journey-enter-1 lg:col-start-2 lg:row-start-1"
      >
        <h2 className="text-balance text-base font-extrabold tracking-tight text-[#242640] dark:text-white">
          {t('journeyNowAndNext')}
        </h2>
        <div className="mt-1">
          {upItems.length === 0 && (
            <p className="py-6 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('journeyNothingScheduled')}
            </p>
          )}
          {upItems.map((item) => {
            const Icon = UP_ICON[item.kind];
            return (
              <Link
                key={item.key}
                href={item.href}
                className="group flex touch-manipulation items-center gap-3 border-b border-slate-200/70 py-3 last:border-0 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF] dark:border-slate-700/70"
              >
                <span className="w-[86px] shrink-0 text-end">
                  <span dir="ltr" className="block text-[13px] font-extrabold tabular-nums text-[#242640] dark:text-slate-100">
                    {item.time}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {item.date}
                  </span>
                </span>
                <span aria-hidden className="h-10 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${UP_TONE[item.kind]}`}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-[#242640] dark:text-slate-100">
                    {item.title}
                  </span>
                  {item.sub && (
                    <span className="mt-0.5 block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                      {item.sub}
                    </span>
                  )}
                </span>
                <CtaChevron className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 motion-reduce:transition-none dark:text-slate-500 ${isRtl ? 'group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'}`} aria-hidden />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Current mission ──────────────────────────────────────────── */}
      <section
        aria-label={t('journeyMissionNowTitle')}
        className="journey-enter journey-enter-1 overflow-hidden rounded-[18px] border-s-4 border-s-[#635BDF] bg-[#F4F0FE] text-[#242640] shadow-[0_8px_24px_rgba(99,91,223,0.08)] dark:border-s-[#635BDF] dark:bg-slate-800 dark:text-white dark:ring-1 dark:ring-inset dark:ring-slate-700 lg:col-start-2 lg:row-start-2"
      >
        {allDone ? (
          <div className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-extrabold text-[#635BDF] dark:text-brand-300">
              {t('journeyMissionNowTitle')}
              <Crosshair className="h-4 w-4" aria-hidden />
            </p>
            <p className="mt-1.5 text-balance text-xl font-black tracking-tight">{t('journeyAllStagesDone')}</p>
            <p className="mt-1 text-[13px] font-medium text-[#8B8BA3] dark:text-slate-400">{t('journeyAllStagesDoneDesc')}</p>
          </div>
        ) : (
          <div className="p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#6E6E8C] dark:text-slate-400">
              <span className="flex h-9 w-9 items-center justify-center bg-[#635BDF] text-white [clip-path:polygon(25%_3%,75%_3%,100%_50%,75%_97%,25%_97%,0_50%)]">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              {t('journeyMissionNowTitle')}
            </p>
            <h2 className="mt-1.5 text-balance text-xl font-black tracking-tight">{t(currentStage.labelKey)}</h2>
            <p className="mt-1 truncate text-[13px] font-medium text-[#8B8BA3] dark:text-slate-400">{t(currentStage.subKey)}</p>
            <div className="mt-3 flex items-center gap-3">
              <div
                className="h-2 flex-1 overflow-hidden rounded-full bg-[#E4DCF7] dark:bg-slate-700"
                role="progressbar"
                aria-valuenow={Math.round(currentStage.progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t(currentStage.labelKey)}
              >
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#635BDF,#219EBC)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
                  style={{ width: `${Math.max(0, Math.min(100, currentStage.progress))}%` }}
                />
              </div>
              <b dir="ltr" className="shrink-0 text-sm font-extrabold tabular-nums text-[#635BDF] dark:text-brand-300">
                {Math.round(currentStage.progress)}%
              </b>
            </div>
            <p className="mt-2.5 text-[13px] font-medium text-[#8B8BA3] dark:text-slate-400">{t('journeyMissionUnlockHint')}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <Link
                href={currentStage.href}
                className="inline-flex touch-manipulation items-center gap-1 text-sm font-extrabold text-[#635BDF] transition-colors hover:text-[#5249C7] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF] dark:text-brand-300 dark:hover:text-brand-200"
              >
                {t('journeyTrackMission')}
                <CtaChevron className="h-4 w-4" aria-hidden />
              </Link>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#FDF3D9] px-2.5 py-1.5 text-xs font-extrabold text-[#B97F0E] ring-1 ring-inset ring-[#F0D489] dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">
                <Gift className="h-3.5 w-3.5" aria-hidden />
                {t('comingSoon')}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ── Performance glance ───────────────────────────────────────── */}
      <section
        aria-label={t('journeyPerformanceGlance')}
        className="journey-enter journey-enter-2 lg:col-start-1 lg:row-start-2"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-balance text-base font-extrabold tracking-tight text-[#242640] dark:text-white">
            {t('journeyPerformanceGlance')}
          </h2>
          <Link
            href="/student/learning"
            className="inline-flex touch-manipulation items-center gap-1 text-[13px] font-extrabold text-[#635BDF] transition-colors hover:text-[#5249C7] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF] dark:text-brand-300 dark:hover:text-brand-200"
          >
            {t('journeyViewPerformance')}
            <CtaChevron className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        <div className="mt-2 grid grid-cols-2">
          <div className="min-w-0 pe-3">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#6E6E8C] dark:text-slate-400">
              <BookOpen className="h-4 w-4 text-[#187E96]" aria-hidden />
              {t('journeyYourPerformance')}
            </p>
            <p className="mt-1 text-[clamp(1.8rem,6vw,2.4rem)] font-black leading-none tracking-tight text-[#242640] dark:text-white">
              <span dir="ltr" className="tabular-nums">{perfAvg}%</span>
            </p>
            <p className="mt-1 text-xs font-medium text-[#8B8BA3] dark:text-slate-400">
              {windowPts.length > 0
                ? t('journeyLast6Weeks')
                : t('journeyResultsBasedOn', { count: percentages.length })}
            </p>
            {trend !== null && trend !== 0 && (
              <p className={`mt-1.5 flex items-center gap-1 text-xs font-bold ${trend > 0 ? 'text-[#2E9E5F] dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {trend > 0 ? <TrendingUp className="h-3.5 w-3.5" aria-hidden /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden />}
                {t(trend > 0 ? 'journeyTrendUp' : 'journeyTrendDown', { points: Math.abs(trend) })}
              </p>
            )}
            {spark.length >= 2 && (
              <svg viewBox="0 0 120 36" className="mt-2 h-9 w-full max-w-[160px]" aria-hidden="true" preserveAspectRatio="none">
                <polyline
                  points={sparkPts}
                  fill="none"
                  stroke="#219EBC"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <div className="min-w-0 border-s border-slate-200 ps-4 dark:border-slate-700">
            <p className="text-[13px] font-semibold text-[#6E6E8C] dark:text-slate-400">{t('attendance')}</p>
            <div className="mt-2 flex justify-start">
              <ProgressRing value={attendanceRate} size={76} strokeWidth={8} tone="green" label={`${attendanceRate}%`} />
            </div>
            <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[#8B8BA3] dark:text-slate-400">
              {attendance.length > 0 ? (
                <>
                  <span dir="ltr" className="tabular-nums">{presentCount}</span> {t('journeyCountPresent')}
                  {' · '}
                  <span dir="ltr" className="tabular-nums">{absentCount}</span> {t('journeyCountAbsent')}
                  {' · '}
                  <span dir="ltr" className="tabular-nums">{lateCount}</span> {t('journeyCountLate')}
                </>
              ) : (
                t('noAttendanceRecords')
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ── Roadmap preview ──────────────────────────────────────────── */}
      <section
        aria-label={t('journeyProgressJourney')}
        className="journey-enter journey-enter-2 lg:col-start-1 lg:row-start-3"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-balance text-base font-extrabold tracking-tight text-[#242640] dark:text-white">
            {t('journeyProgressJourney')}
          </h2>
          <Link
            href="/student/journey"
            className="inline-flex touch-manipulation items-center gap-1 text-[13px] font-extrabold text-[#635BDF] transition-colors hover:text-[#5249C7] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF] dark:text-brand-300 dark:hover:text-brand-200"
          >
            {t('journeySeeJourney')}
            <CtaChevron className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        <div className="relative mt-1 h-32" aria-label={t('journeyRoadmapLabel')}>
          <svg viewBox="0 0 300 90" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <path
              d="M 20 68 Q 150 6 280 68"
              fill="none"
              stroke="#C9CFDD"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="0.1 9"
            />
          </svg>
          {previewIdxs.map((si, k) => {
            const s = stages[si] as Stage;
            const isCurrent = !allDone && si === currentIdx;
            const isChallenge = !s.done && !isCurrent && si === currentIdx + 1;
            // Chronological order follows reading direction: earliest at the
            // inline-start side (right in RTL, left in LTR).
            const frac = previewIdxs.length === 1 ? 50 : 12 + (k / (previewIdxs.length - 1)) * 76;
            const left = isRtl ? 100 - frac : frac;
            return (
              <div
                key={s.key}
                className="absolute top-1/2 flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
                style={{ left: `${left}%` }}
              >
                {s.done ? (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2FA36B] text-white shadow-[0_4px_10px_rgba(47,163,107,0.35)]">
                    <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
                  </span>
                ) : isCurrent ? (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#635BDF] text-white shadow-[0_4px_12px_rgba(99,91,223,0.45)] ring-4 ring-[#635BDF]/25">
                    <Sparkles className="h-5 w-5" aria-hidden />
                  </span>
                ) : isChallenge ? (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#E8A020] shadow-[0_4px_10px_rgba(232,160,32,0.3)] ring-2 ring-inset ring-[#EFB93E] dark:bg-slate-800">
                    <Flag className="h-5 w-5" aria-hidden />
                  </span>
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E9EDF4] text-[#A7ADC0] dark:bg-slate-700 dark:text-slate-500">
                    <Lock className="h-5 w-5" aria-hidden />
                  </span>
                )}
                <p className={`mt-1.5 text-[11px] font-extrabold leading-tight ${s.done ? 'text-[#3A3A55] dark:text-slate-200' : isCurrent ? 'text-[#635BDF] dark:text-brand-300' : isChallenge ? 'text-[#C9860A] dark:text-amber-400' : 'text-[#9AA0B4] dark:text-slate-500'}`}>
                  {t(s.labelKey)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Achievements entry ───────────────────────────────────────── */}
      <section aria-label={t('journeyAchievements')} className="journey-enter journey-enter-3 lg:col-start-2 lg:row-start-3">
        <h2 className="flex items-center gap-1.5 text-balance text-base font-extrabold tracking-tight text-[#242640] dark:text-white">
          <Trophy className="h-4 w-4 text-[#8B8BA3] dark:text-slate-400" aria-hidden />
          {t('journeyAchievements')}
        </h2>
        <Link
          href="/student/journey"
          className="mt-2 flex touch-manipulation items-center gap-3 rounded-2xl bg-[#FAF8FF] p-3.5 ring-1 ring-inset ring-[#ECE7FB] transition-colors hover:bg-[#F4EFFE] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF] dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700/70"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ECE9FB] text-[#635BDF] dark:bg-brand-500/15 dark:text-brand-300">
            <Trophy className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-[#6E6E8C] dark:text-slate-400">
              {allDone ? t('journeyAllStagesDone') : t('journeyInProgress')}
            </span>
            <span className="mt-0.5 block truncate text-[15px] font-extrabold text-[#242640] dark:text-white">
              {t(identityLevel)} · <span dir="ltr" className="tabular-nums">{journeyPct}%</span>
            </span>
          </span>
          <CtaChevron className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
        </Link>
      </section>

      {error && (
        <div className="lg:col-span-2">
          <Alert message={error} />
        </div>
      )}
    </div>
  );
}

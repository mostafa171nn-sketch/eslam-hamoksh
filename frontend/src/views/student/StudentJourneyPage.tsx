'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Crosshair,
  Flag,
  Gift,
  Lock,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useT, type Dict } from '../../i18n';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { StudentDashboard } from '../../lib/types';

import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { Avatar } from '../../components/ui/Avatar';
import { JOURNEY_FROM_KEY, JOURNEY_STORAGE_KEY } from '../../components/student/StudentJourneyFab';

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

/**
 * One stage of the journey. Every field is derived from the student's own
 * records — there is no hard-coded stage list, so the header count and the
 * rendered list can never disagree.
 */
interface Stage {
  key: string;
  labelKey: keyof Dict;
  subKey: keyof Dict;
  done: boolean;
  progress: number;
  href: string;
}

/** Node anchor points along the winding roadmap (percent of the panel, physical left/top). */
const NODE_POS = [
  { x: 20, y: 90 },
  { x: 80, y: 74 },
  { x: 20, y: 58 },
  { x: 80, y: 42 },
  { x: 20, y: 27 },
  { x: 80, y: 11 },
];

const ROAD_W = 360;
const ROAD_H = 720;

/** Smooth Catmull-Rom curve through the given points (viewBox units). */
function smoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/** Flat-style student illustration for the identity hero (inline SVG, no assets). */
function JourneyCharacter() {
  return (
    <svg viewBox="0 0 200 300" className="h-auto w-full" aria-hidden="true">
      <ellipse cx="100" cy="150" rx="88" ry="126" fill="#FFFFFF" opacity="0.45" />
      <ellipse cx="100" cy="282" rx="52" ry="10" fill="#635BDF" opacity="0.12" />
      {/* legs */}
      <rect x="84" y="178" width="21" height="76" rx="9" fill="#2E63A8" />
      <rect x="113" y="178" width="21" height="76" rx="9" fill="#2B5C9C" />
      {/* shoes */}
      <rect x="76" y="250" width="32" height="15" rx="7" fill="#FFFFFF" />
      <rect x="76" y="260" width="32" height="5" rx="2.5" fill="#C9CEDA" />
      <rect x="112" y="250" width="32" height="15" rx="7" fill="#FFFFFF" />
      <rect x="112" y="260" width="32" height="5" rx="2.5" fill="#C9CEDA" />
      {/* torso sweater */}
      <path d="M70 102 Q100 90 130 102 L139 188 Q100 199 61 188 Z" fill="#43419E" />
      <rect x="63" y="180" width="74" height="11" rx="5.5" fill="#37357F" />
      {/* left arm resting at hip */}
      <path d="M129 106 L138 172" stroke="#43419E" strokeWidth="21" strokeLinecap="round" />
      {/* book held against chest */}
      <g transform="rotate(-8 96 150)">
        <rect x="78" y="128" width="37" height="47" rx="3.5" fill="#1FA3A3" />
        <rect x="78" y="128" width="9" height="47" rx="3.5" fill="#178080" />
        <rect x="108" y="132" width="4" height="39" rx="2" fill="#E4F2F2" />
      </g>
      {/* right arm over the book */}
      <path d="M71 108 L60 150 L92 143" stroke="#43419E" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="94" cy="142" r="7.5" fill="#F2C9A0" />
      {/* neck + head */}
      <rect x="93" y="76" width="14" height="18" rx="6" fill="#EAB88F" />
      <circle cx="79" cy="63" r="4.5" fill="#F2C9A0" />
      <circle cx="121" cy="63" r="4.5" fill="#F2C9A0" />
      <circle cx="100" cy="61" r="21" fill="#F2C9A0" />
      {/* hair */}
      <path
        d="M79 63 Q75 35 100 34 Q125 35 121 63 L116 63 Q117 50 109 46 L91 46 Q83 50 84 63 Z"
        fill="#232338"
      />
      {/* face */}
      <circle cx="92" cy="62" r="2.1" fill="#232338" />
      <circle cx="108" cy="62" r="2.1" fill="#232338" />
      <path d="M94 73 Q100 77.5 106 73" stroke="#B97B55" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* collar */}
      <path d="M88 97 Q100 105 112 97" stroke="#37357F" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Small four-point sparkle used around the identity hero. */
function DecoSparkle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 1 L14.2 9.8 L23 12 L14.2 14.2 L12 23 L9.8 14.2 L1 12 L9.8 9.8 Z" />
    </svg>
  );
}

const CHIP_TONES = [
  'bg-[#E1F3F5] text-[#187E96] dark:bg-teal-500/15 dark:text-teal-300',
  'bg-[#ECE9FB] text-[#635BDF] dark:bg-brand-500/15 dark:text-brand-300',
  'bg-[#E6F6EB] text-[#2E9E5F] dark:bg-emerald-500/15 dark:text-emerald-300',
];

export default function StudentJourneyPage() {
  const { t, dir } = useT();
  const { user } = useAuth();
  const router = useRouter();

  const { data, initialLoading, error } = useApi(
    () => api.get<StudentDashboard>('/students/dashboard'),
    [],
  );

  /** Back exits Journey Mode and returns to the exact page the student came from. */
  const goBack = () => {
    let from: string | null = null;
    try {
      from = window.sessionStorage.getItem(JOURNEY_FROM_KEY);
      window.sessionStorage.removeItem(JOURNEY_STORAGE_KEY);
      window.sessionStorage.removeItem(JOURNEY_FROM_KEY);
    } catch {
      /* ignore */
    }
    if (from && (from === '/profile' || (from.startsWith('/student') && from !== '/student/journey'))) {
      router.push(from);
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/student');
    }
  };

  if (initialLoading) return <PencilLoader label={t('loadingDashboard')} />;
  if (error && !data) return <Alert message={error || t('failedLoadDashboard')} />;

  const attendance = data?.attendance ?? [];
  const assignments = data?.pendingAssignments ?? [];
  const recentResults = data?.recentResults ?? [];
  const upcomingExams = data?.upcomingExams ?? [];
  const upcomingLessons = data?.upcomingLessons ?? [];

  const presentCount = attendance.filter((a) => a.status === 'PRESENT').length;
  const attendanceRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 0;

  const percentages = recentResults
    .map((r) => r.percentage)
    .filter((p): p is number => p !== null);
  const avgScore = percentages.length
    ? Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length)
    : 0;

  const submittedAssignments = assignments.filter((a) => a.submitted).length;
  const openAssignments = assignments.length - submittedAssignments;
  const assignmentRate = clampPct(submittedAssignments, assignments.length, 100);

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
      progress: assignmentRate,
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

  // The path must read as one forward line: once a stage is still open, every
  // later stage stays open even if its own metric happens to be satisfied.
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
  const challengeIdx = !allDone && currentIdx + 1 < stages.length ? currentIdx + 1 : -1;

  // One short, honest instruction derived from the actual records.
  const approachKey: keyof Dict = !attendance.length
    ? 'journeyApproachFirst'
    : openAssignments > 0
      ? 'journeyApproachAssignments'
      : attendanceRate < 75
        ? 'journeyApproachAttendance'
        : upcomingExams.length > 0
          ? 'journeyApproachExams'
          : 'journeyApproachKeepGoing';

  const grade = user && user.role === 'STUDENT' && user.student.grade ? user.student.grade.name : null;

  const identityLevel: keyof Dict = attendance.length
    ? levelFor(attendanceRate)
    : percentages.length
      ? levelFor(avgScore)
      : 'journeyCommitmentTitle';

  const meters: Array<{
    key: 'journeyMeterLearning' | 'journeyMeterCommitment' | 'journeyMeterFollowThrough';
    value: number;
    hasData: boolean;
    icon: typeof Award;
  }> = [
    { key: 'journeyMeterLearning', value: avgScore, hasData: percentages.length > 0, icon: BookOpen },
    { key: 'journeyMeterCommitment', value: attendanceRate, hasData: attendance.length > 0, icon: ShieldCheck },
    { key: 'journeyMeterFollowThrough', value: assignmentRate, hasData: assignments.length > 0, icon: ClipboardList },
  ];

  // Roadmap geometry in viewBox units.
  const roadPts = NODE_POS.map((p) => ({ x: (p.x / 100) * ROAD_W, y: (p.y / 100) * ROAD_H }));
  const solidD = allDone ? smoothPath(roadPts) : currentIdx > 0 ? smoothPath(roadPts.slice(0, currentIdx + 1)) : '';
  const dottedD = allDone ? '' : smoothPath(roadPts.slice(Math.max(0, currentIdx)));

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const CtaChevron = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const challenge = challengeIdx >= 0 ? stages[challengeIdx] : null;
  const challengePos = challenge ? (NODE_POS[challengeIdx] ?? { x: 50, y: 50 }) : null;
  const branchX = challengePos ? Math.min(88, Math.max(12, challengePos.x >= 50 ? challengePos.x + 12 : challengePos.x - 12)) : 50;

  return (
    <div>
      {/* Back + identity chip (preserved Journey entry/exit behavior). */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          aria-label={t('back')}
          className="inline-flex h-9 w-9 touch-manipulation items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          <BackIcon className="h-4 w-4" aria-hidden />
        </button>
        <span className="inline-flex items-center gap-2.5 rounded-full bg-white py-1.5 ps-1.5 pe-4 shadow-sm ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <Avatar name={user?.fullName ?? 'Student'} src={user?.photo} size="sm" />
          <span className="min-w-0">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">{t('journeyIdentity')}</span>
            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
              {grade ?? t('studentRole')}
            </span>
          </span>
        </span>
      </div>

      {error && (
        <div className="mb-4">
          <Alert message={error || t('failedLoadDashboard')} />
        </div>
      )}

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[7fr_5fr] lg:grid-rows-[auto_auto_1fr_auto] lg:items-stretch lg:gap-x-4 lg:gap-y-4">
        {/* ── Identity hero ─────────────────────────────────────────── */}
        <section
          aria-label={t('journeyIdentity')}
          data-testid="journey-identity-hero"
          className="journey-enter relative overflow-hidden rounded-[20px] bg-[linear-gradient(120deg,#D7E3F8_0%,#E9E6FE_55%,#DCD4F7_100%)] text-[#242640] dark:bg-slate-800 dark:bg-none dark:text-white dark:ring-1 dark:ring-inset dark:ring-slate-700 lg:col-start-1 lg:row-start-1"
        >
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -start-16 h-64 w-64 rounded-full bg-white/40 blur-2xl" />
          <div aria-hidden className="pointer-events-none absolute -top-20 end-1/4 h-48 w-48 rounded-full bg-[#B9A8F2]/25 blur-2xl" />
          {/* gold shield badge */}
          <span
            aria-hidden
            className="absolute end-4 top-4 z-10 flex h-12 w-10 items-center justify-center bg-[linear-gradient(160deg,#F7CE5B,#E5A21B)] [clip-path:polygon(50%_0,100%_20%,100%_58%,50%_100%,0_58%,0_20%)]"
          >
            <Sparkles className="h-5 w-5 -translate-y-1 text-white" />
          </span>
          <DecoSparkle className="absolute end-[38%] top-6 z-10 h-5 w-5 text-[#D9A91F]" />
          <div className="relative flex gap-2 p-5 sm:p-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-balance text-[15px] font-extrabold text-[#3A3A5C] dark:text-slate-200">{t('journeyPageTitle')}</h1>
              <p className="mt-3 text-xs font-semibold text-[#6E6E8C] dark:text-slate-400">{t('journeyIdentity')}</p>
              <p className="mt-0.5 text-balance text-[clamp(2.6rem,9vw,4rem)] font-black leading-[1.15] tracking-tight text-[#635BDF] dark:text-brand-300">
                {t(identityLevel)}
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-[#6E6E8C] dark:text-slate-400">{t('journeyCommitmentStage')}</dt>
                  <dd className="mt-0.5 truncate text-[15px] font-extrabold text-[#242640] dark:text-white">
                    {allDone ? t('journeyAllStagesDone') : t(currentStage.labelKey)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-[#6E6E8C] dark:text-slate-400">{t('journeyCommitmentApproach')}</dt>
                  <dd className="mt-0.5 truncate text-[13px] font-bold text-[#4A4A68] dark:text-slate-200">{t(approachKey)}</dd>
                </div>
              </dl>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/75 px-2.5 py-1 text-xs font-bold text-[#2E9E5F] shadow-sm ring-1 ring-inset ring-white dark:bg-slate-700 dark:text-emerald-300 dark:ring-slate-600">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                {attendance.length ? (
                  <span dir="ltr" className="tabular-nums">{presentCount} / {attendance.length}</span>
                ) : (
                  t(identityLevel)
                )}
              </p>
            </div>
            <div className="w-[42%] max-w-[228px] shrink-0 self-end sm:w-[38%]">
              <JourneyCharacter />
            </div>
          </div>
        </section>

        {/* ── Trait chips ───────────────────────────────────────────── */}
        <div className="journey-enter journey-enter-1 grid grid-cols-3 gap-1.5 lg:col-start-1 lg:row-start-2" aria-label={t('journeyCommitmentTitle')}>
          {meters.map((m, i) => {
            const Icon = m.icon;
            return (
              <span
                key={m.key}
                className={`flex min-w-0 items-center justify-center gap-1.5 rounded-2xl px-1.5 py-2 text-center sm:gap-2 sm:px-2 sm:py-2.5 ${CHIP_TONES[i % CHIP_TONES.length]}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-semibold opacity-90 sm:text-xs">{t(m.key)}</span>
                  <b className="mt-0.5 block truncate text-xs font-extrabold sm:text-[13px]">
                    {m.hasData ? t(levelFor(m.value)) : t('journeyLevelNoData')}
                  </b>
                </span>
                <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
              </span>
            );
          })}
        </div>

        {/* spacer pushes the rewards CTA to the column bottom on desktop */}
        <div aria-hidden className="hidden lg:col-start-1 lg:row-start-3 lg:block" />

        {/* ── Progress path ─────────────────────────────────────────── */}
        <section
          aria-labelledby="journey-progress-heading"
          className="journey-enter journey-enter-2 rounded-[24px] bg-[#F6F9FD] px-3 pb-7 pt-5 text-[#242640] dark:bg-slate-800 dark:text-white dark:ring-1 dark:ring-inset dark:ring-slate-700 lg:col-start-2 lg:row-start-1 lg:row-span-3"
        >
          <div className="px-2 text-end">
            <h2 id="journey-progress-heading" className="text-balance text-base font-extrabold tracking-tight">
              {t('journeyProgressTitle')}
            </h2>
            <p className="mt-1 text-xs font-bold text-[#6E6E8C] dark:text-slate-400">
              <span className="font-black text-[#635BDF] dark:text-brand-300">{doneCount}</span>{' '}
              {t('journeyStagesOfTotal', { total: stages.length })}
            </p>
          </div>
          <div className="relative mx-auto mt-1 w-full max-w-[400px]" aria-label={t('journeyRoadmapLabel')}>
            <svg viewBox={`0 0 ${ROAD_W} ${ROAD_H}`} preserveAspectRatio="xMidYMid meet" className="h-auto w-full" aria-hidden>
              <defs>
                <linearGradient id="journey-road" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0" stopColor="#4A6CF7" />
                  <stop offset="0.55" stopColor="#635BDF" />
                  <stop offset="1" stopColor="#22A3BD" />
                </linearGradient>
              </defs>
              <g fill="none" stroke="#635BDF" strokeOpacity="0.07" strokeWidth="1.5">
                <path d="M 30 690 C 140 660 90 600 330 550" />
                <path d="M 30 550 C 140 520 90 460 330 410" />
                <path d="M 30 410 C 140 380 90 320 330 270" />
                <path d="M 30 270 C 140 240 90 180 330 130" />
                <path d="M 30 130 C 140 110 90 70 330 30" />
              </g>
              {dottedD && (
                <path
                  d={dottedD}
                  fill="none"
                  stroke="#C9CFDD"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="0.1 10"
                />
              )}
              {solidD && (
                <path
                  d={solidD}
                  fill="none"
                  stroke="url(#journey-road)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              )}
            </svg>

            {stages.map((s, i) => {
              const pos = NODE_POS[i % NODE_POS.length] ?? { x: 50, y: 50 };
              const isCurrent = !allDone && s.key === currentStage.key;
              const isChallenge = !s.done && !isCurrent && i === currentIdx + 1;
              const labelRight = pos.x < 50;
              const titleColor = s.done
                ? 'text-[#3A3A55] dark:text-slate-100'
                : isCurrent
                  ? 'text-[#635BDF] dark:text-brand-300'
                  : isChallenge
                    ? 'text-[#C9860A] dark:text-amber-400'
                    : 'text-[#9AA0B4] dark:text-slate-500';
              return (
                <div key={s.key} className="absolute inset-0" aria-hidden={false}>
                  {isCurrent && (
                    <div
                      className="absolute z-10 -translate-x-1/2"
                      style={{ left: `${pos.x}%`, top: `calc(${pos.y}% - 68px)` }}
                    >
                      <span className="relative block whitespace-nowrap rounded-full bg-[#635BDF] px-2.5 py-1 text-[11px] font-extrabold text-white shadow-[0_4px_10px_rgba(99,91,223,0.45)]">
                        {t('journeyYouAreHere')}
                        <span aria-hidden className="absolute -bottom-[3px] left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-[#635BDF]" />
                      </span>
                    </div>
                  )}
                  <Link
                    href={s.href}
                    aria-label={t(s.labelKey)}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    className="absolute z-10 flex h-20 w-20 touch-manipulation -translate-x-1/2 -translate-y-1/2 items-center justify-center motion-safe:transition-transform motion-safe:hover:scale-105 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF]"
                  >
                    <span
                      aria-hidden
                      className={`absolute bottom-1 h-4 w-[68px] rounded-[50%] ${
                        s.done
                          ? 'bg-[#CDEEDB] dark:bg-emerald-500/25'
                          : isCurrent
                            ? 'bg-[#635BDF]/25 blur-[1px]'
                            : isChallenge
                              ? 'bg-[#F8E3AC] dark:bg-amber-500/25'
                              : 'bg-[#E2E6F0] dark:bg-slate-700'
                      }`}
                    />
                    {s.done ? (
                      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#2FA36B] text-white shadow-[0_5px_12px_rgba(47,163,107,0.4)]">
                        <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
                      </span>
                    ) : isCurrent ? (
                      <span className="relative flex h-14 w-14 items-center justify-center bg-[#635BDF] text-white shadow-[0_6px_16px_rgba(99,91,223,0.5)] ring-4 ring-[#635BDF]/25 [clip-path:polygon(25%_3%,75%_3%,100%_50%,75%_97%,25%_97%,0_50%)]">
                        <Sparkles className="h-6 w-6" aria-hidden />
                      </span>
                    ) : isChallenge ? (
                      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#E8A020] shadow-[0_5px_12px_rgba(232,160,32,0.35)] ring-2 ring-inset ring-[#EFB93E] dark:bg-slate-800">
                        <Flag className="h-6 w-6" aria-hidden />
                      </span>
                    ) : (
                      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#E9EDF4] text-[#A7ADC0] shadow-sm dark:bg-slate-700 dark:text-slate-500">
                        <Lock className="h-6 w-6" aria-hidden />
                      </span>
                    )}
                  </Link>
                  <div
                    className="absolute z-10 w-28 -translate-y-1/2 text-center"
                    style={labelRight
                      ? { left: `calc(${pos.x}% + 42px)`, top: `${pos.y}%` }
                      : { right: `calc(${100 - pos.x}% + 42px)`, top: `${pos.y}%` }}
                  >
                    <p className={`text-[13px] font-extrabold leading-snug ${titleColor}`}>{t(s.labelKey)}</p>
                    <p className="mt-0.5 text-[11px] font-medium leading-snug text-[#8B8BA3] dark:text-slate-400">{t(s.subKey)}</p>
                  </div>
                </div>
              );
            })}

            {challenge && challengePos && (
              <div
                className="absolute z-10 flex w-[76px] -translate-x-1/2 flex-col items-center"
                style={{ left: `${branchX}%`, bottom: `calc(${100 - challengePos.y}% + 38px)` }}
              >
                <Trophy className="h-5 w-5 text-[#D9A91F]" aria-hidden />
                <p className="mt-0.5 whitespace-nowrap text-[11px] font-extrabold text-[#C9860A] dark:text-amber-400">
                  {t('journeyAchievementSoon')}
                </p>
                <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(160deg,#F7CE5B,#E5A21B)] text-white shadow-[0_4px_10px_rgba(232,160,32,0.45)]">
                  <Gift className="h-4 w-4" aria-hidden />
                </span>
                <span className="mt-1 whitespace-nowrap rounded-full bg-[#FDF3D9] px-2 py-0.5 text-[11px] font-extrabold text-[#B97F0E] ring-1 ring-inset ring-[#F0D489] dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">
                  {t('comingSoon')}
                </span>
                <span aria-hidden className="mt-0.5 h-3 w-0 border-l-2 border-dashed border-[#E3B341]" />
              </div>
            )}
          </div>
        </section>

        {/* ── Current mission ───────────────────────────────────────── */}
        <section
          aria-label={t('journeyMissionNowTitle')}
          data-testid="journey-current-mission"
          className="journey-enter journey-enter-3 overflow-hidden rounded-[18px] border border-[#ECE7FB] bg-white text-[#242640] shadow-[0_8px_24px_rgba(99,91,223,0.06)] dark:border-slate-700 dark:bg-slate-800 dark:text-white lg:col-start-2 lg:row-start-4"
        >
          <span aria-hidden className="block h-[3px] bg-[#635BDF]" />
          {allDone ? (
            <div className="p-2">
              <Card>
                <EmptyState
                  icon={CheckCircle2}
                  title={t('journeyAllStagesDone')}
                  description={t('journeyAllStagesDoneDesc')}
                />
              </Card>
            </div>
          ) : (
            <div className="p-4">
              <p className="flex items-center gap-1.5 text-sm font-extrabold text-[#635BDF] dark:text-brand-300">
                {t('journeyMissionNowTitle')}
                <Crosshair className="h-4 w-4" aria-hidden />
              </p>
              <h2 className="mt-1.5 text-balance text-xl font-black tracking-tight">{t(currentStage.labelKey)}</h2>
              <p className="mt-1 truncate text-[13px] font-medium text-[#8B8BA3] dark:text-slate-400">{t(currentStage.subKey)}</p>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-[#E9E5F8] dark:bg-slate-700"
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
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#FDF3D9] px-2.5 py-1.5 text-xs font-extrabold text-[#B97F0E] ring-1 ring-inset ring-[#F0D489] dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">
                  <Gift className="h-3.5 w-3.5" aria-hidden />
                  {t('comingSoon')}
                </span>
                <Link
                  href={currentStage.href}
                  aria-label={`${t('journeyContinueMission')}: ${t(currentStage.labelKey)}`}
                  className="inline-flex touch-manipulation items-center justify-center gap-1.5 rounded-[13px] bg-[#635BDF] px-4 py-2.5 text-[15px] font-extrabold text-white shadow-[0_4px_12px_rgba(99,91,223,0.35)] transition-colors hover:bg-[#5249C7] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF]"
                >
                  {t('journeyContinueMission')}
                  <CtaChevron className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* ── Rewards entry ─────────────────────────────────────────── */}
        <section aria-label={t('journeyRewardsTitle')} className="journey-enter journey-enter-3 lg:col-start-1 lg:row-start-4 lg:self-end">
          <Link
            href="/student/results"
            className="flex touch-manipulation items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#6F5EF2,#5A48D8)] px-4 py-3.5 text-center text-[15px] font-extrabold text-white shadow-[0_6px_16px_rgba(99,91,223,0.35)] transition-[filter,transform] hover:brightness-110 motion-safe:active:scale-[0.99] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF]"
          >
            {t('journeyRewardsTitle')}
          </Link>
        </section>
      </div>
    </div>
  );
}

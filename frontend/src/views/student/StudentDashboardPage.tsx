import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';
import { useT } from '../../i18n';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { MyTeacher, StudentDashboard } from '../../lib/types';
import { formatDate, formatTime } from '../../lib/format';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { Avatar } from '../../components/ui/Avatar';
import { DashboardHero } from '../../components/dashboard/DashboardHero';
import { SectionTitle } from '../../components/dashboard/SectionTitle';
import { ProgressRing } from '../../components/dashboard/ProgressRing';
import { LearningPath, type PathStep } from '../../components/dashboard/LearningPath';
import { LessonItem } from '../../components/dashboard/LessonItem';
import { SubjectBadge } from '../../components/dashboard/SubjectBadge';
import { AchievementTile } from '../../components/dashboard/AchievementTile';

function attendanceStreak(attendance: StudentDashboard['attendance']): number {
  const dateSet = new Set(
    attendance.map((a) => {
      const d = new Date(a.lesson.date);
      d.setHours(0, 0, 0, 0);
      return d.toDateString();
    }),
  );
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!dateSet.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (dateSet.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const EXPLORE_CHIPS = [
  { href: '/centers', icon: Building2, labelKey: 'searchCenters' },
  { href: '/teachers', icon: GraduationCap, labelKey: 'searchTeachersLabel' },
  { href: '/student/lessons', icon: CalendarDays, labelKey: 'myBookings' },
  { href: '/student/followed', icon: Building2, labelKey: 'followedCenters' },
] as const;

export default function StudentDashboardPage() {
  const { t, dir } = useT();
  const { user } = useAuth();
  const { data, initialLoading, error } = useApi(() => api.get<StudentDashboard>('/students/dashboard'), []);
  const { data: teachers } = useApi(() => api.getMyTeachers<MyTeacher[]>(), []);
  const { data: followed } = useApi(
    () =>
      api.getFollowedCenters() as Promise<import('../../lib/api').ApiResponse<import('../../lib/api').PublicCenter[]>>,
    [],
  );

  if (initialLoading) return <PencilLoader label={t('loadingDashboard')} />;
  if (error || !data) return <Alert message={error || t('failedLoadDashboard')} />;

  const present = data.attendance.filter((a) => a.status === 'PRESENT').length;
  const totalAtt = data.attendance.length;
  const attPct = totalAtt ? Math.round((present / totalAtt) * 100) : 0;
  const streak = attendanceStreak(data.attendance);
  const pending = data.pendingAssignments.filter((a) => !a.submitted);
  const donePercentages = data.recentResults
    .map((r) => r.percentage)
    .filter((p): p is number => p !== null);
  const avgResult = donePercentages.length ? Math.round(donePercentages.reduce((s, p) => s + p, 0) / donePercentages.length) : 0;
  const today = data.todayLessons;
  const upcoming = data.upcomingLessons;
  const exams = data.upcomingExams;
  const firstName = (user?.fullName ?? '').trim().split(/\s+/)[0] || '';

  const satisfied = [today.length > 0, pending.length === 0, exams.length === 0];
  const pathSteps: PathStep[] = [
    {
      id: 'study',
      label: t('studyStep'),
      sub: today.length ? t('focusLessonsToday', { count: today.length }) : t('noLessonsToday'),
      state: satisfied.slice(0, 1).every(Boolean) ? (satisfied[0] ? 'done' : 'current') : 'todo',
      href: '/student/lessons',
    },
    {
      id: 'homework',
      label: t('homeworkStep'),
      sub: pending.length ? t('focusPendingHomework') : t('allCaughtUp'),
      state: satisfied.slice(0, 2).every(Boolean) ? (satisfied[1] ? 'done' : 'current') : 'todo',
      href: '/student/assignments',
    },
    {
      id: 'exams',
      label: t('examStep'),
      sub: exams.length ? t('focusUpcomingExam') : t('noUpcomingExams'),
      state: satisfied.every(Boolean) ? (satisfied[2] ? 'done' : 'current') : 'todo',
      href: '/student/exams',
    },
  ];
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <DashboardHero
        tone="brand"
        eyebrow={
          <>
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t('focusNext')}
          </>
        }
        title={t('dashGreeting', { name: firstName })}
        sub={t('studentHeroSub')}
        meta={
          <>
            <ProgressRing
              value={attPct}
              size={52}
              tone="brand"
              label={<span>{attPct}%</span>}
              ariaLabel={t('attendanceRate')}
            />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('attendanceRate')}
            </span>
            <span className="h-4 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-700">
              {t('dayStreak')} · {streak}
            </span>
          </>
        }
        cta={
          <Link href="/student/lessons">
            <Button size="lg">
              {t('openSchedule')} <Arrow className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      {/* Overview stats */}
      <div>
        <SectionTitle icon={Target} title={t('focusNext')} sub={t('studentHeroSub')} />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <AchievementTile
            icon={CalendarDays}
            value={today.length}
            label={t('todaysLessons')}
            tone="brand"
            hint={t('focusLessonsToday', { count: today.length })}
          />
          <AchievementTile
            icon={ClipboardList}
            value={pending.length}
            label={t('pendingHomework')}
            tone="gold"
            hint={pending.length ? t('focusPendingHomework') : t('allCaughtUp')}
          />
          <AchievementTile
            icon={FileQuestion}
            value={exams.length}
            label={t('upcomingExams')}
            tone="violet"
            hint={exams.length ? t('focusUpcomingExam') : t('noUpcomingExams')}
          />
          <AchievementTile
            icon={GraduationCap}
            value={donePercentages.length ? `${avgResult}%` : '—'}
            label={t('resultsAvg')}
            tone="teal"
            hint={t('recentResults')}
          />
        </div>
      </div>

      {/* Today + Learning path */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          title={t('todaysLessons')}
          subtitle={t('myLessonSchedule')}
          action={
            <Link href="/student/lessons">
              <Button variant="ghost" size="sm">
                {t('viewAll')} <Arrow className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
          className="lg:col-span-2"
          bodyClassName="p-3 sm:p-4"
        >
          {today.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={t('noLessonsToday')}
              description={t('noUpcomingLessons')}
              action={
                <Link href="/student/lessons">
                  <Button size="sm" variant="secondary">{t('openSchedule')}</Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {today.map((l) => (
                <LessonItem key={l.id} lesson={l} showLocation />
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('learningPath')} bodyClassName="p-4">
          <LearningPath steps={pathSteps} />
        </Card>
      </div>

      {/* Upcoming + homework */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title={t('upcomingLessons')}
          subtitle={t('myLessonSchedule')}
          action={
            <Link href="/student/lessons">
              <Button variant="ghost" size="sm">{t('viewAll')} <Arrow className="h-3.5 w-3.5" /></Button>
            </Link>
          }
          bodyClassName="p-3 sm:p-4"
        >
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('noUpcomingLessons')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {upcoming.slice(0, 4).map((l) => (
                <LessonItem key={l.id} lesson={l} showDate />
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={t('pendingHomework')}
          subtitle={t('assignmentsFromTeachers')}
          action={
            <Link href="/student/assignments">
              <Button variant="ghost" size="sm">{t('openHomework')} <Arrow className="h-3.5 w-3.5" /></Button>
            </Link>
          }
          bodyClassName="p-3 sm:p-4"
        >
          {pending.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('allCaughtUp')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {pending.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{a.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t('due')} {formatDate(a.deadline)}
                    </p>
                  </div>
                  <SubjectBadge subject={a.subject?.name} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Results */}
      <Card
        title={t('recentResults')}
        subtitle={t('resultsSub')}
        action={
          <Link href="/student/results">
            <Button variant="ghost" size="sm">{t('viewAll')} <Arrow className="h-3.5 w-3.5" /></Button>
          </Link>
        }
        bodyClassName="p-3 sm:p-4"
      >
        {data.recentResults.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">{t('noResultsYet')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.recentResults.slice(0, 4).map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition-colors dark:border-slate-700 dark:bg-slate-800/70"
              >
                <ProgressRing value={r.percentage ?? 0} size={40} strokeWidth={4} tone={r.percentage !== null && r.percentage >= 50 ? 'green' : 'coral'} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{r.exam.name}</p>
                  <p className="truncate text-xs text-slate-500">{r.exam.subject?.name ?? t('examFallback')}</p>
                </div>
                {r.percentage !== null ? (
                  <Badge tone={r.percentage >= 50 ? 'green' : 'amber'}>{r.percentage}%</Badge>
                ) : (
                  <Badge tone="amber">{t('pending')}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Teachers */}
      {teachers && teachers.length > 0 && (
        <div>
          <SectionTitle
            icon={GraduationCap}
            title={t('myTeachers')}
            action={
              <Link href="/teachers">
                <Button variant="ghost" size="sm">{t('findMore')} <Arrow className="h-3.5 w-3.5" /></Button>
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.slice(0, 6).map((teacher) => (
              <Link
                key={teacher.id}
                href={`/teachers/${teacher.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-elevated dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500/50"
              >
                <Avatar name={teacher.fullName} src={teacher.photo} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
                    {teacher.fullName}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {teacher.subjects.slice(0, 2).map((s) => (
                      <SubjectBadge key={s.id} subject={s.name} className="px-2 py-px text-[10px]" />
                    ))}
                  </div>
                  {teacher.upcomingLesson && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      {t('nextLabel')} {formatDate(teacher.upcomingLesson.date)} · {formatTime(teacher.upcomingLesson.startTime)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Explore */}
      <div>
        <SectionTitle icon={Search} title={t('exploreMore')} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {EXPLORE_CHIPS.map((chip) => {
            const Icon = chip.icon;
            const count =
              chip.href === '/student/followed' && followed ? ` (${followed.length})` : '';
            return (
              <Link
                key={chip.href}
                href={chip.href}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-elevated dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500/50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-transform duration-200 group-hover:scale-110 dark:bg-brand-500/15 dark:text-brand-300">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t(chip.labelKey as import('../../i18n').DictKey)}
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
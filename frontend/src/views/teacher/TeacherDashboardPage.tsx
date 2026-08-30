import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ClipboardList,
  FileText,
  GraduationCap,
  Star,
  Target,
  Users,
} from 'lucide-react';
import { useT } from '../../i18n';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { Lesson, TeacherStats } from '../../lib/types';

import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { DashboardHero } from '../../components/dashboard/DashboardHero';
import { SectionTitle } from '../../components/dashboard/SectionTitle';
import { AchievementTile } from '../../components/dashboard/AchievementTile';
import { LearningPath, type PathStep } from '../../components/dashboard/LearningPath';
import { LessonItem, lessonStatusMeta } from '../../components/dashboard/LessonItem';
import { formatTime } from '../../lib/format';

export default function TeacherDashboardPage() {
  const { t, dir } = useT();
  const { user } = useAuth();
  const { data, initialLoading, error } = useApi(() => api.get<TeacherStats>('/teachers/me/stats'), []);

  if (initialLoading) return <PencilLoader label={t('loadingDashboard')} />;
  if (error || !data) return <Alert message={error || t('failedLoadDashboard')} />;

  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const me: Lesson['teacher'] = {
    id: user?.id ?? '',
    fullName: user?.fullName ?? '',
    photo: user?.photo ?? null,
  };
  const asLesson = (l: TeacherStats['upcomingLessonsList'][number]): Lesson => ({
    id: l.id,
    date: l.date,
    startTime: l.startTime,
    endTime: l.endTime,
    status: l.status as Lesson['status'],
    notes: null,
    subject: l.subject,
    location: null,
    teacher: me,
    student: { id: l.student.id, fullName: l.student.fullName, photo: null },
  });

  const satisfied = [data.todayLessons > 0, data.pendingAssignments === 0, data.upcomingExams === 0];
  const pathSteps: PathStep[] = [
    {
      id: 'teach',
      label: t('classStep'),
      sub: t('focusTodayClasses', { count: data.todayLessons }),
      state: satisfied.slice(0, 1).every(Boolean) ? (satisfied[0] ? 'done' : 'current') : 'todo',
      href: '/teacher/lessons',
    },
    {
      id: 'grade',
      label: t('gradingStep'),
      sub: data.pendingAssignments ? t('pendingHomework') : t('allCaughtUp'),
      state: satisfied.slice(0, 2).every(Boolean) ? (satisfied[1] ? 'done' : 'current') : 'todo',
      href: '/teacher/assignments',
    },
    {
      id: 'exams',
      label: t('examPrepStep'),
      sub: data.upcomingExams ? t('upcomingExams') : t('noUpcomingExams'),
      state: satisfied.every(Boolean) ? (satisfied[2] ? 'done' : 'current') : 'todo',
      href: '/teacher/exams',
    },
  ];

  const quickLinks = [
    { to: '/teacher/lessons', label: t('scheduleLesson'), icon: Calendar },
    { to: '/teacher/assignments', label: t('createHomework'), icon: ClipboardList },
    { to: '/teacher/exams', label: t('createExam'), icon: FileText },
    { to: '/teacher/students', label: t('myStudents'), icon: Users },
  ];

  const sorted = [...data.upcomingLessonsList].sort((a, b) => (a.startTime < b.startTime ? -1 : 1));

  return (
    <div className="space-y-6">
      <PageHeader title={t('teacherDashTitle')} subtitle={t('teacherDashSub')} />

      <DashboardHero
        tone="gold"
        eyebrow={
          <>
            <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
            {t('avgTeacherRating')} · {data.averageRating.toFixed(1)}
          </>
        }
        title={t('dashGreeting', { name: (user?.fullName ?? '').trim().split(/\s+/)[0] || '' })}
        sub={t('teacherHeroSub')}
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-700">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden />
              {t('myStudents')} · {data.totalStudents}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-700">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {t('completedLessonsStat')} · {data.completedLessons}
            </span>
          </>
        }
        cta={
          <Link href="/teacher/lessons">
            <Button size="lg">
              {t('scheduleLesson')} <Arrow className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      {/* Overview stats */}
      <div>
        <SectionTitle icon={Target} title={t('focusNext')} sub={t('teacherDashSub')} />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <AchievementTile
            icon={Calendar}
            value={data.todayLessons}
            label={t('lessonsToday')}
            tone="gold"
            hint={t('focusTodayClasses', { count: data.todayLessons })}
          />
          <AchievementTile
            icon={ClipboardList}
            value={data.pendingAssignments}
            label={t('pendingHomework')}
            tone="brand"
            hint={data.pendingAssignments ? t('gradingStep') : t('allCaughtUp')}
          />
          <AchievementTile
            icon={FileText}
            value={data.upcomingExams}
            label={t('upcomingExams')}
            tone="violet"
            hint={t('examPrepStep')}
          />
          <AchievementTile
            icon={Star}
            value={`${data.averageRating.toFixed(1)} ★`}
            label={t('avgTeacherRating')}
            tone="green"
            hint={t('teacherRatingsSub')}
          />
        </div>
      </div>

      {/* Lessons + path */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          title={t('upcomingLessons')}
          subtitle={t('bookedLessonsSub')}
          action={
            <Link href="/teacher/lessons">
              <Button variant="ghost" size="sm">
                {t('viewSchedule')} <Arrow className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
          className="lg:col-span-2"
          bodyClassName="p-3 sm:p-4"
        >
          {sorted.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('noUpcomingScheduled')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {sorted.slice(0, 6).map((l) => (
                <LessonItem key={l.id} lesson={asLesson(l)} showStudent showDate />
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('learningPath')} bodyClassName="p-4">
          <LearningPath steps={pathSteps} />
        </Card>
      </div>

      {/* Roster + tools */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title={t('myStudents')}
          subtitle={t('studentRosterSub')}
          action={
            <Link href="/teacher/students">
              <Button variant="ghost" size="sm">
                {t('openRoster')} <Arrow className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
          bodyClassName="p-3 sm:p-4"
        >
          <div className="flex items-center gap-4 p-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-100 text-2xl font-bold text-gold-700 dark:bg-gold-500/15 dark:text-gold-300">
              {data.totalStudents}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('studentRosterSub')}</p>
          </div>
        </Card>

        <Card title={t('exploreMore')} bodyClassName="p-4">
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((q) => {
              const Icon = q.icon;
              return (
                <Link
                  key={q.to}
                  href={q.to}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-elevated dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-gold-500/50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-600 transition-transform duration-200 group-hover:scale-110 dark:bg-gold-500/15 dark:text-gold-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{q.label}</span>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Next class */}
      {sorted[0] && (() => {
        const meta = lessonStatusMeta(sorted[0].status, t);
        return (
          <Card title={t('upNext')} bodyClassName="p-3 sm:p-4" className="hidden lg:block">
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-gold-300 bg-gold-50/50 px-4 py-3 dark:border-gold-500/30 dark:bg-gold-500/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10 text-gold-600 dark:text-gold-300">
                <Calendar className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{sorted[0].student.fullName}</p>
              <p className="text-xs text-slate-500">
                {sorted[0].subject?.name ?? t('generalSubject')} · {formatTime(sorted[0].startTime)}
              </p>
              <div className="ms-auto">
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
            </div>
          </Card>
        );
      })()}
    </div>
  );
}

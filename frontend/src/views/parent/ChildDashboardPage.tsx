'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CalendarDays, ClipboardList, FileQuestion, TrendingUp } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useT } from '../../i18n';
import type { StudentDashboard } from '../../lib/types';
import { formatDateTime } from '../../lib/format';
import { DashboardHero } from '../../components/dashboard/DashboardHero';
import { ProgressRing } from '../../components/dashboard/ProgressRing';
import { LessonItem } from '../../components/dashboard/LessonItem';

interface ChildDashboardData extends StudentDashboard {
  student: {
    id: string;
    userId: string;
    fullName: string;
    photo: string | null;
    grade: { id: string; name: string } | null;
    teachers: { id: string; fullName: string; photo: string | null }[];
  };
}

export default function ChildDashboardPage() {
  const { t, dir } = useT();
  const params = useParams<{ studentId: string }>();
  const studentId = params?.studentId ?? '';
  const { data, initialLoading, error } = useApi(
    () => api.get<ChildDashboardData>(`/parents/children/${studentId}/dashboard`),
    [studentId],
  );

  if (initialLoading) return <PencilLoader label={t('loadingChildDashboard')} />;
  if (error || !data) return <Alert message={error || t('failedLoadChildDashboard')} />;

  const present = data.attendance.filter((a) => a.status === 'PRESENT').length;
  const totalAtt = data.attendance.length;
  const attPct = totalAtt ? Math.round((present / totalAtt) * 100) : 0;
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6">
      <DashboardHero
        tone="violet"
        eyebrow={
          <>
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            {data.student.grade?.name ?? t('noGrade')}
          </>
        }
        title={data.student.fullName}
        sub={t('studentHeroSub')}
        meta={
          <>
            <ProgressRing value={attPct} size={52} strokeWidth={6} tone="violet" label={<span className="text-xs font-bold">{attPct}%</span>} ariaLabel={t('attendanceRate')} />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('attendanceRate')}</span>
          </>
        }
      />

      {/* Teachers */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('teachersOf')}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.student.teachers.length === 0 ? (
            <span className="text-sm text-slate-400">{t('noTeachersAssigned')}</span>
          ) : (
            data.student.teachers.map((teacher) => (
              <Link key={teacher.id} href={`/teachers/${teacher.id}`} className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm transition-all hover:border-brand-300 hover:shadow-elevated dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500/40">
                <Avatar name={teacher.fullName} src={teacher.photo} size="sm" />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-brand-700 dark:group-hover:text-brand-300">{teacher.fullName}</span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label={t('todaysLessons')} value={data.todayLessons.length} icon={CalendarDays} />
        <StatCard label={t('upcomingExams')} value={data.upcomingExams.length} icon={FileQuestion} />
        <StatCard label={t('pendingHomework')} value={data.pendingAssignments.filter((a) => !a.submitted).length} icon={ClipboardList} />
        <StatCard label={t('attendance')} value={totalAtt ? `${attPct}%` : '—'} icon={TrendingUp} />
      </div>

      {/* Lessons grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title={t('upcomingLessons')}
          subtitle={t('myLessonSchedule')}
          action={
            <Link href={`/parent/children/${studentId}/lessons`}>
              <Button variant="ghost" size="sm">{t('viewAll')} <Arrow className="h-3.5 w-3.5" /></Button>
            </Link>
          }
          bodyClassName="p-3 sm:p-4"
        >
          {data.upcomingLessons.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('noUpcomingLessons')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {data.upcomingLessons.slice(0, 5).map((l) => (
                <LessonItem key={l.id} lesson={l} showTeacher showLocation />
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={t('pendingHomework')}
          subtitle={t('assignmentsFromTeachers')}
          action={
            <Link href={`/parent/children/${studentId}/assignments`}>
              <Button variant="ghost" size="sm">{t('openHomework')} <Arrow className="h-3.5 w-3.5" /></Button>
            </Link>
          }
          bodyClassName="p-3 sm:p-4"
        >
          {data.pendingAssignments.filter((a) => !a.submitted).length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('allCaughtUp')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {data.pendingAssignments
                .filter((a) => !a.submitted)
                .slice(0, 5)
                .map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{a.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{t('due')} {formatDateTime(a.deadline)}</p>
                    </div>
                    {a.subject && <Badge tone="blue">{a.subject.name}</Badge>}
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Exams + Results */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title={t('upcomingExams')}
          action={
            <Link href={`/parent/children/${studentId}/exams`}>
              <Button variant="ghost" size="sm">{t('viewAll')} <Arrow className="h-3.5 w-3.5" /></Button>
            </Link>
          }
        >
          {data.upcomingExams.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('noUpcomingExams')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {data.upcomingExams.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{e.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(e.startTime)} · {e.subject?.name ?? t('generalSubject')}</p>
                  </div>
                  <Badge tone="violet">{t('examStep')}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={t('recentResults')}
          action={
            <Link href={`/parent/children/${studentId}/exams`}>
              <Button variant="ghost" size="sm">{t('viewAll')} <Arrow className="h-3.5 w-3.5" /></Button>
            </Link>
          }
        >
          {data.recentResults.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('noResultsYet')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {data.recentResults.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{r.exam.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{r.exam.subject?.name ?? t('examFallback')} · {formatDateTime(r.submittedAt)}</p>
                  </div>
                  <Badge tone={r.percentage !== null && r.percentage >= 50 ? 'green' : 'amber'}>
                    {r.percentage !== null ? `${r.percentage}%` : t('pending')}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
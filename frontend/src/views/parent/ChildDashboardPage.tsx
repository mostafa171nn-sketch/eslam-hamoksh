'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, ClipboardList, FileQuestion, TrendingUp } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { StudentDashboard } from '../../lib/types';
import { formatDateTime, formatTime } from '../../lib/format';
import { useT } from '../../i18n';

interface ChildDashboardData extends StudentDashboard {
  student: {
    id: string;
    fullName: string;
    photo: string | null;
    grade: { id: string; name: string } | null;
    teachers: { id: string; fullName: string; photo: string | null }[];
  };
}

export default function ChildDashboardPage() {
  const { t } = useT();
  const params = useParams<{ studentId: string }>();
  const studentId = params?.studentId ?? '';
  const { data, initialLoading, error } = useApi(
    () => api.get<ChildDashboardData>(`/parents/children/${studentId}/dashboard`),
    [studentId],
  );

  if (initialLoading) return <PencilLoader label={t('loadingChildDashboard')} />;
  if (error || !data) return <Alert message={error || t('failedLoadChildDashboard')} />;

  const present = data.attendance.filter((a) => a.status === 'PRESENT').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.student.fullName}
        subtitle={data.student.grade?.name ?? t('noGrade')}
      />

      <div className="flex flex-wrap gap-4">
        <Avatar name={data.student.fullName} src={data.student.photo} size="xl" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-slate-900 dark:text-white">{t('teachersOf')}</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.student.teachers.length === 0 ? (
              <span className="text-sm text-slate-400">{t('noTeachersAssigned')}</span>
            ) : (
              data.student.teachers.map((teacher) => (
                <div key={teacher.id} className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white px-3 py-1.5 text-sm">
                  <Avatar name={teacher.fullName} src={teacher.photo} size="sm" />
                  <span className="font-medium text-slate-800 dark:text-slate-100">{teacher.fullName}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t('todaysLessons')} value={data.todayLessons.length} icon={CalendarDays} />
        <StatCard label={t('upcomingExams')} value={data.upcomingExams.length} icon={FileQuestion} />
        <StatCard label={t('pendingHomework')} value={data.pendingAssignments.filter((a) => !a.submitted).length} icon={ClipboardList} />
        <StatCard label={t('attendance')} value={data.attendance.length ? `${Math.round((present / data.attendance.length) * 100)}%` : '—'} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title={t('upcomingLessons')}>
          {data.upcomingLessons.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('noUpcomingLessons')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.upcomingLessons.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{l.subject?.name ?? t('generalSubject')}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDateTime(l.date)} · {formatTime(l.startTime)} · {l.teacher.fullName}
                    </p>
                  </div>
                  <StatusBadge status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('pendingHomework')}>
          {data.pendingAssignments.filter((a) => !a.submitted).length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('allCaughtUp')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
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

        <Card
          title={t('upcomingExams')}
          action={
            <Link href={`/parent/children/${studentId}/exams`}>
              <Button variant="ghost" size="sm">{t('viewAll')}</Button>
            </Link>
          }
        >
          {data.upcomingExams.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('noUpcomingExams')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.upcomingExams.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{e.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(e.startTime)}</p>
                  </div>
                  {e.subject && <Badge tone="blue">{e.subject.name}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={t('recentResults')}
          action={
            <Link href={`/parent/children/${studentId}/exams`}>
              <Button variant="ghost" size="sm">{t('viewAll')}</Button>
            </Link>
          }
        >
          {data.recentResults.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('noResultsYet')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.recentResults.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{r.exam.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {r.exam.subject?.name ?? t('examFallback')} · {formatDateTime(r.submittedAt)}
                    </p>
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

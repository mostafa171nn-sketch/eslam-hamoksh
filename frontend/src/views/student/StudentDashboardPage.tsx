import Link from 'next/link';
import { BookOpen, CalendarDays, ClipboardList, FileQuestion, TrendingUp, ArrowRight, GraduationCap, Building2, Bell, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { Button } from '../../components/ui/Button';
import { useT, type Dict } from '../../i18n';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { MyTeacher, StudentDashboard } from '../../lib/types';
import { formatDateTime, formatDate, formatTime } from '../../lib/format';

function lessonStatusKey(status: string): keyof Dict {
  switch (status) {
    case 'SCHEDULED':
      return 'scheduled';
    case 'RESCHEDULED':
      return 'rescheduled';
    case 'COMPLETED':
      return 'completedStatus';
    case 'CANCELLED':
      return 'cancelled';
    case 'NO_SHOW':
      return 'noShowAction';
    default:
      return 'status';
  }
}

export default function StudentDashboardPage() {
  const { t } = useT();
  const { data, initialLoading, error } = useApi(() => api.get<StudentDashboard>('/students/dashboard'), []);
  const { data: teachers } = useApi(() => api.getMyTeachers<MyTeacher[]>(), []);
  const { data: followed } = useApi(() => api.getFollowedCenters() as Promise<import('../../lib/api').ApiResponse<import('../../lib/api').PublicCenter[]>>, []);

  if (initialLoading) return <PencilLoader label={t('loadingDashboard')} />;
  if (error || !data) return <Alert message={error || t('failedLoadDashboard')} />;

  const present = data.attendance.filter((a) => a.status === 'PRESENT').length;

  return (
    <div className="space-y-6">
      <Card title={t('discover')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/centers" className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 text-center hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:hover:bg-slate-800">
            <Building2 className="h-6 w-6 text-brand-600" />
            <span className="text-sm font-medium">{t('searchCenters')}</span>
          </Link>
          <Link href="/teachers" className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 text-center hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:hover:bg-slate-800">
            <Search className="h-6 w-6 text-brand-600" />
            <span className="text-sm font-medium">{t('searchTeachersLabel')}</span>
          </Link>
          <Link href="/student/lessons" className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 text-center hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:hover:bg-slate-800">
            <CalendarDays className="h-6 w-6 text-brand-600" />
            <span className="text-sm font-medium">{t('myBookings')}</span>
          </Link>
          <Link href="/student/followed" className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 text-center hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:hover:bg-slate-800">
            <Building2 className="h-6 w-6 text-brand-600" />
            <span className="text-sm font-medium">{t('followedCenters')}{followed ? ` (${followed.length})` : ''}</span>
          </Link>
          <Link href="/notifications" className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 text-center hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:hover:bg-slate-800">
            <Bell className="h-6 w-6 text-brand-600" />
            <span className="text-sm font-medium">{t('notifications')}</span>
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t('todaysLessons')} value={data.todayLessons.length} icon={CalendarDays} />
        <StatCard label={t('upcomingExams')} value={data.upcomingExams.length} icon={FileQuestion} />
        <StatCard label={t('pendingHomework')} value={data.pendingAssignments.filter((a) => !a.submitted).length} icon={ClipboardList} />
        <StatCard label={t('attendance')} value={data.attendance.length ? `${Math.round((present / data.attendance.length) * 100)}%` : '—'} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title={t('todaysLessons')}
          action={
            <Link href="/student/lessons">
              <Button variant="ghost" size="sm">{t('viewAll')} <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          }
        >
          {data.todayLessons.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('noLessonsToday')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.todayLessons.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{l.subject?.name ?? t('generalSubject')}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatTime(l.startTime)} – {formatTime(l.endTime)} · {l.teacher.fullName}
                    </p>
                  </div>
                  <Badge tone={statusTone(l.status)}>{t(lessonStatusKey(l.status))}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

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
                  <Badge tone={statusTone(l.status)}>{t(lessonStatusKey(l.status))}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={t('pendingHomework')}
          action={
            <Link href="/student/assignments">
              <Button variant="ghost" size="sm">{t('viewAll')} <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          }
        >
          {data.pendingAssignments.filter((a) => !a.submitted).length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('allCaughtUp')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.pendingAssignments
                .filter((a) => !a.submitted)
                .slice(0, 5)
                .map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{a.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{t('due')} {formatDateTime(a.deadline)}</p>
                      </div>
                    </div>
                    {a.subject && <Badge tone="blue">{a.subject.name}</Badge>}
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card
          title={t('recentResults')}
          action={
            <Link href="/student/results">
              <Button variant="ghost" size="sm">{t('viewAll')} <ArrowRight className="h-3.5 w-3.5" /></Button>
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

      {teachers && teachers.length > 0 && (
        <Card
          title={t('myTeachers')}
          action={
            <Link href="/teachers">
              <Button variant="ghost" size="sm">{t('findMore')} <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          }
        >
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {teachers.map((teacher) => (
              <li key={teacher.id} className="flex items-center justify-between gap-3 py-3">
                <Link href={`/teachers/${teacher.id}`} className="flex min-w-0 flex-1 items-center gap-3 group">
                  <Avatar name={teacher.fullName} src={teacher.photo} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white group-hover:text-brand-700">
                      {teacher.fullName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {teacher.subjects.slice(0, 2).map((s) => s.name).join(', ') || t('generalSubject')}
                    </p>
                  </div>
                </Link>
                <div className="shrink-0 text-end">
                  {teacher.upcomingLesson ? (
                    <p className="text-xs text-slate-500">
                      {t('nextLabel')} {formatDate(teacher.upcomingLesson.date)} · {formatTime(teacher.upcomingLesson.startTime)}
                    </p>
                  ) : (
                    <Link href={`/teachers/${teacher.id}`}>
                      <Button size="sm" variant="outline">
                        <GraduationCap className="h-4 w-4" /> {t('book')}
                      </Button>
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

    </div>
  );
}

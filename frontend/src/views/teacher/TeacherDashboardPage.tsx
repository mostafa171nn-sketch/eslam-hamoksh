import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  ClipboardList,
  FileText,
  GraduationCap,
  Star,
  Users,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useT, type Dict } from '../../i18n';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { TeacherStats } from '../../lib/types';
import { formatDateTime, formatTime } from '../../lib/format';

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

export default function TeacherDashboardPage() {
  const { t } = useT();
  const { data, initialLoading, error } = useApi(() => api.get<TeacherStats>('/teachers/me/stats'), []);

  if (initialLoading) return <PencilLoader label={t('loadingDashboard')} />;
  if (error || !data) return <Alert message={error || t('failedLoadDashboard')} />;

  const quickLinks = [
    { to: '/teacher/students', label: t('myStudents'), icon: Users },
    { to: '/teacher/lessons', label: t('scheduleLesson'), icon: Calendar },
    { to: '/teacher/assignments', label: t('createHomework'), icon: ClipboardList },
    { to: '/teacher/exams', label: t('createExam'), icon: FileText },
    { to: '/teacher/availability', label: t('updateAvailability'), icon: Calendar },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title={t('teacherDashTitle')} subtitle={t('teacherDashSub')} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 stagger-children">
        <StatCard label={t('myStudents')} value={data.totalStudents} icon={Users} />
        <StatCard label={t('lessonsToday')} value={data.todayLessons} icon={Calendar} />
        <StatCard label={t('upcomingLessons')} value={data.upcomingLessons} icon={Calendar} />
        <StatCard label={t('completedLessonsStat')} value={data.completedLessons} icon={Calendar} />
        <StatCard label={t('pendingHomework')} value={data.pendingAssignments} icon={ClipboardList} />
        <StatCard label={t('upcomingExams')} value={data.upcomingExams} icon={FileText} />
        <StatCard label={t('avgTeacherRating')} value={data.averageRating.toFixed(1)} icon={Star} />
        <StatCard label={t('totalStudents')} value={data.totalStudents} icon={GraduationCap} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
        {quickLinks.map((q) => {
          const Icon = q.icon;
          return (
            <Link
              key={q.to}
              href={q.to}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-brand-300 hover:shadow-elevated dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 transition-colors group-hover:bg-brand-100 dark:bg-brand-900/40">
                <Icon className="h-5 w-5 text-brand-600 dark:text-brand-300" />
              </div>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{q.label}</span>
            </Link>
          );
        })}
      </div>

      <Card
        className="mt-6"
        title={t('upcomingLessons')}
        subtitle={t('bookedLessonsSub')}
        action={
          <Link href="/teacher/lessons">
            <Button variant="ghost" size="sm">{t('viewSchedule')} <ArrowRight className="h-3.5 w-3.5" /></Button>
          </Link>
        }
      >
        {data.upcomingLessonsList.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">{t('noUpcomingScheduled')}</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {data.upcomingLessonsList.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={l.student.fullName} src={null} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{l.student.fullName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {l.subject?.name ?? t('generalSubject')} · {formatDateTime(l.date)} · {formatTime(l.startTime)}
                    </p>
                  </div>
                </div>
                <Badge tone={statusTone(l.status)}>{t(lessonStatusKey(l.status))}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

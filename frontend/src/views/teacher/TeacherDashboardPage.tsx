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
import { StatusBadge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { TeacherStats } from '../../lib/types';
import { formatDateTime, formatTime } from '../../lib/format';

export default function TeacherDashboardPage() {
  const { data, initialLoading, error } = useApi(() => api.get<TeacherStats>('/teachers/me/stats'), []);

  if (initialLoading) return <PencilLoader label="Loading dashboard…" />;
  if (error || !data) return <Alert message={error || 'Failed to load dashboard.'} />;

  const quickLinks = [
    { to: '/teacher/students', label: 'My students', icon: Users },
    { to: '/teacher/lessons', label: 'Schedule a lesson', icon: Calendar },
    { to: '/teacher/assignments', label: 'Create homework', icon: ClipboardList },
    { to: '/teacher/exams', label: 'Create an exam', icon: FileText },
    { to: '/teacher/availability', label: 'Update availability', icon: Calendar },
  ];

  return (
    <div>
      <PageHeader title="Teacher dashboard" subtitle="A quick look at your teaching schedule." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="My students" value={data.totalStudents} icon={Users} />
        <StatCard label="Lessons today" value={data.todayLessons} icon={Calendar} />
        <StatCard label="Upcoming lessons" value={data.upcomingLessons} icon={Calendar} />
        <StatCard label="Completed lessons" value={data.completedLessons} icon={Calendar} />
        <StatCard label="Pending homework" value={data.pendingAssignments} icon={ClipboardList} />
        <StatCard label="Upcoming exams" value={data.upcomingExams} icon={FileText} />
        <StatCard label="Average rating" value={data.averageRating.toFixed(1)} icon={Star} />
        <StatCard label="Total students" value={data.totalStudents} icon={GraduationCap} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((q) => {
          const Icon = q.icon;
          return (
            <Link
              key={q.to}
              href={q.to}
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                <Icon className="h-5 w-5 text-brand-600" />
              </div>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{q.label}</span>
            </Link>
          );
        })}
      </div>

      <Card
        className="mt-6"
        title="Upcoming lessons"
        subtitle="Booked lessons with your students."
        action={
          <Link href="/teacher/lessons">
            <Button variant="ghost" size="sm">View schedule <ArrowRight className="h-3.5 w-3.5" /></Button>
          </Link>
        }
      >
        {data.upcomingLessonsList.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No upcoming lessons scheduled.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {data.upcomingLessonsList.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={l.student.fullName} src={null} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{l.student.fullName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {l.subject?.name ?? 'General'} · {formatDateTime(l.date)} · {formatTime(l.startTime)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={l.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

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
  const params = useParams<{ studentId: string }>();
  const studentId = params?.studentId ?? '';
  const { data, initialLoading, error } = useApi(
    () => api.get<ChildDashboardData>(`/parents/children/${studentId}/dashboard`),
    [studentId],
  );

  if (initialLoading) return <PencilLoader label="Loading child dashboard…" />;
  if (error || !data) return <Alert message={error || 'Failed to load child dashboard.'} />;

  const present = data.attendance.filter((a) => a.status === 'PRESENT').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.student.fullName}
        subtitle={data.student.grade?.name ?? 'No grade'}
      />

      <div className="flex flex-wrap gap-4">
        <Avatar name={data.student.fullName} src={data.student.photo} size="xl" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-slate-900 dark:text-white">Teachers</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.student.teachers.length === 0 ? (
              <span className="text-sm text-slate-400">No teachers assigned yet.</span>
            ) : (
              data.student.teachers.map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white px-3 py-1.5 text-sm">
                  <Avatar name={t.fullName} src={t.photo} size="sm" />
                  <span className="font-medium text-slate-800 dark:text-slate-100">{t.fullName}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today's lessons" value={data.todayLessons.length} icon={CalendarDays} />
        <StatCard label="Upcoming exams" value={data.upcomingExams.length} icon={FileQuestion} />
        <StatCard label="Pending homework" value={data.pendingAssignments.filter((a) => !a.submitted).length} icon={ClipboardList} />
        <StatCard label="Attendance" value={data.attendance.length ? `${Math.round((present / data.attendance.length) * 100)}%` : '—'} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Upcoming lessons">
          {data.upcomingLessons.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No upcoming lessons.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.upcomingLessons.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{l.subject?.name ?? 'General'}</p>
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

        <Card title="Pending homework">
          {data.pendingAssignments.filter((a) => !a.submitted).length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">All caught up!</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.pendingAssignments
                .filter((a) => !a.submitted)
                .slice(0, 5)
                .map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{a.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">Due {formatDateTime(a.deadline)}</p>
                    </div>
                    {a.subject && <Badge tone="blue">{a.subject.name}</Badge>}
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card
          title="Upcoming exams"
          action={
            <Link href={`/parent/children/${studentId}/exams`}>
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          }
        >
          {data.upcomingExams.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No upcoming exams.</p>
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
          title="Recent results"
          action={
            <Link href={`/parent/children/${studentId}/exams`}>
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          }
        >
          {data.recentResults.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No results yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.recentResults.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{r.exam.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {r.exam.subject?.name ?? 'Exam'} · {formatDateTime(r.submittedAt)}
                    </p>
                  </div>
                  <Badge tone={r.percentage !== null && r.percentage >= 50 ? 'green' : 'amber'}>
                    {r.percentage !== null ? `${r.percentage}%` : 'Pending'}
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

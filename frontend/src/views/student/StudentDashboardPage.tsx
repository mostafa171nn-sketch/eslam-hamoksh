import Link from 'next/link';
import { BookOpen, CalendarDays, ClipboardList, FileQuestion, TrendingUp, ArrowRight, GraduationCap } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { Button } from '../../components/ui/Button';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { MyTeacher, StudentDashboard } from '../../lib/types';
import { formatDateTime, formatDate, formatTime } from '../../lib/format';

export default function StudentDashboardPage() {
  const { data, initialLoading, error } = useApi(() => api.get<StudentDashboard>('/students/dashboard'), []);
  const { data: teachers } = useApi(() => api.getMyTeachers<MyTeacher[]>(), []);

  if (initialLoading) return <PencilLoader label="Loading your dashboard…" />;
  if (error || !data) return <Alert message={error || 'Failed to load dashboard.'} />;

  const present = data.attendance.filter((a) => a.status === 'PRESENT').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today's lessons" value={data.todayLessons.length} icon={CalendarDays} />
        <StatCard label="Upcoming exams" value={data.upcomingExams.length} icon={FileQuestion} />
        <StatCard label="Pending homework" value={data.pendingAssignments.filter((a) => !a.submitted).length} icon={ClipboardList} />
        <StatCard label="Attendance" value={data.attendance.length ? `${Math.round((present / data.attendance.length) * 100)}%` : '—'} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Today's lessons"
          action={
            <Link href="/student/lessons">
              <Button variant="ghost" size="sm">View all <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          }
        >
          {data.todayLessons.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No lessons scheduled today.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.todayLessons.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{l.subject?.name ?? 'General'}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatTime(l.startTime)} – {formatTime(l.endTime)} · {l.teacher.fullName}
                    </p>
                  </div>
                  <StatusBadge status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

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

        <Card
          title="Pending homework"
          action={
            <Link href="/student/assignments">
              <Button variant="ghost" size="sm">View all <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          }
        >
          {data.pendingAssignments.filter((a) => !a.submitted).length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">All caught up!</p>
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
                        <p className="mt-0.5 text-xs text-slate-500">Due {formatDateTime(a.deadline)}</p>
                      </div>
                    </div>
                    {a.subject && <Badge tone="blue">{a.subject.name}</Badge>}
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card
          title="Recent results"
          action={
            <Link href="/student/results">
              <Button variant="ghost" size="sm">View all <ArrowRight className="h-3.5 w-3.5" /></Button>
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

      {teachers && teachers.length > 0 && (
        <Card
          title="My Teachers"
          action={
            <Link href="/teachers">
              <Button variant="ghost" size="sm">Find more <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          }
        >
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {teachers.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <Link href={`/teachers/${t.id}`} className="flex min-w-0 flex-1 items-center gap-3 group">
                  <Avatar name={t.fullName} src={t.photo} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white group-hover:text-brand-700">
                      {t.fullName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t.subjects.slice(0, 2).map((s) => s.name).join(', ') || 'General'}
                    </p>
                  </div>
                </Link>
                <div className="shrink-0 text-right">
                  {t.upcomingLesson ? (
                    <p className="text-xs text-slate-500">
                      Next: {formatDate(t.upcomingLesson.date)} · {formatTime(t.upcomingLesson.startTime)}
                    </p>
                  ) : (
                    <Link href={`/teachers/${t.id}`}>
                      <Button size="sm" variant="outline">
                        <GraduationCap className="h-4 w-4" /> Book
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

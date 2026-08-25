'use client';

import Link from 'next/link';
import { ArrowRight, CalendarPlus, CheckCircle2, GraduationCap, Users } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { MyTeacher } from '../../lib/types';
import { formatDate, formatTime } from '../../lib/format';

export default function MyTeachersPage() {
  const { data, initialLoading, error } = useApi(() => api.getMyTeachers<MyTeacher[]>(), []);

  if (initialLoading) return <PencilLoader label="Loading your teachers…" />;
  if (error || !data) return <Alert message={error || 'Failed to load your teachers.'} />;

  return (
    <div>
      <PageHeader
        title="My Teachers"
        subtitle="The teachers you are enrolled with and your upcoming lessons with them."
      />

      {data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="You haven't enrolled with any teachers yet"
          description="Browse available teachers and book your first lesson to get started."
          action={
            <Link href="/teachers">
              <Button>
                <GraduationCap className="h-4 w-4" /> Browse teachers
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((t) => (
            <Card key={t.id} bodyClassName="p-5">
              <div className="flex items-start gap-4">
                <Avatar name={t.fullName} src={t.photo} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/teachers/${t.id}`}
                      className="truncate text-sm font-semibold text-slate-900 dark:text-white hover:text-brand-700"
                    >
                      {t.fullName}
                    </Link>
                    {t.isEnrolled && (
                      <Badge tone="green" className="shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Enrolled
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {t.subjects.slice(0, 3).map((s) => (
                      <Badge key={s.id} tone="blue">
                        {s.name}
                      </Badge>
                    ))}
                    {t.subjects.length > 3 && <Badge tone="slate">+{t.subjects.length - 3}</Badge>}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm">
                {t.upcomingLesson ? (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Next lesson
                      </p>
                      <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">
                        {formatDate(t.upcomingLesson.date)} · {formatTime(t.upcomingLesson.startTime)}
                        {t.upcomingLesson.subject ? ` · ${t.upcomingLesson.subject.name}` : ''}
                      </p>
                    </div>
                    <Badge tone="slate">{(t.upcomingLesson.status ?? '').replace('_', ' ')}</Badge>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No upcoming lessons scheduled.</p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/teachers/${t.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    View teacher
                  </Button>
                </Link>
                {t.upcomingLesson ? (
                  <Link href={`/student/lessons?teacherId=${t.id}`} className="flex-1">
                    <Button variant="ghost" className="w-full">
                      View lessons <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/teachers/${t.id}`} className="flex-1">
                    <Button className="w-full">
                      <CalendarPlus className="h-4 w-4" /> Book
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

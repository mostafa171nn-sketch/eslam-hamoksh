'use client';

import Link from 'next/link';
import { ArrowRight, CalendarPlus, CheckCircle2, GraduationCap, Users } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/ErrorAlert';
import { useT, type Dict } from '../../i18n';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { MyTeacher } from '../../lib/types';
import { formatDate, formatTime } from '../../lib/format';

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

export default function MyTeachersPage() {
  const { t } = useT();
  const { data, initialLoading, error } = useApi(() => api.getMyTeachers<MyTeacher[]>(), []);

  if (initialLoading) return <PencilLoader label={t('loadingTeachers')} />;
  if (error || !data) return <Alert message={error || t('failedLoadTeachers')} />;

  return (
    <div>
      <PageHeader
        title={t('myTeachers')}
        subtitle={t('myTeachersSub')}
      />

      {data.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('haventEnrolled')}
          description={t('browseAndBook')}
          action={
            <Link href="/teachers">
              <Button>
                <GraduationCap className="h-4 w-4" /> {t('browseTeachers')}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((teacher) => (
            <Card key={teacher.id} bodyClassName="p-5">
              <div className="flex items-start gap-4">
                <Avatar name={teacher.fullName} src={teacher.photo} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/teachers/${teacher.id}`}
                      className="truncate text-sm font-semibold text-slate-900 dark:text-white hover:text-brand-700"
                    >
                      {teacher.fullName}
                    </Link>
                    {teacher.isEnrolled && (
                      <Badge tone="green" className="shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> {t('enrolled')}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {teacher.subjects.slice(0, 3).map((s) => (
                      <Badge key={s.id} tone="blue">
                        {s.name}
                      </Badge>
                    ))}
                    {teacher.subjects.length > 3 && <Badge tone="slate">+{teacher.subjects.length - 3}</Badge>}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm">
                {teacher.upcomingLesson ? (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {t('nextLesson')}
                      </p>
                      <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">
                        {formatDate(teacher.upcomingLesson.date)} · {formatTime(teacher.upcomingLesson.startTime)}
                        {teacher.upcomingLesson.subject ? ` · ${teacher.upcomingLesson.subject.name}` : ''}
                      </p>
                    </div>
                    <Badge tone={statusTone(teacher.upcomingLesson.status ?? '')}>
                      {t(lessonStatusKey(teacher.upcomingLesson.status ?? ''))}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">{t('noUpcomingScheduled')}</p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/teachers/${teacher.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    {t('viewTeacher')}
                  </Button>
                </Link>
                {teacher.upcomingLesson ? (
                  <Link href={`/student/lessons?teacherId=${teacher.id}`} className="flex-1">
                    <Button variant="ghost" className="w-full">
                      {t('viewMyLessons')} <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/teachers/${teacher.id}`} className="flex-1">
                    <Button className="w-full">
                      <CalendarPlus className="h-4 w-4" /> {t('book')}
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

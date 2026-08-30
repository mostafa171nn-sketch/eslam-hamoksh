import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/ErrorAlert';
import { Select } from '../../components/ui/Select';
import { useT, type Dict } from '../../i18n';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { Lesson } from '../../lib/types';
import { formatDate, formatTime, isToday } from '../../lib/format';

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

export default function StudentLessonsPage() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const teacherIdParam = searchParams.get('teacherId') ?? undefined;
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const { data, meta, loading, initialLoading, error } = useApi(
    () =>
      api.get<Lesson[]>('/lessons', {
        page,
        limit: 20,
        status: status || undefined,
        teacherId: teacherIdParam,
      }),
    [page, status, teacherIdParam],
  );

  return (
    <div>
      <PageHeader
        title={t('myLessons')}
        subtitle={teacherIdParam ? t('lessonsWithSelectedTeacher') : t('myLessonSchedule')}
        action={
          <Select
            options={[
              { value: '', label: t('allStatus') },
              { value: 'SCHEDULED', label: t('scheduled') },
              { value: 'RESCHEDULED', label: t('rescheduled') },
              { value: 'COMPLETED', label: t('completedStatus') },
              { value: 'CANCELLED', label: t('cancelled') },
              { value: 'NO_SHOW', label: t('noShowAction') },
            ]}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="min-w-[160px]"
          />
        }
      />

      {error && <Alert message={error} className="mb-4" />}
      {loading && (initialLoading ? <PencilLoader label={t('loadingLessons')} /> : <PencilLoader size="sm" label={t('loadingLessons')} />)}

      {!loading && data && (
        <>
          {data.length === 0 ? (
            <EmptyState icon={CalendarDays} title={t('noLessons')} description={t('lessonsAppearHere')} />
          ) : (
            <div className="space-y-3">
              {data.map((l) => (
                <Card key={l.id} bodyClassName="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/40">
                      <span className="text-lg font-bold leading-none text-brand-700 dark:text-brand-300">{new Date(l.date).getDate()}</span>
                      <span className="text-[10px] font-medium uppercase text-brand-500 dark:text-brand-400">
                        {new Date(l.date).toLocaleString('en', { month: 'short' })}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{l.subject?.name ?? t('generalSubject')}</p>
                        {l.location && <Badge tone="slate">{l.location.name}</Badge>}
                        {isToday(l.date) && <Badge tone="blue">{t('today')}</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(l.date)} · {formatTime(l.startTime)} – {formatTime(l.endTime)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">{t('with')} {l.teacher.fullName}</p>
                      {l.notes && <p className="mt-1 text-xs text-slate-500">{l.notes}</p>}
                    </div>
                  </div>
                  <Badge tone={statusTone(l.status)}>{t(lessonStatusKey(l.status))}</Badge>
                </Card>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Pagination page={page} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}

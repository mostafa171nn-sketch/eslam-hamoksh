import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/ErrorAlert';
import { Select } from '../../components/ui/Select';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { Lesson } from '../../lib/types';
import { formatDate, formatTime, isToday } from '../../lib/format';

export default function StudentLessonsPage() {
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
        title="My lessons"
        subtitle={teacherIdParam ? 'Lessons with the selected teacher.' : 'Your lesson schedule and history.'}
        action={
          <Select
            options={[
              { value: '', label: 'All statuses' },
              { value: 'SCHEDULED', label: 'Scheduled' },
              { value: 'RESCHEDULED', label: 'Rescheduled' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
              { value: 'NO_SHOW', label: 'No show' },
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
      {loading && (initialLoading ? <PencilLoader label="Loading lessons…" /> : <PencilLoader size="sm" label="Loading lessons…" />)}

      {!loading && data && (
        <>
          {data.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No lessons" description="Lessons with your teachers will appear here." />
          ) : (
            <div className="space-y-3">
              {data.map((l) => (
                <Card key={l.id} bodyClassName="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50">
                      <span className="text-lg font-bold leading-none text-brand-700">{new Date(l.date).getDate()}</span>
                      <span className="text-[10px] font-medium uppercase text-brand-500">
                        {new Date(l.date).toLocaleString('en', { month: 'short' })}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{l.subject?.name ?? 'General'}</p>
                        {l.location && <Badge tone="slate">{l.location.name}</Badge>}
                        {isToday(l.date) && <Badge tone="blue">Today</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(l.date)} · {formatTime(l.startTime)} – {formatTime(l.endTime)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">with {l.teacher.fullName}</p>
                      {l.notes && <p className="mt-1 text-xs text-slate-500">{l.notes}</p>}
                    </div>
                  </div>
                  <StatusBadge status={l.status} />
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

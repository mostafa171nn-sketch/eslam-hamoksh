import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileQuestion } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/ErrorAlert';
import { Select } from '../../components/ui/Select';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import type { Exam } from '../../lib/types';
import { formatDateTime } from '../../lib/format';

export default function StudentExamsPage() {
  const router = useRouter();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [starting, setStarting] = useState('');

  const { data, meta, loading, initialLoading, error } = useApi(
    () => api.get<Exam[]>('/exams', { page, limit: 20, status: status || undefined }),
    [page, status],
  );

  const go = async (exam: Exam) => {
    if (exam.myAttempt?.status === 'SUBMITTED' || exam.myAttempt?.status === 'AUTO_SUBMITTED') {
      setStarting(exam.id);
      try {
        const res = await api.post<{ attempt: { id: string } }>(`/exams/${exam.id}/start`);
        router.push(`/student/exams/results/${res.data.attempt.id}`);
      } catch (err) {
        toast.error(errorMessage(err));
        setStarting('');
      }
      return;
    }
    router.push(`/student/exams/${exam.id}/take`);
  };

  return (
    <div>
      <PageHeader
        title="Exams"
        subtitle="Your assigned exams."
        action={
          <Select
            options={[
              { value: '', label: 'All exams' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'active', label: 'Active' },
              { value: 'ended', label: 'Ended' },
            ]}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="min-w-[150px]"
          />
        }
      />

      {error && <Alert message={error} className="mb-4" />}
      {loading && (initialLoading ? <PencilLoader label="Loading exams…" /> : <PencilLoader size="sm" label="Loading exams…" />)}

      {!loading && data && (
        <>
          {data.length === 0 ? (
            <EmptyState icon={FileQuestion} title="No exams" description="Exams assigned to you will appear here." />
          ) : (
            <div className="space-y-3">
              {data.map((e) => (
                <Card key={e.id} bodyClassName="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{e.name}</p>
                      {e.subject && <Badge tone="blue">{e.subject.name}</Badge>}
                      {e.myAttempt ? (
                        <Badge tone={e.myAttempt.status === 'SUBMITTED' || e.myAttempt.status === 'AUTO_SUBMITTED' ? 'green' : 'amber'}>
                          {e.myAttempt.status === 'IN_PROGRESS' ? 'In progress' : 'Completed'}
                        </Badge>
                      ) : e.isActive ? (
                        <Badge tone="green">Available now</Badge>
                      ) : e.isUpcoming ? (
                        <Badge tone="blue">Upcoming</Badge>
                      ) : (
                        <Badge tone="red">Ended</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(e.startTime)} → {formatDateTime(e.endTime)} · {e.durationMinutes} min ·{' '}
                      {e.questions.length} questions
                    </p>
                    {e.myAttempt?.percentage !== null && e.myAttempt?.percentage !== undefined && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        Score: <span className="font-semibold text-slate-900 dark:text-white">{e.myAttempt.percentage}%</span>
                        {e.myAttempt.score !== null && ` (${e.myAttempt.score}/${e.myAttempt.maxScore})`}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {e.isUpcoming && !e.myAttempt ? (
                      <Button size="sm" disabled>
                        Starts {formatDateTime(e.startTime).split('·')[1]}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => go(e)} loading={starting === e.id}>
                        {e.myAttempt?.status === 'IN_PROGRESS'
                          ? 'Resume'
                          : e.myAttempt?.status === 'SUBMITTED' || e.myAttempt?.status === 'AUTO_SUBMITTED'
                            ? 'View result'
                            : 'Start exam'}
                      </Button>
                    )}
                  </div>
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

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
import { useT } from '../../i18n';
import type { Exam } from '../../lib/types';
import { formatDateTime } from '../../lib/format';

export default function StudentExamsPage() {
  const { t } = useT();
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
        title={t('exams')}
        subtitle={t('examsSub')}
        action={
          <Select
            options={[
              { value: '', label: t('allExams') },
              { value: 'upcoming', label: t('upcoming') },
              { value: 'active', label: t('active') },
              { value: 'ended', label: t('ended') },
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
      {loading && (initialLoading ? <PencilLoader label={t('loadingExams')} /> : <PencilLoader size="sm" label={t('loadingExams')} />)}

      {!loading && data && (
        <>
          {data.length === 0 ? (
            <EmptyState icon={FileQuestion} title={t('noExams')} description={t('examsAppearHere')} />
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
                          {e.myAttempt.status === 'IN_PROGRESS' ? t('inProgress') : t('completedStatus')}
                        </Badge>
                      ) : e.isActive ? (
                        <Badge tone="green">{t('availableNow')}</Badge>
                      ) : e.isUpcoming ? (
                        <Badge tone="blue">{t('upcoming')}</Badge>
                      ) : (
                        <Badge tone="red">{t('ended')}</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(e.startTime)} → {formatDateTime(e.endTime)} · {e.durationMinutes} {t('minutesShort')} ·{' '}
                      {e.questions.length} {t('questionsCount')}
                    </p>
                    {e.myAttempt?.percentage !== null && e.myAttempt?.percentage !== undefined && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {t('score')}: <span className="font-semibold text-slate-900 dark:text-white">{e.myAttempt.percentage}%</span>
                        {e.myAttempt.score !== null && ` (${e.myAttempt.score}/${e.myAttempt.maxScore})`}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {e.isUpcoming && !e.myAttempt ? (
                      <Button size="sm" disabled>
                        {t('startsAt')} {formatDateTime(e.startTime).split('·')[1]}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => go(e)} loading={starting === e.id}>
                        {e.myAttempt?.status === 'IN_PROGRESS'
                          ? t('resume')
                          : e.myAttempt?.status === 'SUBMITTED' || e.myAttempt?.status === 'AUTO_SUBMITTED'
                            ? t('viewResult')
                            : t('startExam')}
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

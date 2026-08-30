import { useParams } from 'next/navigation';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useT, type Dict } from '../../i18n';
import type { AttemptResult } from '../../lib/types';

function attemptStatusKey(status: string): keyof Dict {
  switch (status) {
    case 'NOT_STARTED':
      return 'notStarted';
    case 'IN_PROGRESS':
      return 'inProgress';
    case 'SUBMITTED':
    case 'AUTO_SUBMITTED':
      return 'submitted';
    default:
      return 'status';
  }
}

function questionTypeKey(type: string): keyof Dict {
  switch (type) {
    case 'MULTIPLE_CHOICE':
      return 'multipleChoice';
    case 'TRUE_FALSE':
      return 'trueFalse';
    case 'WRITTEN':
      return 'written';
    default:
      return 'question';
  }
}

export default function StudentExamResultPage() {
  const { t } = useT();
  const params = useParams<{ attemptId: string }>();
  const attemptId = params?.attemptId ?? '';
  const { data, initialLoading, error } = useApi(() => api.get<AttemptResult>(`/exams/attempts/${attemptId}`), [attemptId]);

  if (initialLoading) return <PencilLoader label={t('loadingResult')} />;
  if (error || !data) return <Alert message={error || t('failedLoadResult')} />;

  return (
    <div>
      <PageHeader
        title={data.exam.name}
        subtitle={t('examReviewSub')}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={t('score')} value={data.score !== null ? `${data.score}/${data.maxScore}` : '—'} />
        <StatCard label={t('percentage')} value={data.percentage !== null ? `${data.percentage}%` : '—'} />
        <StatCard label={t('correct')} value={data.correctCount ?? '—'} sub={data.totalCount !== null ? `${t('of')} ${data.totalCount}` : undefined} />
        <StatCard label={t('status')} value={t(attemptStatusKey(data.status))} />
      </div>

      <div className="mt-6 space-y-4">
        {data.questions.map((q, i) => (
          <Card key={q.id} bodyClassName="space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{i + 1}. {q.question}</span>
                <Badge tone={q.type === 'WRITTEN' ? 'violet' : 'slate'}>{t(questionTypeKey(q.type))}</Badge>
              </div>
              <span className="shrink-0 text-xs font-medium text-slate-400">
                {q.pointsEarned}/{q.points} {t('points')}
              </span>
            </div>

            {q.type === 'MULTIPLE_CHOICE' && q.options && (
              <div className="space-y-1.5">
                {q.options.map((opt) => {
                  const isYour = q.yourAnswer === opt;
                  const isRight = q.correctAnswer === opt;
                  const cls = isRight
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : isYour
                      ? 'border-red-300 bg-red-50 text-red-800'
                      : 'border-slate-200 dark:border-slate-700';
                  return (
                    <div key={opt} className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>
                      {opt}
                      {isRight && ` · ${t('correctAnswer')}`}
                      {isYour && !isRight && ` · ${t('yourAnswer')}`}
                    </div>
                  );
                })}
              </div>
            )}
            {q.type === 'TRUE_FALSE' && (
              <div className="flex gap-3 text-sm">
                {['true', 'false'].map((opt) => {
                  const isYour = q.yourAnswer === opt;
                  const isRight = q.correctAnswer === opt;
                  const cls = isRight
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : isYour
                      ? 'border-red-300 bg-red-50 text-red-800'
                      : 'border-slate-200 dark:border-slate-700';
                  return (
                    <div key={opt} className={`flex-1 rounded-lg border px-3 py-2 ${cls}`}>
                      {opt === 'true' ? t('trueOption') : t('falseOption')}
                      {isRight && ` · ${t('correct')}`}
                      {isYour && !isRight && ` · ${t('yourAnswer')}`}
                    </div>
                  );
                })}
              </div>
            )}
            {q.type === 'WRITTEN' && (
              <div className="space-y-2">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-700">
                  <p className="text-xs font-medium uppercase text-slate-400">{t('yourAnswer')}</p>
                  <p className="mt-1 whitespace-pre-wrap">{q.yourAnswer || t('noAnswerGiven')}</p>
                </div>
                {q.graded ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t('pointsEarned')}: <span className="font-semibold text-slate-900 dark:text-white">{q.pointsEarned}</span>
                  </p>
                ) : (
                  <Badge tone="amber">{t('awaitingGrading')}</Badge>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

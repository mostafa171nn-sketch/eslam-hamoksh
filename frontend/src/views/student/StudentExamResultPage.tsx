import { useParams } from 'next/navigation';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { AttemptResult } from '../../lib/types';

export default function StudentExamResultPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params?.attemptId ?? '';
  const { data, initialLoading, error } = useApi(() => api.get<AttemptResult>(`/exams/attempts/${attemptId}`), [attemptId]);

  if (initialLoading) return <PencilLoader label="Loading result…" />;
  if (error || !data) return <Alert message={error || 'Failed to load result.'} />;

  return (
    <div>
      <PageHeader
        title={data.exam.name}
        subtitle="Your exam review"
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Score" value={data.score !== null ? `${data.score}/${data.maxScore}` : '—'} />
        <StatCard label="Percentage" value={data.percentage !== null ? `${data.percentage}%` : '—'} />
        <StatCard label="Correct" value={data.correctCount ?? '—'} sub={data.totalCount !== null ? `of ${data.totalCount}` : undefined} />
        <StatCard label="Status" value={data.status.replace(/_/g, ' ')} />
      </div>

      <div className="mt-6 space-y-4">
        {data.questions.map((q, i) => (
          <Card key={q.id} bodyClassName="space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{i + 1}. {q.question}</span>
                <Badge tone={q.type === 'WRITTEN' ? 'violet' : 'slate'}>{q.type.replace(/_/g, ' ')}</Badge>
              </div>
              <span className="shrink-0 text-xs font-medium text-slate-400">
                {q.pointsEarned}/{q.points} pts
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
                      {isRight && ' · Correct answer'}
                      {isYour && !isRight && ' · Your answer'}
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
                      {opt === 'true' ? 'True' : 'False'}
                      {isRight && ' · Correct'}
                      {isYour && !isRight && ' · Your answer'}
                    </div>
                  );
                })}
              </div>
            )}
            {q.type === 'WRITTEN' && (
              <div className="space-y-2">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-700">
                  <p className="text-xs font-medium uppercase text-slate-400">Your answer</p>
                  <p className="mt-1 whitespace-pre-wrap">{q.yourAnswer || 'No answer given.'}</p>
                </div>
                {q.graded ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Points earned: <span className="font-semibold text-slate-900 dark:text-white">{q.pointsEarned}</span>
                  </p>
                ) : (
                  <Badge tone="amber">Awaiting grading</Badge>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

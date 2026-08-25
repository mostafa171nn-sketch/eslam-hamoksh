import { useParams } from 'next/navigation';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Avatar } from '../../components/ui/Avatar';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { ExamResults } from '../../lib/types';
import { formatDateTime } from '../../lib/format';

export default function ExamResultsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { data, initialLoading, error } = useApi(() => api.get<ExamResults>(`/exams/${id}/results`), [id]);

  if (initialLoading) return <PencilLoader label="Loading results…" />;
  if (error || !data) return <Alert message={error || 'Failed to load results.'} />;

  return (
    <div>
      <PageHeader
        title={data.exam.name}
        subtitle="Exam results overview"
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Students" value={data.summary.totalStudents} />
        <StatCard label="Submitted" value={data.summary.submitted} />
        <StatCard label="Absent" value={data.summary.absent} />
        <StatCard label="Average" value={`${data.summary.average}%`} />
        <StatCard label="Highest" value={`${data.summary.highest}%`} />
        <StatCard label="Pass rate" value={`${data.summary.passRate}%`} />
      </div>

      <Card className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-start text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-4 font-medium">Student</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="hidden pb-2 pr-4 font-medium sm:table-cell">Submitted</th>
                <th className="pb-2 pr-4 font-medium">Score</th>
                <th className="pb-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.results.map((r) => (
                <tr key={r.student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 dark:bg-slate-800/60">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.student.fullName} src={r.student.photo} size="sm" />
                      <span className="font-medium text-slate-900 dark:text-white">{r.student.fullName}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={r.status} />
                    {r.writtenPending && <Badge tone="amber" className="ml-1">Written pending</Badge>}
                  </td>
                  <td className="hidden py-3 pr-4 text-slate-500 sm:table-cell">
                    {r.submittedAt ? formatDateTime(r.submittedAt) : '—'}
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-700">
                    {r.score !== null ? `${r.score}/${r.maxScore}` : '—'}
                  </td>
                  <td className="py-3">
                    {r.percentage !== null ? (
                      <Badge tone={r.percentage >= 50 ? 'green' : 'red'}>{r.percentage}%</Badge>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-xs text-slate-400">
        Written answers are auto-graded once every written question receives points.
      </p>
    </div>
  );
}

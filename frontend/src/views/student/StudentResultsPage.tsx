import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { StudentDashboard } from '../../lib/types';
import { formatDateTime } from '../../lib/format';

export default function StudentResultsPage() {
  const { data, initialLoading, error } = useApi(() => api.get<StudentDashboard>('/students/dashboard'), []);

  if (initialLoading) return <PencilLoader label="Loading results…" />;
  if (error || !data) return <Alert message={error || 'Failed to load results.'} />;

  return (
    <div>
      <PageHeader title="My results" subtitle="Your exam results and feedback." />

      {data.recentResults.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No results yet" description="Completed exams will show your score here." />
      ) : (
        <div className="space-y-3">
          {data.recentResults.map((r) => (
            <Card key={r.id} bodyClassName="flex items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.exam.name}</p>
                  {r.exam.subject && <Badge tone="blue">{r.exam.subject.name}</Badge>}
                </div>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(r.submittedAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge tone={r.percentage !== null && r.percentage >= 50 ? 'green' : 'amber'}>
                  {r.percentage !== null ? `${r.percentage}%` : 'Pending'}
                </Badge>
                <Link href={`/student/exams/results/${r.id}`}>
                  <Button size="sm" variant="outline">Review</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

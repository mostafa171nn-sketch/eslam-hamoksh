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
import { useT } from '../../i18n';
import type { StudentDashboard } from '../../lib/types';
import { formatDateTime } from '../../lib/format';

export default function StudentResultsPage() {
  const { t } = useT();
  const { data, initialLoading, error } = useApi(() => api.get<StudentDashboard>('/students/dashboard'), []);

  if (initialLoading) return <PencilLoader label={t('loadingResults')} />;
  if (error || !data) return <Alert message={error || t('failedLoadResults')} />;

  return (
    <div>
      <PageHeader title={t('myResultsTitle')} subtitle={t('myResultsSub')} />

      {data.recentResults.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={t('noResultsYet')} description={t('noResultsSub')} />
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
                  {r.percentage !== null ? `${r.percentage}%` : t('pending')}
                </Badge>
                <Link href={`/student/exams/results/${r.id}`}>
                  <Button size="sm" variant="outline">{t('review')}</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

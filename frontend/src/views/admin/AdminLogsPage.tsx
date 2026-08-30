import { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { useT } from '../../i18n';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { ActivityLog } from '../../lib/types';
import { formatDateTime } from '../../lib/format';

export default function AdminLogsPage() {
  const { t } = useT();
  const [page, setPage] = useState(1);
  const { data, meta, loading, initialLoading, error } = useApi(
    () => api.get<ActivityLog[]>('/admin/logs', { page, limit: 50 }),
    [page],
  );

  return (
    <div>
      <PageHeader title={t('logsTitle')} subtitle={t('logsSub')} />

      {error && <Alert message={error} className="mb-4" />}
      {loading && (initialLoading ? <PencilLoader label={t('loadingLogs')} /> : <PencilLoader size="sm" label={t('loadingLogs')} />)}

      {!loading && data && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-start text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pe-4 font-medium">{t('when')}</th>
                  <th className="pb-2 pe-4 font-medium">{t('user')}</th>
                  <th className="pb-2 pe-4 font-medium">{t('role')}</th>
                  <th className="pb-2 pe-4 font-medium">{t('action')}</th>
                  <th className="hidden pb-2 pe-4 font-medium sm:table-cell">{t('entity')}</th>
                  <th className="hidden pb-2 font-medium lg:table-cell">{t('details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {data.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 dark:bg-slate-800/60">
                    <td className="whitespace-nowrap py-2.5 pe-4 text-slate-500">{formatDateTime(log.createdAt)}</td>
                    <td className="py-2.5 pe-4 font-medium text-slate-900 dark:text-white">
                      {log.user ? `${log.user.fullName} (@${log.user.username})` : t('system')}
                    </td>
                    <td className="py-2.5 pe-4">
                      {log.role && <Badge tone="slate">{log.role.toLowerCase()}</Badge>}
                    </td>
                    <td className="py-2.5 pe-4">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{log.action}</code>
                    </td>
                    <td className="hidden py-2.5 pe-4 text-slate-500 sm:table-cell">
                      {log.entity}
                      {log.entityId ? <span className="text-slate-400"> · {log.entityId.slice(0, 8)}</span> : null}
                    </td>
                    <td className="hidden max-w-xs truncate py-2.5 text-slate-500 lg:table-cell">{log.details ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination page={page} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
          </div>
        </Card>
      )}
    </div>
  );
}

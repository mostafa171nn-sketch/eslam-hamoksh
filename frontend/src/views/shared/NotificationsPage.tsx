import { useState } from 'react';
import { CheckCheck, BellOff } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { Notification } from '../../lib/types';
import { timeAgo } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n';

export default function NotificationsPage() {
  const toast = useToast();
  const { t } = useT();
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const limit = 20;

  const { data, meta, loading, initialLoading, error, setData } = useApi(
    () => api.get<{ notifications: Notification[]; unread: number }>('/notifications', { page, limit }),
    [page],
  );

  const markAll = async () => {
    setBusy(true);
    try {
      await api.put('/notifications/read-all');
      setData((prev) => (prev ? { ...prev, unread: 0, notifications: prev.notifications.map((n) => ({ ...n, read: true })) } : prev));
      toast.success(t('allMarkedReadToast'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const markOne = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setData((prev) =>
        prev
          ? {
              ...prev,
              unread: Math.max(0, prev.unread - 1),
              notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
            }
          : prev,
      );
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title={t('notificationsTitle')}
        subtitle={data ? `${data.unread} ${t('unreadSuffix')}` : undefined}
        action={
          data && data.unread > 0 ? (
            <Button variant="outline" size="sm" onClick={markAll} loading={busy}>
              <CheckCheck className="h-4 w-4" /> {t('markAllRead')}
            </Button>
          ) : undefined
        }
      />

      {error && <Alert message={error} className="mb-4" />}
      {loading && (initialLoading ? <PencilLoader label={t('loadingNotifications')} /> : <PencilLoader size="sm" label={t('loadingNotifications')} />)}

      {!loading && data && (
        <>
          {data.notifications.length === 0 ? (
            <EmptyState
              icon={BellOff}
              title={t('noNotifications')}
              description={t('whenSomethingHappens')}
            />
          ) : (
            <Card>
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {data.notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => !n.read && markOne(n.id)}
                      className={`flex w-full items-start gap-3 px-5 py-4 text-start transition ${n.read ? '' : 'bg-brand-50/40 hover:bg-brand-50'}`}
                    >
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? 'bg-slate-200' : 'bg-brand-500'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{n.title}</span>
                          <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                        </span>
                        <span className="mt-0.5 block text-sm text-slate-500">{n.message}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <div className="mt-4">
            <Pagination page={page} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}

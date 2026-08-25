import { useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { formatDate, formatDateTime } from '../../lib/format';
import { useT } from '../../i18n';
import { useToast } from '../../context/ToastContext';

interface CenterAdmin {
  id: string;
  fullName: string | null;
  username: string;
  email: string | null;
  phone?: string | null;
  status: string;
}

interface CenterSummary {
  id: string;
  name: string;
  nameEn: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  slug: string;
  status: string;
  subscriptionStatus: string;
  createdAt: string;
  admin: CenterAdmin | null;
}

interface CenterDetail {
  id: string;
  name: string;
  nameEn: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  slug: string;
  website: string | null;
  description: string | null;
  status: string;
  subscriptionStatus: string;
  requiresApproval: boolean;
  rejectedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CenterStatistics {
  teachers: number;
  students: number;
  parents: number;
  lessons: { total: number; upcoming: number; completed: number };
  attendance: { total: number; present: number; absent: number };
  payments: { total: number; paid: number; pending: number };
  revenue: number;
}

type CenterList = { items: CenterSummary[]; total: number; page: number; limit: number; totalPages: number };

type FilterTab = 'ALL' | 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

type PendingActionType = 'approve' | 'reject' | 'suspend' | 'activate';

function statusForTab(tab: FilterTab): string | undefined {
  return tab === 'ALL' ? undefined : tab;
}

export default function AdminCentersPage() {
  const { t } = useT();
  const toast = useToast();
  const [tab, setTab] = useState<FilterTab>('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<{ center: CenterDetail; admin: CenterAdmin | null; statistics: CenterStatistics } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [pending, setPending] = useState<{ type: PendingActionType; center: CenterSummary } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, meta, loading, initialLoading, error, reload } = useApi<CenterList>(
    () =>
      api.get<CenterList>('/admin/centers', {
        status: statusForTab(tab),
        q: search || undefined,
        page,
        limit: 20,
      }),
    [tab, search, page],
  );

  const runAction = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const id = pending.center.id;
      const path = `/admin/centers/${id}/`;
      switch (pending.type) {
        case 'approve':
          await api.patch(path + 'approve');
          toast.success(`"${pending.center.name}" approved and its admin account activated.`);
          break;
        case 'reject':
          await api.patch(path + 'reject', { reason: rejectReason || undefined });
          toast.success(`"${pending.center.name}" rejected.`);
          break;
        case 'suspend':
          await api.patch(path + 'suspend');
          toast.success(`"${pending.center.name}" suspended.`);
          break;
        case 'activate':
          await api.patch(path + 'activate');
          toast.success(`"${pending.center.name}" activated.`);
          break;
      }
      setPending(null);
      setRejectReason('');
      setDetail(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openDetails = async (center: CenterSummary) => {
    setDetailLoading(true);
    try {
      const res = await api.get<{ center: CenterDetail; admin: CenterAdmin | null; statistics: CenterStatistics }>(`/admin/centers/${center.id}`);
      setDetail(res.data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const changeTab = (value: FilterTab) => {
    setTab(value);
    setPage(1);
  };

  const submitSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const items = data?.items ?? [];

  return (
    <div>
      <PageHeader title={t('manageCenters')} subtitle={t('manageCentersSub')} />

      <Card bodyClassName="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => changeTab(t.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                tab === t.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t('searchNameUsernamePhone')}
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitSearch();
              }}
            />
          </div>
          <Button variant="secondary" onClick={submitSearch}>
            Search
          </Button>
        </div>

        {error && <Alert message={error} />}
        {loading && (initialLoading ? <PencilLoader label="Loading centers…" /> : <PencilLoader size="sm" label="Loading centers…" />)}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-start text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-4 font-medium">{t('centerCol')}</th>
                  <th className="hidden pb-2 pr-4 font-medium md:table-cell">{t('email')}</th>
                  <th className="hidden pb-2 pr-4 font-medium lg:table-cell">{t('city')}</th>
                  <th className="hidden pb-2 pr-4 font-medium md:table-cell">{t('centerAdminCol')}</th>
                  <th className="hidden pb-2 pr-4 font-medium lg:table-cell">{t('registeredCol')}</th>
                  <th className="pb-2 pr-4 font-medium">{t('status')}</th>
                  <th className="pb-2 pr-4 font-medium">{t('accountCol')}</th>
                  <th className="pb-2 font-medium text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm text-slate-400">
                      No centers found.
                    </td>
                  </tr>
                )}
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 dark:bg-slate-800/60">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-900 dark:text-white">{c.name}</p>
                      {c.nameEn && <p className="text-xs text-slate-400">{c.nameEn}</p>}
                      {c.address && <p className="text-xs text-slate-400">{c.address}</p>}
                    </td>
                    <td className="hidden py-3 pr-4 text-slate-500 md:table-cell">{c.email ?? '—'}</td>
                    <td className="hidden py-3 pr-4 text-slate-500 lg:table-cell">{c.city ?? '—'}</td>
                    <td className="hidden py-3 pr-4 md:table-cell">
                      {c.admin ? (
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-700">{c.admin.fullName ?? c.admin.username}</p>
                          <p className="truncate text-xs text-slate-400">{c.admin.email ?? '@' + c.admin.username}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="hidden py-3 pr-4 text-slate-500 lg:table-cell">{formatDate(c.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3 pr-4">
                      {c.admin ? <StatusBadge status={c.admin.status} /> : <Badge tone="slate">—</Badge>}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openDetails(c)} loading={detailLoading}>
                          View Details
                        </Button>
                        {c.status === 'PENDING' && (
                          <>
                            <Button size="sm" variant="primary" onClick={() => setPending({ type: 'approve', center: c })}>
                              Approve
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => { setRejectReason(''); setPending({ type: 'reject', center: c }); }}>
                              Reject
                            </Button>
                          </>
                        )}
                        {c.status === 'ACTIVE' && (
                          <Button size="sm" variant="outline" onClick={() => setPending({ type: 'suspend', center: c })}>
                            Suspend
                          </Button>
                        )}
                        {c.status === 'SUSPENDED' && (
                          <Button size="sm" variant="secondary" onClick={() => setPending({ type: 'activate', center: c })}>
                            Activate
                          </Button>
                        )}
                        {c.status === 'REJECTED' && (
                          <Button size="sm" variant="secondary" onClick={() => setPending({ type: 'activate', center: c })}>
                            Activate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <div className="flex justify-center pt-2">
            <Pagination page={page} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
          </div>
        )}
      </Card>

      {/* View details modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={t('centerDetailsModal')} size="lg">
        {detail && (
          <div className="space-y-5 text-sm">
            <Section title={t('center')}>
              <Field label={t('centerName')} value={detail.center.name} />
              <Field label={t('englishName')} value={detail.center.nameEn} />
              <Field label={t('centerEmail')} value={detail.center.email} />
              <Field label={t('centerPhone')} value={detail.center.phone} />
              <Field label={t('city')} value={detail.center.city} />
              <Field label={t('address')} value={detail.center.address} />
              <Field label={t('centerIdLabel')} value={detail.center.slug} />
              <Field label={t('centerEmail')} value={detail.center.website} />
              <Field label={t('description')} value={detail.center.description} />
              <Field label={t('status')} value={detail.center.status} />
              <Field label={t('subscription')} value={detail.center.subscriptionStatus} />
              <Field label={t('requiresApproval')} value={detail.center.requiresApproval ? 'Yes' : 'No'} />
              {detail.center.rejectedReason && <Field label={t('rejectionReasonLabel')} value={detail.center.rejectedReason} />}
              <Field label={t('registeredLabel')} value={formatDateTime(detail.center.createdAt)} />
            </Section>

            <Section title={t('centerAdminCol')}>
              {detail.admin ? (
                <>
                  <Field label={t('fullName')} value={detail.admin.fullName} />
                  <Field label={t('username')} value={detail.admin.username} />
                  <Field label="Email" value={detail.admin.email} />
                  {detail.admin.phone && <Field label="Phone" value={detail.admin.phone} />}
                  <Field label="Status" value={detail.admin.status} />
                </>
              ) : (
                <p className="text-slate-400">{t('noCenterAdminLinked')}</p>
              )}
            </Section>

            <Section title={t('statisticsSection')}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                <StatRow label="Teachers" value={detail.statistics.teachers} />
                <StatRow label="Students" value={detail.statistics.students} />
                <StatRow label="Parents" value={detail.statistics.parents} />
                <StatRow label="Lessons" value={detail.statistics.lessons.total} />
                <StatRow label="Lessons upcoming" value={detail.statistics.lessons.upcoming} />
                <StatRow label="Lessons completed" value={detail.statistics.lessons.completed} />
                <StatRow label="Attendance" value={detail.statistics.attendance.total} />
                <StatRow label="Present" value={detail.statistics.attendance.present} />
                <StatRow label="Absent" value={detail.statistics.attendance.absent} />
                <StatRow label="Payments" value={detail.statistics.payments.total} />
                <StatRow label="Payments paid" value={detail.statistics.payments.paid} />
                <StatRow label="Payments pending" value={detail.statistics.payments.pending} />
                <StatRow label="Revenue" value={detail.statistics.revenue} />
              </div>
            </Section>
          </div>
        )}
      </Modal>

      {/* Confirmation modal */}
      <Modal
        open={!!pending}
        onClose={() => !busy && setPending(null)}
        title={t('confirmAction')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant={pending?.type === 'approve' || pending?.type === 'activate' ? 'primary' : 'danger'}
              onClick={runAction}
              loading={busy}
            >
              {pending?.type === 'approve'
                ? 'Approve'
                : pending?.type === 'reject'
                  ? 'Reject'
                  : pending?.type === 'suspend'
                    ? 'Suspend'
                    : 'Activate'}
            </Button>
          </>
        }
      >
        {pending && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {pending.type === 'approve' && (
                <>
                  Approve <span className="font-medium text-slate-900 dark:text-white">{pending.center.name}</span>? This will set the
                  center to <span className="font-medium">ACTIVE</span> and activate its admin account so they can sign in.
                </>
              )}
              {pending.type === 'reject' && (
                <>
                  Reject <span className="font-medium text-slate-900 dark:text-white">{pending.center.name}</span>? The center admin
                  account will remain blocked.
                </>
              )}
              {pending.type === 'suspend' && (
                <>
                  Suspend <span className="font-medium text-slate-900 dark:text-white">{pending.center.name}</span>? This will set the
                  center to <span className="font-medium">SUSPENDED</span>.
                </>
              )}
              {pending.type === 'activate' && (
                <>
                  Activate <span className="font-medium text-slate-900 dark:text-white">{pending.center.name}</span>? This will set the
                  center to <span className="font-medium">ACTIVE</span>.
                </>
              )}
            </p>
            {pending.type === 'reject' && (
              <Input
                label={t('reasonOptional')}
                placeholder={t('rejectReasonPlaceholder')}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="truncate font-medium text-slate-700">{value ?? '—'}</p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-700">{value}</p>
    </div>
  );
}

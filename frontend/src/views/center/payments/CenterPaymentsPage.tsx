'use client';

import { useState } from 'react';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Download,
  Plus,
  Search,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Pagination } from '../../../components/ui/Pagination';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Alert } from '../../../components/ui/ErrorAlert';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';

interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'REJECTED' | 'REFUNDED';
  method: string | null;
  reference: string | null;
  dueDate: string;
  paidAt: string | null;
  description: string | null;
  createdAt: string;
}

interface PaymentStats {
  totalRevenue: number;
  pendingAmount: number;
  overdueCount: number;
  paidThisMonth: number;
}

export default function CenterPaymentsPage() {
  const { t } = useT();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: payments, meta, loading, initialLoading, error, reload } = useApi(
    () => api.get<Payment[]>('/center/account/payments', {
      page,
      limit: 20,
      ...(search && { search }),
      ...(status && { status }),
    }),
    [page, search, status]
  );

  const { data: stats } = useApi<PaymentStats>(
    () => api.get<PaymentStats>('/center/account/payments/stats'),
    []
  );

  const updateStatus = async (id: string, paymentStatus: string) => {
    setBusyId(id);
    try {
      await api.patch(`/center/account/payments/${id}/status`, { status: paymentStatus });
      toast.success(t('paymentUpdated'));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { tone: string; label: string }> = {
      PENDING: { tone: 'amber', label: t('pending') },
      PAID: { tone: 'green', label: t('paid') },
      REJECTED: { tone: 'red', label: t('rejected') },
      REFUNDED: { tone: 'blue', label: t('refunded') },
    };
    return <Badge tone={map[status]?.tone as any || 'slate'}>{map[status]?.label || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('paymentsManagement')}
        subtitle={t('paymentsManagementSub')}
        action={
          <>
            <Button variant="outline">
              <Download className="h-4 w-4" />
              {t('export')}
            </Button>
            <Button onClick={() => setShowRecordModal(true)}>
              <Plus className="h-4 w-4" />
              {t('recordPayment')}
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{((stats?.totalRevenue || 0) / 100).toLocaleString()} EGP</p>
              <p className="text-xs text-slate-500">{t('totalRevenue')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{((stats?.pendingAmount || 0) / 100).toLocaleString()} EGP</p>
              <p className="text-xs text-slate-500">{t('pendingAmount')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.overdueCount || 0}</p>
              <p className="text-xs text-slate-500">{t('overdue')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{((stats?.paidThisMonth || 0) / 100).toLocaleString()} EGP</p>
              <p className="text-xs text-slate-500">{t('thisMonth')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t('searchPayments')}
              className="ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); } }}
            />
          </div>
          <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="sm:w-40"
            options={[
              { value: '', label: t('allStatus') },
              { value: 'PENDING', label: t('pending') },
              { value: 'PAID', label: t('paid') },
              { value: 'REJECTED', label: t('rejected') },
              { value: 'REFUNDED', label: t('refunded') },
            ]}
          />
        </div>
      </Card>

      {error && <Alert message={error} />}
      {loading && <PencilLoader label={t('loading')} size={initialLoading ? undefined : 'sm'} />}

      {!loading && payments && payments.length > 0 && (
        <Card bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-start text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
                  <th className="px-4 py-3 font-medium">{t('student')}</th>
                  <th className="px-4 py-3 font-medium">{t('amount')}</th>
                  <th className="px-4 py-3 font-medium">{t('status')}</th>
                  <th className="px-4 py-3 font-medium">{t('dueDate')}</th>
                  <th className="px-4 py-3 font-medium">{t('method')}</th>
                  <th className="px-4 py-3 font-medium text-end">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{payment.studentName}</p>
                      <p className="text-xs text-slate-400">{payment.description || '—'}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {(payment.amount / 100).toLocaleString()} EGP
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(payment.status)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {new Date(payment.dueDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{payment.method || '—'}</td>
                    <td className="px-4 py-3 text-end">
                      <div className="flex justify-end gap-1">
                        {payment.status === 'PENDING' && (
                          <>
                            <Button variant="ghost" size="sm" loading={busyId === payment.id} onClick={() => updateStatus(payment.id, 'PAID')}>
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            </Button>
                            <Button variant="ghost" size="sm" loading={busyId === payment.id} onClick={() => updateStatus(payment.id, 'REJECTED')}>
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        {payment.status === 'PAID' && (
                          <Button variant="ghost" size="sm" onClick={() => updateStatus(payment.id, 'REFUNDED')}>
                            <DollarSign className="h-4 w-4 text-blue-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
            <Pagination page={page} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
          </div>
        </Card>
      )}

      {!loading && payments?.length === 0 && (
        <EmptyState icon={CreditCard} title={t('noPayments')} description={t('noPaymentsDesc')}
          action={<Button onClick={() => setShowRecordModal(true)}><Plus className="h-4 w-4" />{t('recordPayment')}</Button>}
        />
      )}

      <RecordPaymentModal open={showRecordModal} onClose={() => setShowRecordModal(false)} onSuccess={() => { setShowRecordModal(false); reload(); }} />
    </div>
  );
}

function RecordPaymentModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    amount: 0,
    dueDate: new Date().toISOString().split('T')[0],
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/center/account/payments', { ...form, amount: form.amount * 100 });
      toast.success(t('paymentRecorded'));
      setForm({ studentId: '', amount: 0, dueDate: new Date().toISOString().split('T')[0], description: '' });
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('recordPayment')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSubmit} loading={saving}>{t('record')}</Button></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('studentId')} required value={form.studentId} onChange={(e) => setForm(f => ({ ...f, studentId: e.target.value }))} placeholder="UUID" />
        <Input label={t('amount')} type="number" required value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: parseInt(e.target.value) || 0 }))} />
        <Input label={t('dueDate')} type="date" required value={form.dueDate} onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        <div>
          <label className="mb-1 block text-sm font-medium">{t('description')}</label>
          <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800" rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
      </form>
    </Modal>
  );
}

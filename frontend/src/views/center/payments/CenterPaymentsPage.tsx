'use client';

import { useState } from 'react';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  DollarSign,
  Download,
  Plus,
} from 'lucide-react';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill } from '../ui/CenterPill';
import { CenterSearchInput } from '../ui/CenterSearchInput';
import { CenterModal } from '../ui/CenterModal';
import { Pagination } from '../../../components/ui/Pagination';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Alert } from '../../../components/ui/ErrorAlert';
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

  const getStatusPill = (s: string) => {
    const map: Record<string, { tone: 'green' | 'amber' | 'red' | 'blue' | 'slate'; label: string }> = {
      PENDING: { tone: 'amber', label: t('pending') },
      PAID: { tone: 'green', label: t('paid') },
      REJECTED: { tone: 'red', label: t('rejected') },
      REFUNDED: { tone: 'blue', label: t('refunded') },
    };
    const m = map[s];
    return <CenterPill tone={m?.tone || 'slate'}>{m?.label || s}</CenterPill>;
  };

  return (
    <div className="space-y-6">
      <CenterPageHeader
        title={t('paymentsManagement')}
        description={t('paymentsManagementSub')}
      >
        <button className="mj-btn mj-btn--ghost">
          <Download className="h-4 w-4" />
          {t('export')}
        </button>
        <button className="mj-btn mj-btn--primary" onClick={() => setShowRecordModal(true)}>
          <Plus className="h-4 w-4" />
          {t('recordPayment')}
        </button>
      </CenterPageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CenterStatCard
          value={`${((stats?.totalRevenue || 0) / 100).toLocaleString()} EGP`}
          label={t('totalRevenue')}
        />
        <CenterStatCard
          value={`${((stats?.pendingAmount || 0) / 100).toLocaleString()} EGP`}
          label={t('pendingAmount')}
        />
        <CenterStatCard
          value={stats?.overdueCount || 0}
          label={t('overdue')}
        />
        <CenterStatCard
          value={`${((stats?.paidThisMonth || 0) / 100).toLocaleString()} EGP`}
          label={t('thisMonth')}
        />
      </div>

      <div className="mj-card mj-card--padding">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <CenterSearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder={t('searchPayments')}
              aria-label={t('searchPayments')}
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value); }}
            className="mj-select sm:w-40"
          >
            <option value="">{t('allStatus')}</option>
            <option value="PENDING">{t('pending')}</option>
            <option value="PAID">{t('paid')}</option>
            <option value="REJECTED">{t('rejected')}</option>
            <option value="REFUNDED">{t('refunded')}</option>
          </select>
        </div>
      </div>

      {error && <Alert message={error} />}
      {loading && <PencilLoader label={t('loading')} size={initialLoading ? undefined : 'sm'} />}

      {!loading && payments && payments.length > 0 && (
        <div className="mj-card" style={{ overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="mj-table">
              <thead>
                <tr>
                  <th>{t('student')}</th>
                  <th>{t('amount')}</th>
                  <th>{t('status')}</th>
                  <th>{t('dueDate')}</th>
                  <th>{t('method')}</th>
                  <th style={{ textAlign: 'end' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <p className="font-medium" style={{ color: 'var(--mj-ink-strong)' }}>{payment.studentName}</p>
                      <p className="text-xs" style={{ color: 'var(--mj-muted-2)' }}>{payment.description || '—'}</p>
                    </td>
                    <td className="font-bold" style={{ color: 'var(--mj-ink-strong)' }}>
                      {(payment.amount / 100).toLocaleString()} EGP
                    </td>
                    <td>{getStatusPill(payment.status)}</td>
                    <td style={{ color: 'var(--mj-muted)' }}>
                      {new Date(payment.dueDate).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ color: 'var(--mj-muted)' }}>{payment.method || '—'}</td>
                    <td style={{ textAlign: 'end' }}>
                      <div className="flex justify-end gap-1">
                        {payment.status === 'PENDING' && (
                          <>
                            <button className="mj-btn mj-btn--ghost mj-btn--sm" disabled={busyId === payment.id} onClick={() => updateStatus(payment.id, 'PAID')}>
                              <CheckCircle className="h-4 w-4" style={{ color: 'var(--mj-success)' }} />
                            </button>
                            <button className="mj-btn mj-btn--ghost mj-btn--sm" disabled={busyId === payment.id} onClick={() => updateStatus(payment.id, 'REJECTED')}>
                              <XCircle className="h-4 w-4" style={{ color: 'var(--mj-danger)' }} />
                            </button>
                          </>
                        )}
                        {payment.status === 'PAID' && (
                          <button className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => updateStatus(payment.id, 'REFUNDED')}>
                            <DollarSign className="h-4 w-4" style={{ color: 'var(--mj-link)' }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t" style={{ borderColor: 'var(--mj-border-soft)', padding: '0.75rem 1rem' }}>
            <Pagination page={page} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
          </div>
        </div>
      )}

      {!loading && payments?.length === 0 && (
        <div className="mj-card mj-empty">
          <CreditCard className="mj-empty-icon" />
          <p className="font-medium">{t('noPayments')}</p>
          <p style={{ color: 'var(--mj-muted-2)' }}>{t('noPaymentsDesc')}</p>
          <button className="mj-btn mj-btn--primary" onClick={() => setShowRecordModal(true)}>
            <Plus className="h-4 w-4" />
            {t('recordPayment')}
          </button>
        </div>
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
    <CenterModal open={open} onClose={onClose} title={t('recordPayment')} size="md"
      footer={<><button className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button><button className="mj-btn mj-btn--primary" onClick={handleSubmit}>{saving ? t('loading') : t('record')}</button></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mj-field">
          <label className="mj-label">{t('studentId')}</label>
          <input className="mj-input" required value={form.studentId} onChange={(e) => setForm(f => ({ ...f, studentId: e.target.value }))} placeholder="UUID" />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('amount')}</label>
          <input className="mj-input" type="number" required value={form.amount || ''} onChange={(e) => setForm(f => ({ ...f, amount: parseInt(e.target.value) || 0 }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('dueDate')}</label>
          <input className="mj-input" type="date" required value={form.dueDate} onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('description')}</label>
          <textarea className="mj-input" rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
      </form>
    </CenterModal>
  );
}

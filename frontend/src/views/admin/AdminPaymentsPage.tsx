'use client';

import { useState } from 'react';
import { Download, Receipt, Wallet } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { StatCard } from '../../components/ui/StatCard';
import { Pagination } from '../../components/ui/Pagination';
import { PaymentList } from '../../components/payments/PaymentList';
import { PaymentDetailModal } from '../../components/payments/PaymentDetailModal';
import { usePaymentList } from '../../hooks/usePaymentList';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n';
import { paymentStatusFilters, PAYMENT_TYPE_OPTIONS } from '../../lib/payments';
import type { Payment, PaymentSummary } from '../../lib/types';

export default function AdminPaymentsPage() {
  const { t } = useT();
  const toast = useToast();
  const { params, updateParam, setPage, page, data, meta, loading, initialLoading, error, reload } = usePaymentList('/payments/admin');
  const { data: summary } = useApi<PaymentSummary>(
    () => api.get<PaymentSummary>('/payments/admin/summary'),
    [],
  );
  const [selected, setSelected] = useState<Payment | null>(null);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const exportHref =
    '/api/payments/admin/export' +
    new URLSearchParams(
      Object.entries(params).filter(([, v]) => v) as [string, string][],
    ).toString();

  return (
    <div>
      <PageHeader
        title={t('payments')}
        subtitle={t('paymentsSubAdmin')}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label={t('totalRevenue')} value={summary ? `${summary.totalRevenue} ${summary.currency}` : '—'} icon={Wallet} />
        <StatCard label={t('paid')} value={summary?.paidCount ?? '—'} icon={Receipt} />
        <StatCard label={t('pending')} value={summary?.pendingCount ?? '—'} />
        <StatCard label={t('rejected')} value={summary?.rejectedCount ?? '—'} />
      </div>

      <Card bodyClassName="p-4" className="mt-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Input
            placeholder={t('searchPaymentPayer')}
            value={params.search ?? ''}
            onChange={(e) => updateParam('search', e.target.value)}
          />
          <Select
            label={t('status')}
            options={paymentStatusFilters(t)}
            value={params.status ?? ''}
            onChange={(e) => updateParam('status', e.target.value)}
          />
          <Select
            label={t('typeCol')}
            options={[{ value: '', label: t('allTypesFilter') }, ...PAYMENT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))]}
            value={params.type ?? ''}
            onChange={(e) => updateParam('type', e.target.value)}
          />
          <div className="flex items-end">
            <a href={exportHref} className="w-full">
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4" />
                {t('exportCsv')}
              </Button>
            </a>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        {error && <Alert message={error} className="m-4" />}
        {loading && (initialLoading ? <PencilLoader label={t('loading')} /> : <PencilLoader size="sm" label={t('loading')} />)}
        {!loading && (
          <div className="p-2">
            <PaymentList
              payments={data}
              showStudent
              showTeacher
              showParent
              onView={setSelected}
              onApprove={(p) => act(() => api.post(`/payments/${p.id}/approve`), 'Payment approved.')}
              onReject={(p, reason) => act(() => api.post(`/payments/${p.id}/reject`, { reason }), 'Payment rejected.')}
              onRefund={(p, reason) => act(() => api.post(`/payments/${p.id}/refund`, { reason }), 'Payment refunded.')}
            />
          </div>
        )}
        {meta && (
          <div className="border-t border-slate-100 dark:border-slate-700 p-4">
            <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} />
          </div>
        )}
      </Card>

      <PaymentDetailModal
        payment={selected}
        onClose={() => setSelected(null)}
        onApprove={(p) => act(() => api.post(`/payments/${p.id}/approve`), 'Payment approved.')}
        onReject={(p, reason) => act(() => api.post(`/payments/${p.id}/reject`, { reason }), 'Payment rejected.')}
        onRefund={(p, reason) => act(() => api.post(`/payments/${p.id}/refund`, { reason }), 'Payment refunded.')}
      />
    </div>
  );
}

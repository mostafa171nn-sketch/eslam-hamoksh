'use client';

import { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { Pagination } from '../../components/ui/Pagination';
import { PaymentList } from '../../components/payments/PaymentList';
import { PaymentDetailModal } from '../../components/payments/PaymentDetailModal';
import { usePaymentList } from '../../hooks/usePaymentList';
import { api } from '../../lib/api';
import { errorMessage } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n';
import { paymentStatusFilters, PAYMENT_TYPE_OPTIONS } from '../../lib/payments';
import type { Payment } from '../../lib/types';

export default function TeacherPaymentsPage() {
  const { t } = useT();
  const toast = useToast();
  const { params, updateParam, setPage, page, data, meta, loading, initialLoading, error, reload } = usePaymentList('/payments/teacher');
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

  const onApprove = (p: Payment) => act(() => api.post(`/payments/${p.id}/approve`), t('paymentApproved'));
  const onReject = (p: Payment, reason?: string) =>
    act(() => api.post(`/payments/${p.id}/reject`, { reason }), t('paymentRejectedMsg'));

  return (
    <div>
      <PageHeader title={t('paymentsTitle')} subtitle={t('paymentsSubTeacher')} />

      <Card bodyClassName="p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label={t('status')}
            options={paymentStatusFilters(t)}
            value={params.status ?? ''}
            onChange={(e) => updateParam('status', e.target.value)}
          />
          <Select
            label={t('type')}
            options={[{ value: '', label: t('allTypesFilter') }, ...PAYMENT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))]}
            value={params.type ?? ''}
            onChange={(e) => updateParam('type', e.target.value)}
          />
        </div>
      </Card>

      <Card className="mt-4">
        {error && <Alert message={error} className="m-4" />}
        {loading && (initialLoading ? <PencilLoader label={t('loadingPayments')} /> : <PencilLoader size="sm" label={t('loadingPayments')} />)}
        {!loading && <div className="p-2">{<PaymentList payments={data} showStudent showParent onView={setSelected} onApprove={onApprove} onReject={onReject} />}</div>}
        {meta && (
          <div className="border-t border-slate-100 dark:border-slate-700 p-4">
            <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} />
          </div>
        )}
      </Card>

      <PaymentDetailModal
        payment={selected}
        onClose={() => setSelected(null)}
        onApprove={onApprove}
        onReject={onReject}
      />
    </div>
  );
}

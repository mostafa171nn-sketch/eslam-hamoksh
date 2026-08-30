'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { Pagination } from '../../components/ui/Pagination';
import { PaymentList } from '../../components/payments/PaymentList';
import { PaymentDetailModal } from '../../components/payments/PaymentDetailModal';
import { PaymentCreateModal } from '../../components/payments/PaymentCreateModal';
import { usePaymentList } from '../../hooks/usePaymentList';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { paymentStatusFilters, PAYMENT_TYPE_OPTIONS } from '../../lib/payments';
import type { Payment } from '../../lib/types';

export default function StudentPaymentsPage() {
  const { t } = useT();
  const { user } = useAuth();
  const studentId = user?.role === 'STUDENT' ? user.student.id : '';
  const { params, updateParam, setPage, page, data, meta, loading, initialLoading, error, reload } = usePaymentList('/payments/mine');
  const [selected, setSelected] = useState<Payment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader title={t('payments')} subtitle={t('paymentsSubStudent')} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Select
            label={t('status')}
            options={paymentStatusFilters(t)}
            value={params.status ?? ''}
            onChange={(e) => updateParam('status', e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            label={t('typeCol')}
            options={[{ value: '', label: t('allTypesFilter') }, ...PAYMENT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))]}
            value={params.type ?? ''}
            onChange={(e) => updateParam('type', e.target.value)}
          />
        </div>
        <Button className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('newPaymentBtn')}
        </Button>
      </div>

      <Card className="mt-4">
        {error && <Alert message={error} className="m-4" />}
        {loading && (initialLoading ? <PencilLoader label={t('loadingPayments')} /> : <PencilLoader size="sm" label={t('loadingPayments')} />)}
        {!loading && <div className="p-2"><PaymentList payments={data} showTeacher onView={setSelected} /></div>}
        {meta && (
          <div className="border-t border-slate-100 dark:border-slate-700 p-4">
            <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} />
          </div>
        )}
      </Card>

      <PaymentDetailModal payment={selected} onClose={() => setSelected(null)} />
      <PaymentCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={reload}
        role="STUDENT"
        studentId={studentId}
      />
    </div>
  );
}

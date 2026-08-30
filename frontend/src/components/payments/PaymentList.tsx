'use client';

import type { Payment, PaymentStatusType } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { formatDate, formatCurrency } from '../../lib/format';
import { useT, type Dict } from '../../i18n';

interface Props {
  payments: Payment[];
  showTeacher?: boolean;
  showStudent?: boolean;
  showParent?: boolean;
  onView: (p: Payment) => void;
  onApprove?: (p: Payment) => void;
  onReject?: (p: Payment, reason?: string) => void;
  onRefund?: (p: Payment, reason?: string) => void;
}

const STATUS_TONE: Record<PaymentStatusType, 'green' | 'red' | 'amber' | 'blue' | 'slate'> = {
  PENDING: 'amber',
  PAID: 'green',
  REJECTED: 'red',
  EXPIRED: 'slate',
  REFUNDED: 'blue',
};

function paymentStatusKey(status: PaymentStatusType): keyof Dict {
  switch (status) {
    case 'PENDING':
      return 'paymentStatusPending';
    case 'PAID':
      return 'paymentStatusPaid';
    case 'REJECTED':
      return 'paymentStatusRejected';
    case 'EXPIRED':
      return 'paymentStatusExpired';
    case 'REFUNDED':
      return 'paymentStatusRefunded';
  }
}

export function PaymentList({ payments, showStudent, showTeacher, showParent, onView, onApprove, onReject, onRefund }: Props) {
  const { t } = useT();
  if (payments.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">{t('noPaymentsFound')}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 text-start text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-2 pr-4 font-medium">{t('paymentId')}</th>
            <th className="pb-2 pr-4 font-medium">{t('payer')}</th>
            {showStudent && <th className="pb-2 pr-4 font-medium">{t('student')}</th>}
            {showParent && <th className="pb-2 pr-4 font-medium">{t('parent')}</th>}
            {showTeacher && <th className="pb-2 pr-4 font-medium">{t('teacher')}</th>}
            <th className="pb-2 pr-4 font-medium">{t('amount')}</th>
            <th className="pb-2 pr-4 font-medium">{t('method')}</th>
            <th className="pb-2 pr-4 font-medium">{t('status')}</th>
            <th className="pb-2 pr-4 font-medium">{t('date')}</th>
            <th className="pb-2 font-medium">{t('actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 dark:bg-slate-800/60">
              <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-100">{p.paymentNumber}</td>
              <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{p.payerName}</td>
              {showStudent && <td className="py-3 pr-4">{p.student?.fullName ?? '—'}</td>}
              {showParent && <td className="py-3 pr-4">{p.parent?.fullName ?? '—'}</td>}
              {showTeacher && <td className="py-3 pr-4">{p.teacher?.fullName ?? '—'}</td>}
              <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-100">{formatCurrency(p.amount)}</td>
              <td className="py-3 pr-4 text-slate-500">{p.methodLabel}</td>
              <td className="py-3 pr-4">
                <Badge tone={STATUS_TONE[p.status]}>{t(paymentStatusKey(p.status))}</Badge>
              </td>
              <td className="py-3 pr-4 text-slate-500">{formatDate(p.createdAt)}</td>
              <td className="py-3 pr-4">
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => onView(p)} className="text-brand-600 hover:underline">
                    {t('view')}
                  </button>
                  {onApprove && p.status === 'PENDING' && (
                    <button onClick={() => onApprove(p)} className="text-emerald-600 hover:underline">
                      {t('approve')}
                    </button>
                  )}
                  {onReject && p.status === 'PENDING' && (
                    <button onClick={() => onReject(p)} className="text-red-600 hover:underline">
                      {t('reject')}
                    </button>
                  )}
                  {onRefund && p.status === 'PAID' && (
                    <button onClick={() => onRefund(p)} className="text-blue-600 hover:underline">
                      {t('refund')}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

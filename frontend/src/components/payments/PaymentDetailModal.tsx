'use client';

import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Textarea } from '../ui/Textarea';
import type { Payment, PaymentStatusType } from '../../lib/types';
import { formatDateTime, formatCurrency } from '../../lib/format';

const STATUS_TONE: Record<PaymentStatusType, 'green' | 'red' | 'amber' | 'blue' | 'slate'> = {
  PENDING: 'amber',
  PAID: 'green',
  REJECTED: 'red',
  EXPIRED: 'slate',
  REFUNDED: 'blue',
};

interface Props {
  payment: Payment | null;
  onClose: () => void;
  onApprove?: (p: Payment) => void;
  onReject?: (p: Payment, reason: string) => void;
  onRefund?: (p: Payment, reason: string) => void;
}

export function PaymentDetailModal({ payment, onClose, onApprove, onReject, onRefund }: Props) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (!payment) return null;

  const doApprove = async () => {
    if (!onApprove) return;
    setBusy(true);
    try {
      await onApprove(payment);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const doReject = async () => {
    if (!onReject) return;
    setBusy(true);
    try {
      await onReject(payment, reason);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const doRefund = async () => {
    if (!onRefund) return;
    setBusy(true);
    try {
      await onRefund(payment, reason);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!payment} onClose={onClose} title={`Payment ${payment.paymentNumber}`} size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge tone={STATUS_TONE[payment.status]}>{payment.status}</Badge>
          <span className="text-xl font-semibold text-slate-900 dark:text-white">
            {formatCurrency(payment.amount)} {payment.currency}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-slate-400">Payer</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-100">{payment.payerName}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Student</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-100">{payment.student?.fullName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Teacher</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-100">{payment.teacher?.fullName ?? '—'}</dd>
          </div>
          {payment.parent && (
            <div>
              <dt className="text-slate-400">Parent</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-100">{payment.parent.fullName}</dd>
            </div>
          )}
          <div>
            <dt className="text-slate-400">Type</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-100">{payment.type}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Method</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-100">{payment.methodLabel}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Transaction Reference</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-100">{payment.transactionReference ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Submitted</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-100">{formatDateTime(payment.createdAt)}</dd>
          </div>
          {payment.paidAt && (
            <div>
              <dt className="text-slate-400">Paid</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-100">{formatDateTime(payment.paidAt)}</dd>
            </div>
          )}
          {payment.rejectionReason && (
            <div className="col-span-2">
              <dt className="text-slate-400">Rejection Reason</dt>
              <dd className="font-medium text-red-600">{payment.rejectionReason}</dd>
            </div>
          )}
        </dl>

        {payment.lesson && (
          <p className="text-sm text-slate-500">
            Lesson: {payment.lesson.subject} · {payment.subscription ? 'Part of a monthly subscription' : ''}
          </p>
        )}

        {payment.proofUrl && (
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Payment Proof</p>
            <a href={payment.proofUrl} target="_blank" rel="noreferrer">
              <img
                src={payment.proofUrl}
                alt="Payment proof"
                className="max-h-64 w-auto rounded-lg border border-slate-200 dark:border-slate-700"
              />
            </a>
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Status History</p>
          <ol className="space-y-2 border-l border-slate-200 dark:border-slate-700 pl-4">
            {payment.history.map((h) => (
              <li key={h.id} className="text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-100">{h.newStatus}</span>
                {h.changedByName && <span className="text-slate-500"> · {h.changedByName}</span>}
                <span className="text-slate-400"> · {formatDateTime(h.createdAt)}</span>
                {h.reason && <p className="text-red-600">{h.reason}</p>}
              </li>
            ))}
          </ol>
        </div>

        {(onApprove || onReject || onRefund) && (
          <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
            <Textarea
              label="Reason (for rejection / refund)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex flex-wrap justify-end gap-2">
              {onApprove && payment.status === 'PENDING' && (
                <Button onClick={doApprove} loading={busy}>
                  Approve
                </Button>
              )}
              {onReject && payment.status === 'PENDING' && (
                <Button variant="danger" onClick={doReject} loading={busy}>
                  Reject
                </Button>
              )}
              {onRefund && payment.status === 'PAID' && (
                <Button variant="outline" onClick={doRefund} loading={busy}>
                  Refund
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

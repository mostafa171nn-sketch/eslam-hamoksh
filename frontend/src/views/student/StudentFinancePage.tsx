'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Receipt,
  Trophy,
} from 'lucide-react';
import { useT, type Dict } from '../../i18n';
import { useApi } from '../../hooks/useApi';
import { api, type ApiResponse } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { Payment, PaymentStatusType } from '../../lib/types';
import { formatDate } from '../../lib/format';
import { usePaymentList } from '../../hooks/usePaymentList';

import { EmptyState } from '../../components/ui/EmptyState';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { PaymentCreateModal } from '../../components/payments/PaymentCreateModal';
import { PaymentDetailModal } from '../../components/payments/PaymentDetailModal';

type FinTab = 'overview' | 'payments' | 'transactions' | 'rewards';

interface Wallet {
  id: string;
  balance: number;
  currency: string;
  status: string;
}

type WalletTxType =
  | 'DEPOSIT'
  | 'PURCHASE'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'COMMISSION'
  | 'WITHDRAWAL'
  | 'SETTLEMENT';

interface WalletTx {
  id: string;
  type: WalletTxType;
  amount: number;
  reference?: string | null;
  description?: string | null;
  createdAt: string;
}

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

function txTypeKey(type: WalletTxType): keyof Dict {
  switch (type) {
    case 'DEPOSIT':
      return 'financeTopUp';
    case 'WITHDRAWAL':
      return 'financeWithdraw';
    case 'PURCHASE':
      return 'financePay';
    default:
      return 'financeTransaction';
  }
}

/** Outgoing money shows a minus sign, incoming a plus (plain RTL text renders it like the reference). */
function txSign(type: WalletTxType, amount: number): '' | '+' | '-' {
  if (type === 'DEPOSIT' || type === 'REFUND') return '+';
  if (type === 'ADJUSTMENT') return amount < 0 ? '-' : '+';
  return '-';
}

/** One finance row: title + receipt mark, meta line, optional drill-down. */
function FinRow({
  title,
  meta,
  onOpen,
  testId,
  rtl,
}: {
  title: string;
  meta: string;
  onOpen?: () => void;
  testId?: string;
  rtl: boolean;
}) {
  const inner = (
    <>
      <Receipt className="h-5 w-5 shrink-0 text-brand-500 dark:text-brand-400" aria-hidden />
      <span className="min-w-0 flex-1 text-start">
        <span className="block truncate text-[15px] font-extrabold text-[#242640] dark:text-slate-100">
          {title}
        </span>
        <span className="mt-1 block truncate text-[13px] font-semibold text-[#7A5FD0] dark:text-brand-300">
          {meta}
        </span>
      </span>
      {onOpen && <RowChevron rtl={rtl} />}
    </>
  );
  const cls =
    'flex w-full touch-manipulation items-center gap-3 px-4 py-3.5 text-start motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#635BDF]';
  return onOpen ? (
    <button type="button" onClick={onOpen} data-testid={testId} className={`${cls} transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40`}>
      {inner}
    </button>
  ) : (
    <div data-testid={testId} className={cls}>
      {inner}
    </div>
  );
}

function RowChevron({ rtl }: { rtl: boolean }) {
  const Icon = rtl ? ChevronLeft : ChevronRight;
  return <Icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />;
}

export default function StudentFinancePage() {
  const { t, dir, lang } = useT();
  const { user } = useAuth();
  const fmtLang = lang === 'ar' ? 'ar' : 'en';
  const cur = fmtLang === 'ar' ? 'ج.م' : 'EGP';

  const [tab, setTab] = useState<FinTab>('overview');
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Payment | null>(null);
  const [simAction, setSimAction] = useState<'financeTopUp' | 'financeWithdraw' | null>(null);

  const studentId = user?.role === 'STUDENT' ? user.student.id : '';
  const payments = usePaymentList('/payments/mine');

  const { data: walletData } = useApi(() => api.get<Wallet>('/wallets/me'), []);
  const wallet = walletData ?? null;
  const walletId = wallet?.id ?? null;
  const txs = useApi(
    () =>
      walletId
        ? api.get<WalletTx[]>(`/wallets/${walletId}/transactions`, { limit: 50 })
        : Promise.resolve({ success: true, message: '', data: [] } as ApiResponse<WalletTx[]>),
    [walletId],
  );
  const transactions = txs.data ?? [];

  const fmtMoney = (absAmount: number, sign: '' | '+' | '-' = '') =>
    `${sign}${Math.abs(absAmount).toLocaleString('en-US')} ${cur}`;

  const balance = wallet?.balance ?? 0;
  // No reserved-rewards source exists in the backend; the layout slot stays honest.
  const reservedTotal = 0;

  const latestPayment = [...payments.data].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  )[0];

  const paymentTitle = (p: Payment) =>
    (typeof p.lesson === 'object' && p.lesson?.subject) || p.teacher?.fullName || p.paymentNumber;

  const TABS: Array<{ key: FinTab; labelKey: keyof Dict }> = [
    { key: 'overview', labelKey: 'overview' },
    { key: 'payments', labelKey: 'payments' },
    { key: 'transactions', labelKey: 'financeTransactionsTab' },
    { key: 'rewards', labelKey: 'financeRewardsTab' },
  ];

  const rtl = dir === 'rtl';

  return (
    <div>
      <h1 className="text-balance text-[26px] font-black tracking-tight text-[#172635] dark:text-white">
        {t('financeStudent')}
      </h1>
      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{t('financeSubtitle')}</p>

      {/* Segmented tabs */}
      <div className="mt-4 flex">
        <div role="tablist" aria-label={t('financeStudent')} className="flex w-full gap-1 rounded-2xl bg-[#E9F1F7] p-1.5 sm:w-[440px] dark:bg-slate-800">
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.key)}
              className={`min-w-0 flex-1 touch-manipulation truncate rounded-xl px-2 py-2.5 text-sm transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF] ${
                active
                  ? 'bg-white font-extrabold text-[#242640] shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t(item.labelKey)}
            </button>
          );
        })}
        </div>
      </div>

      <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">{t('financeSimNote')}</p>

      {/* Actions */}
      <div className="mt-3 flex">
        <div className="grid w-full grid-cols-3 gap-2.5 sm:w-[600px] sm:gap-3">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="touch-manipulation rounded-2xl border border-slate-200/80 bg-white px-2 py-4 text-center text-[15px] font-extrabold text-[#0F6B7E] shadow-sm transition-colors hover:bg-slate-50 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF] dark:border-slate-700 dark:bg-slate-800 dark:text-teal-300 dark:hover:bg-slate-700"
        >
          {t('financePay')}
        </button>
        <button
          type="button"
          onClick={() => setSimAction('financeTopUp')}
          className="touch-manipulation rounded-2xl border border-slate-200/80 bg-white px-2 py-4 text-center text-[15px] font-extrabold text-[#0F6B7E] shadow-sm transition-colors hover:bg-slate-50 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF] dark:border-slate-700 dark:bg-slate-800 dark:text-teal-300 dark:hover:bg-slate-700"
        >
          {t('financeTopUp')}
        </button>
        <button
          type="button"
          onClick={() => setSimAction('financeWithdraw')}
          className="touch-manipulation rounded-2xl border border-slate-200/80 bg-white px-2 py-4 text-center text-[15px] font-extrabold text-[#0F6B7E] shadow-sm transition-colors hover:bg-slate-50 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF] dark:border-slate-700 dark:bg-slate-800 dark:text-teal-300 dark:hover:bg-slate-700"
        >
          {t('financeWithdraw')}
        </button>
        </div>
      </div>

      {tab === 'overview' && (
        <div role="tabpanel">
          {/* Balance card */}
          <section
            aria-label={t('financeAvailableBalance')}
            className="mt-4 overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#156A86_0%,#0F5A70_100%)] p-5 text-white dark:ring-1 dark:ring-inset dark:ring-slate-700 sm:p-6"
          >
            <p className="text-sm font-semibold text-white/90">{t('financeAvailableBalance')}</p>
            <p className="mt-1 text-balance text-[40px] font-black leading-none tracking-tight tabular-nums">
              {fmtMoney(balance)}
            </p>
            <div aria-hidden className="my-4 h-px bg-white/25" />
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white/90">{t('financeReservedRewards')}</p>
              <p className="text-lg font-extrabold tabular-nums">{fmtMoney(reservedTotal)}</p>
            </div>
          </section>

          {/* Latest transaction */}
          <section aria-label={t('financeLatestTransaction')} className="mt-6">
            <h2 className="text-balance text-lg font-extrabold tracking-tight text-[#172635] dark:text-white">
              {t('financeLatestTransaction')}
            </h2>
            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-800">
              {payments.loading && payments.initialLoading ? (
                <PencilLoader label={t('loadingPayments')} />
              ) : latestPayment ? (
                <FinRow
                  testId="finance-latest"
                  rtl={rtl}
                  title={paymentTitle(latestPayment)}
                  meta={`${fmtMoney(latestPayment.amount, latestPayment.status === 'REFUNDED' ? '+' : '-')} · ${t(paymentStatusKey(latestPayment.status))}`}
                  onOpen={() => setDetail(latestPayment)}
                />
              ) : (
                <p className="px-4 py-8 text-center text-sm text-slate-400">{t('noPaymentsFound')}</p>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === 'payments' && (
        <div role="tabpanel">
          <section aria-label={t('payments')} className="mt-6">
            <h2 className="text-balance text-lg font-extrabold tracking-tight text-[#172635] dark:text-white">
              {t('payments')}
            </h2>
            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-800">
              {payments.error && <Alert message={payments.error} className="m-4" />}
              {payments.loading && payments.initialLoading ? (
                <PencilLoader label={t('loadingPayments')} />
              ) : payments.data.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">{t('noPaymentsFound')}</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {payments.data.map((p) => (
                    <FinRow
                      key={p.id}
                      rtl={rtl}
                      title={paymentTitle(p)}
                      meta={`${fmtMoney(p.amount, p.status === 'REFUNDED' ? '+' : '-')} · ${t(paymentStatusKey(p.status))} · ${formatDate(p.createdAt, fmtLang)}`}
                      onOpen={() => setDetail(p)}
                    />
                  ))}
                </div>
              )}
              {payments.meta && payments.meta.totalPages > 1 && (
                <div className="border-t border-slate-100 p-4 dark:border-slate-700">
                  <Pagination page={payments.page} totalPages={payments.meta.totalPages} onChange={payments.setPage} />
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === 'transactions' && (
        <div role="tabpanel">
          <section aria-label={t('financeTransactionsTab')} className="mt-6">
            <h2 className="text-balance text-lg font-extrabold tracking-tight text-[#172635] dark:text-white">
              {t('financeTransactionsTab')}
            </h2>
            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-800">
              {txs.loading ? (
                <PencilLoader label={t('loading')} />
              ) : txs.error ? (
                <Alert message={txs.error} className="m-4" />
              ) : transactions.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">{t('noTransactions')}</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {transactions.map((x) => (
                    <FinRow
                      key={x.id}
                      rtl={rtl}
                      title={x.description || t(txTypeKey(x.type))}
                      meta={`${fmtMoney(x.amount, txSign(x.type, x.amount))}${x.reference ? ` · ${x.reference}` : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === 'rewards' && (
        <div role="tabpanel">
          <section aria-label={t('financeRewardsImpact')} className="mt-6">
            <h2 className="text-balance text-lg font-extrabold tracking-tight text-[#172635] dark:text-white">
              {t('financeRewardsImpact')}
            </h2>
            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-800">
              <p className="border-b border-slate-100 px-4 py-3.5 text-[15px] font-extrabold text-[#242640] dark:border-slate-700 dark:text-slate-100">
                {t('financeReservedSummary', { amount: fmtMoney(reservedTotal) })}
              </p>
              <div className="p-2">
                <EmptyState
                  icon={Trophy}
                  title={t('journeyNoRewardYet')}
                  description={t('journeyNoRewardHint')}
                />
              </div>
            </div>
          </section>
        </div>
      )}

      <PaymentCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={payments.reload}
        role="STUDENT"
        studentId={studentId}
      />
      <PaymentDetailModal payment={detail} onClose={() => setDetail(null)} />
      <Modal
        open={simAction !== null}
        onClose={() => setSimAction(null)}
        title={simAction ? t(simAction) : ''}
        size="sm"
      >
        <p className="px-5 py-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t('financeSimNote')}</p>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-700">
          <Button onClick={() => setSimAction(null)}>{t('close')}</Button>
        </div>
      </Modal>
    </div>
  );
}

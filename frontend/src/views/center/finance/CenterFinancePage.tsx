'use client';

import { useState } from 'react';
import {
  Wallet, TrendingDown, ListChecks, Plus, Trash2,
  BadgeCheck, Banknote, Calculator,
} from 'lucide-react';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey } from '../../../i18n';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill } from '../ui/CenterPill';
import { CenterSearchInput } from '../ui/CenterSearchInput';
import { CenterModal } from '../ui/CenterModal';

interface Overview {
  todayIncome: number;
  totalCollected: number;
  teacherDues: number;
  todayExpenses: number;
  pendingPayments: number;
}

interface LedgerRow {
  id: string;
  name: string;
  totalPaid: number;
  lastPayment: string | null;
  paymentCount: number;
  groupsCount: number;
  balance: number;
}

interface ExpenseRow {
  id: string;
  title: string;
  category: string | null;
  amount: number;
  date: string;
  note: string | null;
}

interface SettlementRow {
  id: string;
  period: string;
  status: string;
  teacherId: string;
  grossAmount: number;
  platformCommission: number;
  teacherShare: number;
  centerShare: number;
  netAmount: number;
  createdAt: string;
  teacher?: { user: { fullName: string } } | null;
}

interface SettlementSummary {
  counts: { pending: number; calculated: number; approved: number; paid: number; cancelled: number; total: number };
  totals: { grossAmount: number; platformCommission: number; teacherShare: number; centerShare: number; netAmount: number };
}

interface FormData {
  teachers: { id: string; name: string }[];
}

const EXPENSE_CATEGORIES = [
  { value: 'ايجار', label: 'إيجار' },
  { value: 'مرتبات', label: 'مرتبات' },
  { value: 'ادوات وتجهيزات', label: 'أدوات وتجهيزات' },
  { value: 'نثريات', label: 'نثريات' },
  { value: 'اخري', label: 'أخرى' },
];

const settleTone = (s: string) =>
  s === 'PAID' ? 'green' : s === 'CALCULATED' ? 'amber' : s === 'APPROVED' ? 'blue' : s === 'PENDING' ? 'slate' : 'red';

export function CenterFinancePage() {
  const { t, lang } = useT();
  const [tab, setTab] = useState('overview');

  const tabs = [
    { key: 'overview', label: t('financeOverview') },
    { key: 'ledger', label: t('financeLedger') },
    { key: 'settlements', label: t('financeSettlements') },
    { key: 'expenses', label: t('financeExpenses') },
  ];

  return (
    <div className="space-y-6">
      <CenterPageHeader title={t('moduleFinance')} description={t('financeSub')} />

      <nav className="mj-tabs" aria-label={t('moduleFinance')}>
        {tabs.map((tb) => (
          <button
            key={tb.key}
            className={`mj-tab ${tab === tb.key ? 'mj-tab--active' : ''}`}
            onClick={() => setTab(tb.key)}
          >
            {tb.label}
          </button>
        ))}
      </nav>

      <div>
        {tab === 'overview' && <OverviewTab t={t} lang={lang} />}
        {tab === 'ledger' && <LedgerTab t={t} lang={lang} />}
        {tab === 'settlements' && <SettlementsTab t={t} lang={lang} />}
        {tab === 'expenses' && <ExpensesTab t={t} lang={lang} />}
      </div>
    </div>
  );
}

function OverviewTab({ t, lang }: { t: (k: DictKey) => string; lang: string }) {
  const { data, loading, error } = useApi<Overview>(() => api.get<Overview>('/center/account/finance'), []);
  const { data: recent } = useApi<ExpenseRow[]>(() => api.get<ExpenseRow[]>('/center/account/finance/expenses?take=6'), []);

  const money = (n: number | undefined) =>
    `${(n ?? 0).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} EGP`;

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <div className="mj-card mj-card--padding text-[color:var(--mj-danger)]">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CenterStatCard label={t('todayIncome')} value={money(data?.todayIncome)} />
        <CenterStatCard label={t('totalCollected')} value={money(data?.totalCollected)} />
        <CenterStatCard label={t('teacherDues')} value={money(data?.teacherDues)} />
        <CenterStatCard label={t('todayExpenses')} value={money(data?.todayExpenses)} />
      </div>

      <div className="mj-card mj-card--padding">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-[color:var(--mj-ink-strong)]">
            <ListChecks className="h-4 w-4 text-[color:var(--mj-amber)]" />
            {t('pendingPaymentsCount')}
          </p>
          <CenterPill tone={data && data.pendingPayments > 0 ? 'amber' : 'green'}>{data?.pendingPayments ?? 0}</CenterPill>
        </div>
      </div>

      <div className="mj-card">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-5 py-4">
          <p className="mj-title">{t('financeRecentExpenses')}</p>
        </div>
        {recent && recent.length > 0 ? (
          <div className="divide-y divide-[color:var(--mj-border-soft)]">
            {recent.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[color:var(--mj-ink-strong)]">{e.title}</p>
                  <p className="text-xs text-[color:var(--mj-muted)]">{e.category || '—'}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-[color:var(--mj-danger)]">-{money(e.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mj-empty">
            <TrendingDown className="mj-empty-icon" />
            <span>{t('noExpenses')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LedgerTab({ t, lang }: { t: (k: DictKey) => string; lang: string }) {
  const [search, setSearch] = useState('');
  const { data, loading, error } = useApi<LedgerRow[]>(
    () => api.get<LedgerRow[]>('/center/account/finance/ledger', search ? { search } : {}),
    [search]
  );

  const money = (n: number | undefined) =>
    `${(n ?? 0).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} EGP`;
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' }) : '—';

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <div className="mj-card mj-card--padding text-[color:var(--mj-danger)]">{error}</div>;

  return (
    <div className="mj-card">
      <div className="mj-toolbar border-b border-[color:var(--mj-border-soft)] p-4">
        <CenterSearchInput
          placeholder={t('searchStudents') + '...'}
          value={search}
          onChange={setSearch}
        />
        <span className="text-xs text-[color:var(--mj-muted)]">{t('studentLedgerNote')}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="mj-table">
          <thead>
            <tr>
              <th>{t('student')}</th>
              <th>{t('groupCount')}</th>
              <th>{t('paymentCount')}</th>
              <th>{t('lastPayment')}</th>
              <th>{t('studentTotalPaid')}</th>
              <th>{t('balance')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--mj-border-soft)]">
            {data?.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <span className="mj-avatar mj-avatar--sm">{s.name.charAt(0)}</span>
                    <span className="font-medium text-[color:var(--mj-ink-strong)]">{s.name}</span>
                  </div>
                </td>
                <td>{s.groupsCount}</td>
                <td>{s.paymentCount}</td>
                <td>{fmtDate(s.lastPayment)}</td>
                <td className="font-semibold text-[color:var(--mj-success)]">{money(s.totalPaid)}</td>
                <td>{money(s.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettlementsTab({ t, lang }: { t: (k: DictKey) => string; lang: string }) {
  const toast = useToast();
  const { data: summary, reload: reloadSummary } = useApi<SettlementSummary>(
    () => api.get<SettlementSummary>('/center/account/finance/settlements/summary'),
    []
  );
  const { data: settlements, loading, error, reload } = useApi<SettlementRow[]>(
    () => api.get<SettlementRow[]>('/center/account/finance/settlements'),
    []
  );
  const { data: formData } = useApi<FormData>(() => api.get<FormData>('/center/groups/form-data'), []);
  const [showCalc, setShowCalc] = useState(false);

  const money = (n: number | undefined) =>
    `${(n ?? 0).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} EGP`;

  const act = async (url: string, msg: string) => {
    try {
      await api.patch(url);
      toast.success(msg);
      reload();
      reloadSummary();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <div className="mj-card mj-card--padding text-[color:var(--mj-danger)]">{error}</div>;

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryChip label={t('settlementPending')} value={summary.counts.pending} tone="slate" />
          <SummaryChip label={t('settlementCalculated')} value={summary.counts.calculated} tone="amber" />
          <SummaryChip label={t('settlementApproved')} value={summary.counts.approved} tone="blue" />
          <SummaryChip label={t('settlementPaid')} value={summary.counts.paid} tone="green" />
          <SummaryChip label={t('settlementCancelled')} value={summary.counts.cancelled} tone="red" />
          <SummaryChip label={t('settlementTotal')} value={summary.counts.total} tone="brand" />
        </div>
      )}

      <div className="mj-card">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-5 py-3">
          <p className="text-sm text-[color:var(--mj-muted)]">{t('financeSettlements')}</p>
          <button type="button" className="mj-btn mj-btn--soft mj-btn--sm" onClick={() => setShowCalc(true)}>
            <Calculator className="h-4 w-4" />
            {t('settleCalculate')}
          </button>
        </div>
        {settlements && settlements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="mj-table">
              <thead>
                <tr>
                  <th>{t('groupTeacher')}</th>
                  <th>{t('settlePeriod')}</th>
                  <th>{t('status')}</th>
                  <th>{t('financeNetAmount')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--mj-border-soft)]">
                {settlements.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mj-avatar mj-avatar--sm">{(s.teacher?.user.fullName ?? '—').charAt(0)}</span>
                        <span className="font-medium text-[color:var(--mj-ink-strong)]">{s.teacher?.user.fullName ?? '—'}</span>
                      </div>
                    </td>
                    <td className="text-xs text-[color:var(--mj-muted)]">{s.period}</td>
                    <td>
                      <CenterPill tone={settleTone(s.status)} dot>{s.status?.replace(/_/g, ' ') ?? '—'}</CenterPill>
                    </td>
                    <td>{money(s.netAmount)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {s.status === 'CALCULATED' && (
                          <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => act(`/center/account/finance/settlements/${s.id}/approve`, t('settleApprovedToast'))}>
                            <BadgeCheck className="h-4 w-4" />
                            {t('settleApprove')}
                          </button>
                        )}
                        {s.status === 'APPROVED' && (
                          <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => act(`/center/account/finance/settlements/${s.id}/pay`, t('settlePaidToast'))}>
                            <Banknote className="h-4 w-4" />
                            {t('settlePay')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mj-empty">
            <Wallet className="mj-empty-icon" />
            <span>{t('noSettlements')}</span>
          </div>
        )}
      </div>

      {showCalc && formData && <CalculateModal t={t} teachers={formData.teachers} onClose={() => setShowCalc(false)} onDone={() => { setShowCalc(false); reload(); reloadSummary(); }} />}
    </div>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'amber' | 'blue' | 'green' | 'red' | 'brand' }) {
  const textTone =
    tone === 'green' ? 'text-[color:var(--mj-success)]'
    : tone === 'red' ? 'text-[color:var(--mj-danger)]'
    : tone === 'amber' ? 'text-[color:var(--mj-amber)]'
    : tone === 'blue' ? 'text-[color:var(--mj-link)]'
    : tone === 'brand' ? 'text-[color:var(--mj-accent)]'
    : 'text-[color:var(--mj-ink-strong)]';
  return (
    <div className="mj-card mj-card--padding text-center">
      <p className={`mj-num text-xl font-bold ${textTone}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-[color:var(--mj-muted)]">{label}</p>
    </div>
  );
}

function CalculateModal({ t, teachers, onClose, onDone }: { t: (k: DictKey) => string; teachers: { id: string; name: string }[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [teacherId, setTeacherId] = useState('');
  const [period, setPeriod] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId || !period) { toast.error(t('requiredFields')); return; }
    setSaving(true);
    try {
      await api.post('/center/account/finance/settlements/calculate', { teacherId, period });
      toast.success(t('settleCalculatedToast'));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CenterModal open onClose={onClose} title={t('settleCalculate')} description={t('settlePeriod')} size="sm"
      footer={<>
        <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
        <button type="submit" form="calc-form" className="mj-btn mj-btn--primary" disabled={saving}>{t('calculate')}</button>
      </>}>
      <form id="calc-form" onSubmit={submit} noValidate>
        <div className="mj-field">
          <label className="mj-label" htmlFor="calc-period">{t('settlePeriod')}</label>
          <input id="calc-period" type="month" required className="mj-input" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
        <div className="mj-field">
          <label className="mj-label" htmlFor="calc-teacher">{t('groupTeacher')}</label>
          <select id="calc-teacher" required className="mj-select" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="" disabled>{t('selectBranch')}</option>
            {teachers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
      </form>
    </CenterModal>
  );
}

function ExpensesTab({ t, lang }: { t: (k: DictKey) => string; lang: string }) {
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const { data: expenses, loading, error, reload } = useApi<ExpenseRow[]>(
    () => api.get<ExpenseRow[]>('/center/account/finance/expenses'),
    []
  );

  const money = (n: number | undefined) =>
    `${(n ?? 0).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} EGP`;
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const remove = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api.delete(`/center/account/finance/expenses/${id}`);
      toast.success(t('expenseDeletedToast'));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <div className="mj-card mj-card--padding text-[color:var(--mj-danger)]">{error}</div>;

  return (
    <div className="mj-card">
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-5 py-3">
        <p className="text-sm text-[color:var(--mj-muted)]">{t('financeExpenses')}</p>
        <button type="button" className="mj-btn mj-btn--soft mj-btn--sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          {t('addExpense')}
        </button>
      </div>
      {expenses && expenses.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="mj-table">
            <thead>
              <tr>
                <th>{t('expenseTitle')}</th>
                <th>{t('expenseCategory')}</th>
                <th>{t('expenseDate')}</th>
                <th>{t('expenseAmount')}</th>
                <th className="text-end"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--mj-border-soft)]">
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="font-medium text-[color:var(--mj-ink-strong)]">{e.title}</td>
                  <td>{e.category || '—'}</td>
                  <td>{fmtDate(e.date)}</td>
                  <td className="font-semibold text-[color:var(--mj-danger)]">{money(e.amount)}</td>
                  <td className="text-end">
                    <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => remove(e.id)} aria-label={t('delete')}>
                      <Trash2 className="h-4 w-4 text-[color:var(--mj-danger)]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mj-empty">
          <TrendingDown className="mj-empty-icon" />
          <span>{t('noExpenses')}</span>
        </div>
      )}

      {showAdd && <AddExpenseModal t={t} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); reload(); }} />}
    </div>
  );
}

function AddExpenseModal({ t, onClose, onDone }: { t: (k: DictKey) => string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', amount: '', date: '', note: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.amount) { toast.error(t('requiredFields')); return; }
    setSaving(true);
    try {
      await api.post('/center/account/finance/expenses', {
        title: form.title, category: form.category || null, amount: Number(form.amount), date: form.date || undefined, note: form.note || null,
      });
      toast.success(t('expenseCreatedToast'));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CenterModal open onClose={onClose} title={t('addExpense')} size="sm"
      footer={<>
        <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
        <button type="submit" form="exp-form" className="mj-btn mj-btn--primary" disabled={saving}>{t('save')}</button>
      </>}>
      <form id="exp-form" onSubmit={submit} noValidate>
        <div className="mj-field">
          <label className="mj-label" htmlFor="exp-title">{t('expenseTitle')}</label>
          <input id="exp-title" required className="mj-input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label" htmlFor="exp-category">{t('expenseCategory')}</label>
          <select id="exp-category" className="mj-select" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            <option value="" disabled>{t('selectBranch')}</option>
            {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="mj-field">
          <label className="mj-label" htmlFor="exp-amount">{t('expenseAmount')}</label>
          <input id="exp-amount" type="number" required min="1" className="mj-input" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label" htmlFor="exp-date">{t('expenseDate')}</label>
          <input id="exp-date" type="date" className="mj-input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label" htmlFor="exp-note">{t('expenseNote')}</label>
          <textarea id="exp-note" rows={3} className="mj-textarea" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
        </div>
      </form>
    </CenterModal>
  );
}

export default CenterFinancePage;

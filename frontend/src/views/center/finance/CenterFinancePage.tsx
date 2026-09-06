'use client';

import { useState } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, UserRound, ListChecks, Plus, Trash2,
  BadgeCheck, Banknote, Calculator,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { StatCard } from '../../../components/ui/StatCard';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Tabs } from '../../../components/ui/Tabs';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey } from '../../../i18n';

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

  return (
    <div className="space-y-6">
      <PageHeader title={t('moduleFinance')} subtitle={t('financeSub')} />

      <Tabs
        tabs={[
          { key: 'overview', label: t('financeOverview') },
          { key: 'ledger', label: t('financeLedger') },
          { key: 'settlements', label: t('financeSettlements') },
          { key: 'expenses', label: t('financeExpenses') },
        ]}
        activeKey={tab}
        onChange={setTab}
      >
        <div className="pt-1">
          {tab === 'overview' && <OverviewTab t={t} lang={lang} />}
          {tab === 'ledger' && <LedgerTab t={t} lang={lang} />}
          {tab === 'settlements' && <SettlementsTab t={t} lang={lang} />}
          {tab === 'expenses' && <ExpensesTab t={t} lang={lang} />}
        </div>
      </Tabs>
    </div>
  );
}

function OverviewTab({ t, lang }: { t: (k: DictKey) => string; lang: string }) {
  const { data, loading, error } = useApi<Overview>(() => api.get<Overview>('/center/account/finance'), []);
  const { data: recent } = useApi<ExpenseRow[]>(() => api.get<ExpenseRow[]>('/center/account/finance/expenses?take=6'), []);

  const money = (n: number | undefined) =>
    `${(n ?? 0).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} EGP`;

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('todayIncome')} value={money(data?.todayIncome)} icon={TrendingUp} tone="emerald" />
        <StatCard label={t('totalCollected')} value={money(data?.totalCollected)} icon={Wallet} tone="brand" />
        <StatCard label={t('teacherDues')} value={money(data?.teacherDues)} icon={UserRound} tone="amber" />
        <StatCard label={t('todayExpenses')} value={money(data?.todayExpenses)} icon={TrendingDown} tone="coral" />
      </div>

      <Card bodyClassName="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
            <ListChecks className="h-4 w-4 text-amber-500" />
            {t('pendingPaymentsCount')}
          </p>
          <Badge tone={data && data.pendingPayments > 0 ? 'amber' : 'green'}>{data?.pendingPayments ?? 0}</Badge>
        </div>
      </Card>

      <Card title={t('financeRecentExpenses')} bodyClassName="p-0">
        {recent && recent.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recent.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{e.title}</p>
                  <p className="text-xs text-slate-500">{e.category || '—'}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-red-600">-{money(e.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={TrendingDown} title={t('noExpenses')} />
        )}
      </Card>
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
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>;

  return (
    <Card bodyClassName="p-0">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center dark:border-slate-700">
        <Input
          className="sm:max-w-sm"
          placeholder={t('searchStudents') + '...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <p className="text-xs text-slate-500">{t('studentLedgerNote')}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-start text-xs text-slate-500 dark:border-slate-700">
              <th className="px-5 py-2.5 text-start font-medium">{t('student')}</th>
              <th className="px-5 py-2.5 text-start font-medium">{t('groupCount')}</th>
              <th className="px-5 py-2.5 text-start font-medium">{t('paymentCount')}</th>
              <th className="px-5 py-2.5 text-start font-medium">{t('lastPayment')}</th>
              <th className="px-5 py-2.5 text-start font-medium">{t('studentTotalPaid')}</th>
              <th className="px-5 py-2.5 text-start font-medium">{t('balance')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {data?.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="px-5 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {s.name.charAt(0)}
                  </span>
                  <span className="ms-2 font-medium text-slate-900 dark:text-white">{s.name}</span>
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{s.groupsCount}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{s.paymentCount}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{fmtDate(s.lastPayment)}</td>
                <td className="px-5 py-3 font-semibold text-emerald-600">{money(s.totalPaid)}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{money(s.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
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
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>;

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

      <Card bodyClassName="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-700">
          <p className="text-sm text-slate-500">{t('financeSettlements')}</p>
          <Button size="sm" onClick={() => setShowCalc(true)}>
            <Calculator className="h-4 w-4" />
            {t('settleCalculate')}
          </Button>
        </div>
        {settlements && settlements.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {settlements.map((s) => (
              <div key={s.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.teacher?.user.fullName ?? '—'}</p>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">{s.period}</span>
                    <Badge tone={settleTone(s.status)}>{s.status?.replace(/_/g, ' ') ?? '—'}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{t('financeNetAmount')}: {money(s.netAmount)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {s.status === 'CALCULATED' && (
                    <Button size="sm" variant="outline" onClick={() => act(`/center/account/finance/settlements/${s.id}/approve`, t('settleApprovedToast'))}>
                      <BadgeCheck className="h-4 w-4" />
                      {t('settleApprove')}
                    </Button>
                  )}
                  {s.status === 'APPROVED' && (
                    <Button size="sm" variant="outline" onClick={() => act(`/center/account/finance/settlements/${s.id}/pay`, t('settlePaidToast'))}>
                      <Banknote className="h-4 w-4" />
                      {t('settlePay')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Wallet} title={t('noSettlements')} />
        )}
      </Card>

      {showCalc && formData && <CalculateModal t={t} teachers={formData.teachers} onClose={() => setShowCalc(false)} onDone={() => { setShowCalc(false); reload(); reloadSummary(); }} />}
    </div>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'amber' | 'blue' | 'green' | 'red' | 'brand' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className={`text-xl font-bold ${tone === 'green' ? 'text-emerald-600' : tone === 'red' ? 'text-red-500' : tone === 'amber' ? 'text-amber-500' : tone === 'blue' ? 'text-blue-500' : 'text-slate-800 dark:text-white'}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{label}</p>
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
    <Modal open onClose={onClose} title={t('settleCalculate')} size="sm"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={submit} loading={saving}>{t('calculate')}</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label={t('settlePeriod')} type="month" required value={period} onChange={(e) => setPeriod(e.target.value)} />
        <Select label={t('groupTeacher')} required value={teacherId} onChange={(e) => setTeacherId(e.target.value)} options={teachers.map((x) => ({ value: x.id, label: x.name }))} placeholder={t('selectBranch')} />
      </form>
    </Modal>
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
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>;

  return (
    <Card bodyClassName="p-0">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-700">
        <p className="text-sm text-slate-500">{t('financeExpenses')}</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          {t('addExpense')}
        </Button>
      </div>
      {expenses && expenses.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-start text-xs text-slate-500 dark:border-slate-700">
                <th className="px-5 py-2.5 text-start font-medium">{t('expenseTitle')}</th>
                <th className="px-5 py-2.5 text-start font-medium">{t('expenseCategory')}</th>
                <th className="px-5 py-2.5 text-start font-medium">{t('expenseDate')}</th>
                <th className="px-5 py-2.5 text-start font-medium">{t('expenseAmount')}</th>
                <th className="px-5 py-2.5 text-end font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{e.title}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{e.category || '—'}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{fmtDate(e.date)}</td>
                  <td className="px-5 py-3 font-semibold text-red-600">{money(e.amount)}</td>
                  <td className="px-5 py-3 text-end">
                    <Button variant="ghost" size="sm" onClick={() => remove(e.id)} aria-label={t('delete')}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={TrendingDown} title={t('noExpenses')} />
      )}

      {showAdd && <AddExpenseModal t={t} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); reload(); }} />}
    </Card>
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
    <Modal open onClose={onClose} title={t('addExpense')} size="sm"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={submit} loading={saving}>{t('save')}</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label={t('expenseTitle')} required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <Select label={t('expenseCategory')} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} options={EXPENSE_CATEGORIES} placeholder={t('selectBranch')} />
        <Input label={t('expenseAmount')} type="number" required min="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
        <Input label={t('expenseDate')} type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        <Textarea label={t('expenseNote')} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
      </form>
    </Modal>
  );
}

export default CenterFinancePage;
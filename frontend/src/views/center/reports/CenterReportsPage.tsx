'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Download,
  GraduationCap,
  Printer,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Alert } from '../../../components/ui/ErrorAlert';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterPill, type CenterPillTone } from '../ui/CenterPill';
import { useApi } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey } from '../../../i18n';
import { useCenterBranch } from '../dashboard/CenterBranchContext';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type TabKey = 'operations' | 'financial' | 'people' | 'service';

interface ReportsData {
  period: string;
  compare: string;
  branchId: string | null;
  stats: {
    occupancyRate: number;
    netIncome: number;
    collected: number;
    openComplaints: number;
    highCriticalComplaints: number;
  };
  operations: {
    monthly: { key: string; rate: number }[];
    bookings: { key: string; count: number; pct: number }[];
  };
  financial: {
    monthly: { key: string; net: number }[];
    composition: { key: string; value: number }[];
  };
  people: {
    teachers: { id: string; name: string; subject: string; groups: number; bookings: number }[];
    students: { id: string; name: string; code: string; groups: number; status: string }[];
  };
  complaints: {
    bySeverity: { key: string; count: number }[];
    sla: { id: string; subject: string; severity: string; elapsedMinutes: number; targetMinutes: number; within: boolean }[];
  };
}

/* ------------------------------------------------------------------ */
/* Options & helpers                                                   */
/* ------------------------------------------------------------------ */

const PERIODS: { value: string; labelKey: DictKey }[] = [
  { value: 'today', labelKey: 'reportsPeriodToday' },
  { value: 'week', labelKey: 'reportsPeriodThisWeek' },
  { value: 'month', labelKey: 'reportsPeriodThisMonth' },
  { value: 'quarter', labelKey: 'reportsPeriodLast3Months' },
  { value: 'year', labelKey: 'reportsPeriodThisYear' },
];

const COMPARES: { value: string; labelKey: DictKey }[] = [
  { value: 'lastMonth', labelKey: 'reportsCompareLastMonth' },
  { value: 'sameMonthLastYear', labelKey: 'reportsCompareSameMonthLastYear' },
  { value: 'target', labelKey: 'reportsCompareTarget' },
];

const TABS: { value: TabKey; labelKey: DictKey }[] = [
  { value: 'operations', labelKey: 'reportsTabOperations' },
  { value: 'financial', labelKey: 'reportsTabFinancial' },
  { value: 'people', labelKey: 'reportsTabPeople' },
  { value: 'service', labelKey: 'reportsTabService' },
];

const MONTHS_LOCAL = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
const MONTHS_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const SEVERITY_TONE: Record<string, CenterPillTone> = {
  CRITICAL: 'red',
  HIGH: 'amber',
  MEDIUM: 'blue',
  LOW: 'slate',
};

const SEVERITY_LABEL_KEY: Record<string, DictKey> = {
  CRITICAL: 'reportsComplaintsCritical',
  HIGH: 'reportsComplaintsHigh',
  MEDIUM: 'reportsComplaintsMedium',
  LOW: 'reportsComplaintsLow',
};

function monthName(lang: string, key: string): string {
  const monthIndex = Number(key.split('-')[1]) - 1;
  const names = lang === 'ar' ? MONTHS_LOCAL : MONTHS_EN;
  return names[monthIndex] ?? key;
}

/* ------------------------------------------------------------------ */
/* Bar chart (pure CSS, mirrors the reference chart)                   */
/* ------------------------------------------------------------------ */

function ReportBarChart({
  ariaLabel,
  items,
}: {
  ariaLabel: string;
  items: { key: string; label: string; valueLabel: string; ratio: number }[];
}) {
  return (
    <div
      className="grid grid-cols-3 items-end gap-3 sm:grid-cols-6"
      role="img"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <div key={item.key} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
          <strong className="truncate text-xs font-bold text-[color:var(--mj-ink-strong)]">
            {item.valueLabel}
          </strong>
          <div className="flex h-32 w-full items-end overflow-hidden rounded-lg bg-[color:var(--mj-wash)] p-1">
            <div
              className="w-full rounded-md bg-[color:var(--mj-accent)] transition-all"
              style={{ height: `${Math.max(item.ratio > 0 ? 4 : 2, Math.min(100, item.ratio))}%` }}
            />
          </div>
          <span className="truncate text-[0.75rem] font-medium text-[color:var(--mj-muted-2)]">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function CenterReportsPage() {
  const { t, lang } = useT();
  const toast = useToast();
  const { branches, branchId: contextBranchId, setBranches } = useCenterBranch();

  const [activeTab, setActiveTab] = useState<TabKey>('operations');
  const [period, setPeriod] = useState('month');
  const [compare, setCompare] = useState('lastMonth');
  const [branchFilter, setBranchFilter] = useState<string>(contextBranchId || '');

  useEffect(() => {
    if (branches.length > 0) return;
    api
      .get<{ id: string; name: string }[]>('/center/account/branches')
      .then((res) => setBranches(res.data || []))
      .catch(() => {});
  }, [branches.length, setBranches]);

  useEffect(() => {
    setBranchFilter((current) => {
      if (current && contextBranchId && branches.length > 0 && !branches.some((b) => b.id === current)) {
        return contextBranchId;
      }
      return current || contextBranchId || '';
    });
  }, [branches, contextBranchId]);

  const { data, loading, error } = useApi<ReportsData>(
    () =>
      api.get<ReportsData>('/center/account/reports', {
        period,
        compare,
        ...(branchFilter ? { branchId: branchFilter } : {}),
      }),
    [period, compare, branchFilter],
  );

  const periodLabel = t(PERIODS.find((p) => p.value === period)?.labelKey ?? 'reportsPeriodThisMonth');
  const compareLabel = t(COMPARES.find((c) => c.value === compare)?.labelKey ?? 'reportsCompareLastMonth');
  const branchLabel = branches.find((b) => b.id === branchFilter)?.name || t('reportsAllBranches');

  const money = (value: number) =>
    `${value.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} ${lang === 'ar' ? 'ج.م' : 'EGP'}`;
  const percent = (value: number) => `${value.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}%`;
  const number = (value: number) => value.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');

  function plural(
    n: number,
    single: DictKey,
    pluralKey: DictKey,
    dual: DictKey,
  ): { key: DictKey; count: string } {
    if (lang === 'ar') {
      if (n === 1) return { key: single, count: String(n) };
      if (n === 2) return { key: dual, count: '' };
      if (n >= 3 && n <= 10) return { key: pluralKey, count: String(n) };
      return { key: single, count: String(n) };
    }
    return n === 1
      ? { key: single, count: String(n) }
      : { key: pluralKey, count: String(n) };
  }

  function waitLabel(elapsedMinutes: number): string {
    if (elapsedMinutes < 1) return t('reportsSlaWaitNow');
    const minute = plural(elapsedMinutes, 'reportsSlaWaitMinute', 'reportsSlaWaitMinutes', 'reportsSlaWaitMinute2');
    if (elapsedMinutes < 60) return t(minute.key, { count: minute.count });
    const hours = Math.floor(elapsedMinutes / 60);
    if (hours < 24) {
      const hour = plural(hours, 'reportsSlaWaitHour', 'reportsSlaWaitHours', 'reportsSlaWaitHour2');
      return t(hour.key, { count: hour.count });
    }
    const days = Math.floor(hours / 24);
    const day = plural(days, 'reportsSlaWaitDay', 'reportsSlaWaitDays', 'reportsSlaWaitDay2');
    return t(day.key, { count: day.count });
  }

  function targetLabel(targetMinutes: number): string {
    if (targetMinutes <= 0) return t('reportsSlaTargetCritical');
    const hours = targetMinutes / 60;
    const target = plural(hours, 'reportsSlaTargetHour', 'reportsSlaTargetHours', 'reportsSlaTargetHour2');
    return t(target.key, { count: target.count });
  }

  const occupancyChart = useMemo(() => {
    if (!data) return [];
    return data.operations.monthly.map((m) => ({
      key: m.key,
      label: monthName(lang, m.key),
      valueLabel: percent(m.rate),
      ratio: Math.max(0, m.rate),
    }));
  }, [data, lang]);

  const incomeChart = useMemo(() => {
    if (!data) return [];
    const max = Math.max(1, ...data.financial.monthly.map((m) => Math.abs(m.net)));
    return data.financial.monthly.map((m) => ({
      key: m.key,
      label: monthName(lang, m.key),
      valueLabel: money(m.net),
      ratio: max > 0 ? (Math.abs(m.net) / max) * 100 : 0,
    }));
  }, [data, lang]);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [];
    const push = (line: string[]) => rows.push(line.map((cell) => `"${cell.replace(/"/g, '""')}"`));

    if (activeTab === 'operations') {
      push([t('reportsBookingStatus'), t('reportsBookingCount'), t('reportsBookingPct')]);
      data.operations.bookings.forEach((b) => {
        const labelKey =
          b.key === 'completed' ? 'reportsBookingFinished'
          : b.key === 'ongoing' ? 'reportsBookingOngoing'
          : b.key === 'upcoming' ? 'reportsBookingUpcoming'
          : 'reportsBookingPending';
        push([t(labelKey as DictKey), String(b.count), `${b.pct}%`]);
      });
      rows.push([]);
      push([t('reportsOpsTrendTitle'), t('reportsBookingPct')]);
      data.operations.monthly.forEach((m) => push([monthName(lang, m.key), `${m.rate}%`]));
    }

    if (activeTab === 'financial') {
      push([t('reportsFinCompositionTitle'), '']);
      push([t('reportsFinCollected'), String(data.financial.composition.find((c) => c.key === 'collected')?.value ?? 0)]);
      push([t('reportsFinCenterShare'), String(data.financial.composition.find((c) => c.key === 'centerShare')?.value ?? 0)]);
      push([t('reportsFinDirect'), String(data.financial.composition.find((c) => c.key === 'direct')?.value ?? 0)]);
      push([t('reportsFinExpenses'), String(data.financial.composition.find((c) => c.key === 'expenses')?.value ?? 0)]);
      push([t('reportsFinNet'), String(data.financial.composition.find((c) => c.key === 'net')?.value ?? 0)]);
      rows.push([]);
      push([t('reportsFinTrendTitle'), '']);
      data.financial.monthly.forEach((m) => push([monthName(lang, m.key), String(m.net)]));
    }

    if (activeTab === 'people') {
      push([t('reportsPeopleTeachersTitle')]);
      push([t('code'), t('reportsSlaComplaint'), t('reportsTeacherGroups'), t('reportsTeacherBookings')]);
      data.people.teachers.forEach((te) =>
        push([te.name, te.subject, String(te.groups), String(te.bookings)]),
      );
      rows.push([]);
      push([t('reportsPeopleStudentsTitle')]);
      push([t('code'), t('reportsSlaComplaint'), t('reportsStudentGroups'), t('reportsSlaStatus')]);
      data.people.students.forEach((s) =>
        push([s.name, s.code, String(s.groups), s.status === 'ACTIVE' ? t('reportsStudentActive') : t('reportsStudentFrozen')]),
      );
    }

    if (activeTab === 'service') {
      push([t('reportsComplaintsSeverityTitle')]);
      push([t('reportsSlaComplaint'), t('reportsBookingCount')]);
      data.complaints.bySeverity.forEach((c) =>
        push([t(SEVERITY_LABEL_KEY[c.key] ?? 'reportsComplaintsMedium'), String(c.count)]),
      );
      rows.push([]);
      push([t('reportsSlaComplaint'), t('reportsSlaWait'), t('reportsSlaTarget'), t('reportsSlaStatus')]);
      data.complaints.sla.forEach((s) =>
        push([s.subject, waitLabel(s.elapsedMinutes), targetLabel(s.targetMinutes), s.within ? t('reportsSlaWithin') : t('reportsSlaLate')]),
      );
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const csv = '\uFEFF' + rows.map((line) => line.join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-${activeTab}-${period}-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(t('reportsExportToast'));
  };

  if (!data) {
    return (
      <div className="space-y-6">
        <CenterPageHeader
          eyebrow={t('portalSubtitle')}
          title={t('reports')}
          description={t('reportsPageSub')}
        />
        {error ? <Alert message={error} /> : <PencilLoader label={t('loadingDashboard')} />}
      </div>
    );
  }

  const statCards = [
    {
      key: 'occupancy',
      label: t('reportsStatOccupancy'),
      value: `${data.stats.occupancyRate}%`,
      sub: t('reportsStatOccupancySub'),
      Icon: TrendingUp,
    },
    {
      key: 'income',
      label: t('reportsStatIncome'),
      value: money(data.stats.netIncome),
      sub: t('reportsStatIncomeSub', { period: periodLabel }),
      Icon: Wallet,
    },
    {
      key: 'collected',
      label: t('reportsStatCollected'),
      value: money(data.stats.collected),
      sub: t('reportsStatCollectedSub'),
      Icon: Users,
    },
    {
      key: 'complaints',
      label: t('reportsStatComplaints'),
      value: String(data.stats.openComplaints),
      sub: t('reportsStatComplaintsSub', { count: String(data.stats.highCriticalComplaints) }),
      Icon: AlertTriangle,
    },
  ];

  const bookingsLabelKey: Record<string, DictKey> = {
    completed: 'reportsBookingFinished',
    ongoing: 'reportsBookingOngoing',
    upcoming: 'reportsBookingUpcoming',
    pending: 'reportsBookingPending',
  };

  const compositionLabelKey: Record<string, DictKey> = {
    collected: 'reportsFinCollected',
    centerShare: 'reportsFinCenterShare',
    direct: 'reportsFinDirect',
    expenses: 'reportsFinExpenses',
    net: 'reportsFinNet',
  };

  return (
    <div className="space-y-5" aria-busy={loading}>
      <CenterPageHeader
        eyebrow={t('portalSubtitle')}
        title={t('reports')}
        description={t('reportsPageSub')}
      >
        <button type="button" className="mj-btn mj-btn--ghost" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> {t('reportsPrint')}
        </button>
        <button type="button" className="mj-btn mj-btn--ghost" onClick={exportCsv} disabled={!data}>
          <Download className="h-4 w-4" /> {t('exportCsv')}
        </button>
      </CenterPageHeader>

      {error && <Alert message={error} />}

      {/* Filter bar */}
      <section className="mj-card p-4" aria-label={t('reports')}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="mj-field">
            <label className="mj-label">{t('reportsPeriod')}</label>
            <select className="mj-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('reportsBranch')}</label>
            <select
              className="mj-select"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">{t('reportsAllBranches')}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('reportsCompare')}</label>
            <select className="mj-select" value={compare} onChange={(e) => setCompare(e.target.value)}>
              {COMPARES.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 border-t border-[color:var(--mj-border-soft)] pt-3 text-sm text-[color:var(--mj-muted)]">
          <strong className="font-bold text-[color:var(--mj-ink-strong)]">{periodLabel}</strong>
          {' · '}
          {t('reportsContextBranch', { branch: branchLabel, compare: compareLabel })}
        </div>
      </section>

      {/* Stat cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={t('reports')}>
        {statCards.map((card) => {
          const Icon = card.Icon;
          return (
            <div key={card.key} className="mj-card mj-stat">
              <div className="mj-stat-label">{card.label}</div>
              <div className="mj-stat-value">{card.value}</div>
              <div className="mj-stat-sub">{card.sub}</div>
              <div className="mt-2 flex items-center gap-2 border-t border-[color:var(--mj-border-soft)] pt-2 text-xs font-semibold text-[color:var(--mj-muted-2)]">
                <Icon className="h-3.5 w-3.5" aria-hidden /> {card.label}
              </div>
            </div>
          );
        })}
      </section>

      {/* Tabs */}
      <nav className="mj-tabs" aria-label={t('reports')} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`mj-tab ${activeTab === tab.value ? 'mj-tab--active' : ''}`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </nav>

      {activeTab === 'operations' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className="mj-card p-5">
            <h2 className="text-[1.05rem] font-bold text-[color:var(--mj-ink-strong)]">
              {t('reportsOpsTrendTitle')}
            </h2>
            <p className="mt-0.5 mb-4 text-[0.8125rem] text-[color:var(--mj-muted)]">{t('reportsOpsTrendSub')}</p>
            {occupancyChart.length > 0 ? (
              <ReportBarChart
                ariaLabel={`${t('reportsOpsTrendTitle')}: ${data.operations.monthly.map((m) => `${monthName(lang, m.key)} ${m.rate}%`).join('، ')}`}
                items={occupancyChart}
              />
            ) : (
              <div className="mj-empty"><TrendingUp className="mj-empty-icon" /><p className="text-sm">{t('reportsEmpty')}</p></div>
            )}
          </article>

          <article className="mj-card overflow-hidden">
            <div className="border-b border-[color:var(--mj-border-soft)] px-5 py-4">
              <h2 className="text-[1.05rem] font-bold text-[color:var(--mj-ink-strong)]">
                {t('reportsOpsBookingsTitle')}
              </h2>
              <p className="mt-0.5 text-[0.8125rem] text-[color:var(--mj-muted)]">{t('reportsOpsBookingsSub')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="mj-table">
                <thead>
                  <tr>
                    <th>{t('reportsBookingStatus')}</th>
                    <th>{t('reportsBookingCount')}</th>
                    <th>{t('reportsBookingPct')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.operations.bookings.map((b) => (
                    <tr key={b.key}>
                      <td className="font-medium text-[color:var(--mj-ink-strong)]">{t(bookingsLabelKey[b.key])}</td>
                      <td>{b.count}</td>
                      <td><span className="font-semibold">{b.pct}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}

      {activeTab === 'financial' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className="mj-card p-5">
            <h2 className="text-[1.05rem] font-bold text-[color:var(--mj-ink-strong)]">
              {t('reportsFinTrendTitle')}
            </h2>
            <p className="mt-0.5 mb-4 text-[0.8125rem] text-[color:var(--mj-muted)]">{t('reportsFinTrendSub')}</p>
            {incomeChart.length > 0 ? (
              <ReportBarChart
                ariaLabel={`${t('reportsFinTrendTitle')}: ${data.financial.monthly.map((m) => `${monthName(lang, m.key)} ${m.net}`).join('، ')}`}
                items={incomeChart}
              />
            ) : (
              <div className="mj-empty"><Wallet className="mj-empty-icon" /><p className="text-sm">{t('reportsEmpty')}</p></div>
            )}
          </article>

          <article className="mj-card overflow-hidden">
            <div className="border-b border-[color:var(--mj-border-soft)] px-5 py-4">
              <h2 className="text-[1.05rem] font-bold text-[color:var(--mj-ink-strong)]">
                {t('reportsFinCompositionTitle')}
              </h2>
              <p className="mt-0.5 text-[0.8125rem] text-[color:var(--mj-muted)]">{t('reportsFinCompositionSub')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="mj-table">
                <thead>
                  <tr>
                    <th>{t('reportsSlaComplaint')}</th>
                    <th className="text-end">{t('reportsFinNet')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.financial.composition.map((row) => (
                    <tr key={row.key}>
                      <td className="font-medium text-[color:var(--mj-ink-strong)]">
                        {t(compositionLabelKey[row.key])}
                      </td>
                      <td className="text-end font-semibold">{money(row.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}

      {activeTab === 'people' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className="mj-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[1.05rem] font-bold text-[color:var(--mj-ink-strong)]">
                  {t('reportsPeopleTeachersTitle')}
                </h2>
                <p className="mt-0.5 text-[0.8125rem] text-[color:var(--mj-muted)]">{t('reportsPeopleTeachersSub')}</p>
              </div>
              <span className="text-2xl font-bold text-[color:var(--mj-accent)]">{number(data.people.teachers.length)}</span>
            </div>
            {data.people.teachers.length > 0 ? (
              <div className="space-y-2.5">
                {data.people.teachers.map((teacher) => (
                  <div key={teacher.id} className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--mj-border-soft)] p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--mj-accent-soft)] text-[color:var(--mj-accent)]">
                        <GraduationCap className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[color:var(--mj-ink-strong)]">
                          {lang === 'ar' ? `أ. ${teacher.name}` : teacher.name}
                        </p>
                        <p className="truncate text-xs text-[color:var(--mj-muted-2)]">
                          {teacher.subject} · {t('reportsTeacherGroups', { count: number(teacher.groups) })}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-[color:var(--mj-wash)] px-3 py-1.5 text-xs font-bold text-[color:var(--mj-ink-strong)]">
                      {t('reportsTeacherBookings', { count: number(teacher.bookings) })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mj-empty"><GraduationCap className="mj-empty-icon" /><p className="text-sm">{t('reportsEmpty')}</p></div>
            )}
          </article>

          <article className="mj-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[1.05rem] font-bold text-[color:var(--mj-ink-strong)]">
                  {t('reportsPeopleStudentsTitle')}
                </h2>
                <p className="mt-0.5 text-[0.8125rem] text-[color:var(--mj-muted)]">{t('reportsPeopleStudentsSub')}</p>
              </div>
              <span className="text-2xl font-bold text-[color:var(--mj-accent)]">{number(data.people.students.length)}</span>
            </div>
            {data.people.students.length > 0 ? (
              <div className="space-y-2.5">
                {data.people.students.map((student) => (
                  <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--mj-border-soft)] p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--mj-link-soft)] text-[color:var(--mj-link)]">
                        <Users className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[color:var(--mj-ink-strong)]">{student.name}</p>
                        <p className="truncate text-xs text-[color:var(--mj-muted-2)]">
                          {student.code ? `${student.code} · ` : ''}
                          {t('reportsStudentGroups', { count: number(student.groups) })}
                        </p>
                      </div>
                    </div>
                    <CenterPill tone={student.status === 'ACTIVE' ? 'green' : 'slate'} dot>
                      {student.status === 'ACTIVE' ? t('reportsStudentActive') : t('reportsStudentFrozen')}
                    </CenterPill>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mj-empty"><Users className="mj-empty-icon" /><p className="text-sm">{t('reportsEmpty')}</p></div>
            )}
          </article>
        </div>
      )}

      {activeTab === 'service' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className="mj-card p-5">
            <h2 className="text-[1.05rem] font-bold text-[color:var(--mj-ink-strong)]">
              {t('reportsComplaintsSeverityTitle')}
            </h2>
            <p className="mt-0.5 mb-4 text-[0.8125rem] text-[color:var(--mj-muted)]">{t('reportsComplaintsSeveritySub')}</p>
            <div className="grid grid-cols-2 gap-3">
              {data.complaints.bySeverity.map((row) => (
                <div key={row.key} className="rounded-xl border border-[color:var(--mj-border-soft)] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[color:var(--mj-muted)]">
                      {t(SEVERITY_LABEL_KEY[row.key])}
                    </span>
                    <CenterPill tone={SEVERITY_TONE[row.key] ?? 'slate'}>{number(row.count)}</CenterPill>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="mj-card overflow-hidden">
            <div className="border-b border-[color:var(--mj-border-soft)] px-5 py-4">
              <h2 className="text-[1.05rem] font-bold text-[color:var(--mj-ink-strong)]">
                {t('reportsSlaTitle')}
              </h2>
              <p className="mt-0.5 text-[0.8125rem] text-[color:var(--mj-muted)]">{t('reportsSlaSub')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="mj-table">
                <thead>
                  <tr>
                    <th>{t('reportsSlaComplaint')}</th>
                    <th>{t('reportsSlaWait')}</th>
                    <th>{t('reportsSlaTarget')}</th>
                    <th>{t('reportsSlaStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.complaints.sla.length > 0 ? (
                    data.complaints.sla.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full bg-current ${SEVERITY_TONE[row.severity] === 'red' ? 'text-[color:var(--mj-danger)]' : SEVERITY_TONE[row.severity] === 'amber' ? 'text-[color:var(--mj-amber)]' : 'text-[color:var(--mj-muted-2)]'}`} aria-hidden />
                            <span className="truncate font-medium text-[color:var(--mj-ink-strong)]">{row.subject}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap text-[color:var(--mj-muted)]">{waitLabel(row.elapsedMinutes)}</td>
                        <td className="whitespace-nowrap text-[color:var(--mj-muted)]">{targetLabel(row.targetMinutes)}</td>
                        <td>
                          <CenterPill tone={row.within ? 'green' : 'red'}>
                            {row.within ? t('reportsSlaWithin') : t('reportsSlaLate')}
                          </CenterPill>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>
                        <div className="mj-empty">
                          <Clock className="mj-empty-icon" />
                          <p className="text-sm">{t('reportsEmpty')}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
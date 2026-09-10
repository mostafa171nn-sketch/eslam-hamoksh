'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Save } from 'lucide-react';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterPill, type CenterPillTone } from '../ui/CenterPill';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey } from '../../../i18n';

type TabKey = 'pages' | 'alerts' | 'comparisons' | 'audit';

type PortalPageKey =
  | 'dashboard'
  | 'rooms'
  | 'teachers'
  | 'groups'
  | 'students'
  | 'employees'
  | 'finance'
  | 'transport'
  | 'communications'
  | 'broadcast'
  | 'reports'
  | 'profile'
  | 'settings';

interface PageDef {
  key: PortalPageKey;
  route: string;
  labelKey: DictKey;
  fixed: boolean;
}

const PAGE_DEFS: PageDef[] = [
  { key: 'dashboard', route: '/', labelKey: 'followUpNav', fixed: true },
  { key: 'rooms', route: '/rooms', labelKey: 'roomsNav', fixed: false },
  { key: 'teachers', route: '/teachers', labelKey: 'teachers', fixed: false },
  { key: 'groups', route: '/groups', labelKey: 'groups', fixed: false },
  { key: 'students', route: '/students', labelKey: 'students', fixed: false },
  { key: 'employees', route: '/employees', labelKey: 'employees', fixed: false },
  { key: 'finance', route: '/finance', labelKey: 'finance', fixed: false },
  { key: 'transport', route: '/transport', labelKey: 'transport', fixed: false },
  { key: 'communications', route: '/communications', labelKey: 'communications', fixed: false },
  { key: 'broadcast', route: '/broadcast', labelKey: 'broadcast', fixed: false },
  { key: 'reports', route: '/reports', labelKey: 'reports', fixed: false },
  { key: 'profile', route: '/profile', labelKey: 'centerPage', fixed: false },
  { key: 'settings', route: '/settings', labelKey: 'settings', fixed: true },
];

const DEFAULT_ORDER: PortalPageKey[] = PAGE_DEFS.map((p) => p.key);

type ComparisonMode = 'LAST_MONTH' | 'SAME_MONTH_LAST_YEAR' | 'TARGET';

interface EscalationValue {
  highAfter: '1h' | '2h' | '4h';
  normalAfter: '12h' | '24h' | '48h';
  complaintResolveAfter: '1d' | '2d' | '4d' | '7d';
}

interface EscalationOption {
  value: string;
  labelKey: DictKey;
}

const ESCALATION_OPTIONS: Record<keyof EscalationValue, EscalationOption[]> = {
  highAfter: [
    { value: '1h', labelKey: 'escalationHour1' },
    { value: '2h', labelKey: 'escalationHour2' },
    { value: '4h', labelKey: 'escalationHour4' },
  ],
  normalAfter: [
    { value: '12h', labelKey: 'escalationHour12' },
    { value: '24h', labelKey: 'escalationHour24' },
    { value: '48h', labelKey: 'escalationHour48' },
  ],
  complaintResolveAfter: [
    { value: '1d', labelKey: 'escalationDay1' },
    { value: '2d', labelKey: 'escalationDay2' },
    { value: '4d', labelKey: 'escalationDay4' },
    { value: '7d', labelKey: 'escalationDay7' },
  ],
};

const COMPARISON_MODES: { value: ComparisonMode; labelKey: DictKey; descKey: DictKey }[] = [
  { value: 'LAST_MONTH', labelKey: 'compareLastMonth', descKey: 'compareLastMonthDesc' },
  { value: 'SAME_MONTH_LAST_YEAR', labelKey: 'compareSameMonthLastYear', descKey: 'compareSameMonthLastYearDesc' },
  { value: 'TARGET', labelKey: 'compareTarget', descKey: 'compareTargetDesc' },
];

const CATEGORY_KEYS: Record<string, DictKey> = {
  SECURITY: 'categorySecurity',
  FINANCE: 'categoryFinance',
  OPERATIONS: 'categoryOperations',
  SETTINGS: 'categorySettings',
  COMMUNICATION: 'categoryCommunication',
};

const CATEGORY_TONES: Record<string, CenterPillTone> = {
  SECURITY: 'red',
  FINANCE: 'green',
  OPERATIONS: 'blue',
  SETTINGS: 'amber',
  COMMUNICATION: 'slate',
};

const RESULT_META: Record<string, { labelKey: DictKey; tone: CenterPillTone }> = {
  SUCCESS: { labelKey: 'resultSuccess', tone: 'green' },
  DENIED: { labelKey: 'resultDenied', tone: 'red' },
  WARNING: { labelKey: 'resultWarning', tone: 'amber' },
};

const ROLE_KEYS: Record<string, DictKey> = {
  CENTER_ADMIN: 'auditRoleCenterAdmin',
  ADMIN: 'auditRoleAdmin',
  CENTER_EMPLOYEE: 'auditRoleEmployee',
  OPS_SUPERVISOR: 'auditRoleOpsSupervisor',
  RECEPTIONIST: 'auditRoleReceptionist',
  TEACHER_ASSISTANT: 'auditRoleEmployee',
  ACCOUNTANT: 'auditRoleAccountant',
  TEACHER: 'auditRoleTeacher',
  STUDENT: 'auditRoleStudent',
  PARENT: 'auditRoleParent',
};

const ACTION_KEYS: Partial<Record<string, DictKey>> = {
  settings_changed: 'actionSettingsChanged',
  access_denied: 'actionAccessDenied',
  created_expense: 'actionCreatedExpense',
  deleted_expense: 'actionDeletedExpense',
  created_room_booking: 'actionCreatedRoomBooking',
  updated_room_booking: 'actionUpdatedRoomBooking',
  cancelled_room_booking: 'actionCancelledRoomBooking',
  created_broadcast: 'actionCreatedBroadcast',
  duplicated_broadcast: 'actionDuplicatedBroadcast',
  sent_broadcast: 'actionSentBroadcast',
  cancelled_broadcast: 'actionCancelledBroadcast',
  created_complaint: 'actionCreatedComplaint',
  updated_complaint: 'actionUpdatedComplaint',
  created_group: 'actionCreatedGroup',
  updated_group: 'actionUpdatedGroup',
  deactivated_group: 'actionDeactivatedGroup',
  created_transport_route: 'actionCreatedTransportRoute',
  updated_transport_route: 'actionUpdatedTransportRoute',
  deactivated_transport_route: 'actionDeactivatedTransportRoute',
  created_task: 'actionCreatedTask',
  updated_task: 'actionUpdatedTask',
  deleted_task: 'actionDeletedTask',
  changed_role_permissions: 'actionChangedRolePermissions',
  updated_employee: 'actionUpdatedEmployee',
  suspended_employee: 'actionSuspendedEmployee',
  activated_employee: 'actionActivatedEmployee',
};

interface AuditRow {
  id: string;
  time: string;
  action: string;
  category: string;
  target: string;
  entityId?: string | null;
  details: string;
  actorName: string;
  actorRole: string;
  result: string;
}

interface AuditListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const NAV_RECONFIGURED_EVENT = 'maarej:nav-config-changed';

function niceAction(action: string): string {
  return action
    .split('_')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function switchOrder(list: PortalPageKey[], index: number, delta: -1 | 1): PortalPageKey[] {
  const next = [...list];
  const target = index + delta;
  if (target < 0 || target >= next.length) return list;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function CenterSettingsPage() {
  const { t, lang } = useT();
  const toast = useToast();

  const [tab, setTab] = useState<TabKey>('pages');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const [navOrder, setNavOrder] = useState<PortalPageKey[]>(DEFAULT_ORDER);
  const [hiddenPages, setHiddenPages] = useState<PortalPageKey[]>([]);
  const [escalation, setEscalation] = useState<EscalationValue>({
    highAfter: '2h',
    normalAfter: '24h',
    complaintResolveAfter: '4d',
  });
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('LAST_MONTH');
  const [auditRecentCount, setAuditRecentCount] = useState(0);

  const [pagesDirty, setPagesDirty] = useState(false);
  const [alertsDirty, setAlertsDirty] = useState(false);
  const [comparisonDirty, setComparisonDirty] = useState(false);

  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditMeta, setAuditMeta] = useState<AuditListMeta | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(false);
  const [auditQ, setAuditQ] = useState('');
  const [auditCategory, setAuditCategory] = useState('ALL');
  const [auditResult, setAuditResult] = useState('ALL');
  const [auditPage, setAuditPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSettings = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    api
      .get<any>('/center/account/settings')
      .then((res) => {
        if (!res.data) return;
        if (Array.isArray(res.data.navOrder)) setNavOrder(res.data.navOrder);
        if (Array.isArray(res.data.hiddenPages)) setHiddenPages(res.data.hiddenPages);
        setEscalation((prev) => ({
          ...prev,
          ...(res.data.escalation && typeof res.data.escalation === 'object' ? res.data.escalation : {}),
        }));
        if (res.data.comparisonMode) setComparisonMode(res.data.comparisonMode);
        if (typeof res.data.auditRecentCount === 'number') setAuditRecentCount(res.data.auditRecentCount);
        setPagesDirty(false);
        setAlertsDirty(false);
        setComparisonDirty(false);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const loadAudit = useCallback(
    (q: string, category: string, result: string, page: number) => {
      setAuditLoading(true);
      setAuditError(false);
      api
        .get<AuditRow[]>('/center/account/settings/audit-log', {
          q: q || undefined,
          category,
          result,
          page,
          limit: 15,
        })
        .then((res) => {
          setAuditRows(res.data);
          setAuditMeta(res.meta ?? null);
        })
        .catch(() => setAuditError(true))
        .finally(() => setAuditLoading(false));
    },
    [],
  );

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setAuditPage(1);
      loadAudit(auditQ, auditCategory, auditResult, 1);
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [auditQ, auditCategory, auditResult, loadAudit]);

  const runSave = async (body: Record<string, unknown>, then: () => void) => {
    setSaving(true);
    try {
      const res = await api.put<any>('/center/account/settings', body);
      if (typeof res.data?.auditRecentCount === 'number') setAuditRecentCount(res.data.auditRecentCount);
      then();
      toast.success(t('settingsSaved'));
    } catch {
      toast.error(t('saveSettingsFailed'));
    } finally {
      setSaving(false);
    }
  };

  const savePages = () => {
    runSave({ navOrder, hiddenPages }, () => {
      setPagesDirty(false);
      window.dispatchEvent(new CustomEvent(NAV_RECONFIGURED_EVENT));
    });
  };

  const saveAlerts = () => {
    runSave({ escalation }, () => setAlertsDirty(false));
  };

  const saveComparison = () => {
    runSave({ comparisonMode }, () => setComparisonDirty(false));
  };

  const exportAudit = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (auditQ) params.set('q', auditQ);
      if (auditCategory !== 'ALL') params.set('category', auditCategory);
      if (auditResult !== 'ALL') params.set('result', auditResult);
      const res = await fetch(`/api/center/account/settings/audit-log/export?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-log.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t('auditExportSuccess'));
    } catch {
      toast.error(t('auditLoadError'));
    } finally {
      setExporting(false);
    }
  };

  const visiblePages = navOrder
    .filter((key) => !hiddenPages.includes(key))
    .map((key) => PAGE_DEFS.find((p) => p.key === key))
    .filter((def): def is PageDef => Boolean(def));

  const toggleHidden = (key: PortalPageKey) => {
    setHiddenPages((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      setPagesDirty(true);
      return next;
    });
  };

  const movePage = (index: number, delta: -1 | 1) => {
    setNavOrder((prev) => {
      const next = switchOrder(prev, index, delta);
      if (next !== prev) setPagesDirty(true);
      return next;
    });
  };

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: 'pages', label: t('settingsTabPages') },
    { key: 'alerts', label: t('settingsTabAlerts') },
    { key: 'comparisons', label: t('settingsTabComparisons') },
    { key: 'audit', label: t('settingsTabAudit'), badge: auditRecentCount },
  ];

  const auditActionLabel = (action: string): string => {
    const key = ACTION_KEYS[action];
    return key ? t(key) : niceAction(action);
  };

  const auditTime = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfISO = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayDiff = Math.round((startToday.getTime() - startOfISO.getTime()) / 86_400_000);
    const minutesDiff = Math.round((now.getTime() - d.getTime()) / 60_000);
    const time = d.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    if (dayDiff === 0) return minutesDiff < 1 ? t('auditNow') : t('auditTodayAt', { time });
    if (dayDiff === 1) return t('auditYesterdayAt', { time });
    return (
      d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' }) +
      ` · ${time}`
    );
  };

  const roleLabel = (role: string): string => {
    const key = ROLE_KEYS[role];
    return key ? t(key) : role || '—';
  };

  return (
    <div className="space-y-6">
      <CenterPageHeader
        eyebrow={t('centerDashboard')}
        title={t('settings')}
        description={t('settingsPageDesc')}
      />

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label={t('settingsSectionNav')}>
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? 'border-[color:var(--mj-accent)] bg-[color:var(--mj-accent-soft)] text-[color:var(--mj-accent)]'
                  : 'border-[color:var(--mj-border)] bg-[color:var(--mj-surface)] text-[color:var(--mj-muted)] hover:text-[color:var(--mj-ink-strong)]'
              }`}
            >
              {item.label}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="rounded-full bg-[color:var(--mj-accent)] px-1.5 py-0.5 text-[0.6875rem] font-bold leading-none text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {loading ? (
        <div className="p-8">
          <PencilLoader label={t('loading')} />
        </div>
      ) : loadError ? (
        <div className="mj-card p-8 text-center">
          <p className="mb-4 font-semibold text-[color:var(--mj-ink-strong)]">{t('settingsLoadError')}</p>
          <button type="button" className="mj-btn mj-btn--primary" onClick={loadSettings}>
            {t('retry')}
          </button>
        </div>
      ) : (
        <>
          {tab === 'pages' && (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="mj-card p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="mj-title">{t('settingsPagesTitle')}</h2>
                    <p className="mt-1 text-sm text-[color:var(--mj-muted)]">{t('settingsPagesDesc')}</p>
                  </div>
                  <button
                    type="button"
                    className="mj-btn mj-btn--primary mj-btn--sm"
                    disabled={!pagesDirty || saving}
                    onClick={savePages}
                  >
                    <Save className="h-4 w-4" />
                    {t('save')}
                  </button>
                </div>

                <div className="divide-y divide-[color:var(--mj-border-soft)]">
                  {visiblePages.map((def, index) => {
                    const isFirst = index === 0;
                    const isLast = index === visiblePages.length - 1;
                    const hidden = hiddenPages.includes(def.key);
                    return (
                      <article
                        key={def.key}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[color:var(--mj-ink-strong)]">{t(def.labelKey)}</p>
                          <p className="truncate text-xs text-[color:var(--mj-muted)]">
                            {def.route}
                            {def.fixed && <span className="ms-1.5">· {t('pageFixedHint')}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="mj-btn mj-btn--ghost mj-btn--sm !px-2"
                            disabled={isFirst}
                            aria-label={t('moveUpPage', { page: t(def.labelKey) })}
                            title={t('moveUpPage', { page: t(def.labelKey) })}
                            onClick={() => movePage(index, -1)}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="mj-btn mj-btn--ghost mj-btn--sm !px-2"
                            disabled={isLast}
                            aria-label={t('moveDownPage', { page: t(def.labelKey) })}
                            title={t('moveDownPage', { page: t(def.labelKey) })}
                            onClick={() => movePage(index, 1)}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[color:var(--mj-border)] px-3 py-2">
                            <input
                              type="checkbox"
                              checked={!hidden}
                              disabled={def.fixed}
                              onChange={() => toggleHidden(def.key)}
                              className="h-4 w-4 accent-[color:var(--mj-accent)]"
                            />
                            <span className="text-sm font-medium text-[color:var(--mj-ink-strong)]">
                              {t('visiblePage')}
                            </span>
                          </label>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <aside className="mj-card p-5">
                <h2 className="mj-title">{t('whatsOutsideScopeTitle')}</h2>
                <p className="mt-1 text-sm text-[color:var(--mj-muted)]">{t('whatsOutsideScopeDesc')}</p>
                <div className="mt-4 space-y-2">
                  <Link
                    href="/center/employees"
                    className="flex items-center gap-2 rounded-lg border border-[color:var(--mj-border)] px-3 py-2 text-sm font-semibold text-[color:var(--mj-accent)] transition-colors hover:bg-[color:var(--mj-accent-soft)]"
                  >
                    {t('openEmployeesAndPermissions')}
                    <ChevronLeft className="ms-auto h-4 w-4 rtl:rotate-180" />
                  </Link>
                  <Link
                    href="/center/finance"
                    className="flex items-center gap-2 rounded-lg border border-[color:var(--mj-border)] px-3 py-2 text-sm font-semibold text-[color:var(--mj-accent)] transition-colors hover:bg-[color:var(--mj-accent-soft)]"
                  >
                    {t('openFinanceSettings')}
                    <ChevronLeft className="ms-auto h-4 w-4 rtl:rotate-180" />
                  </Link>
                </div>
              </aside>
            </div>
          )}

          {tab === 'alerts' && (
            <div className="mj-card p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="mj-title">{t('settingsAlertsTitle')}</h2>
                  <p className="mt-1 text-sm text-[color:var(--mj-muted)]">{t('settingsAlertsDesc')}</p>
                </div>
                <button
                  type="button"
                  className="mj-btn mj-btn--primary mj-btn--sm"
                  disabled={!alertsDirty || saving}
                  onClick={saveAlerts}
                >
                  <Save className="h-4 w-4" />
                  {t('save')}
                </button>
              </div>

              <div className="divide-y divide-[color:var(--mj-border-soft)]">
                <article className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold text-[color:var(--mj-ink-strong)]">{t('alertCritical')}</p>
                    <p className="mt-0.5 text-sm text-[color:var(--mj-muted)]">{t('alertCriticalDesc')}</p>
                  </div>
                  <CenterPill tone="red">{t('escalateImmediately')}</CenterPill>
                </article>

                {(
                  [
                    { key: 'highAfter' as const, titleKey: 'alertHigh' as const, descKey: 'alertHighDesc' as const },
                    { key: 'normalAfter' as const, titleKey: 'alertNormal' as const, descKey: 'alertNormalDesc' as const },
                    { key: 'complaintResolveAfter' as const, titleKey: 'alertComplaintResolve' as const, descKey: 'alertComplaintResolveDesc' as const },
                  ] as const
                ).map((item) => (
                  <article key={item.key} className="flex flex-wrap items-center justify-between gap-4 py-4">
                    <div>
                      <p className="font-semibold text-[color:var(--mj-ink-strong)]">{t(item.titleKey)}</p>
                      <p className="mt-0.5 text-sm text-[color:var(--mj-muted)]">{t(item.descKey)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[color:var(--mj-muted)]">{t('after')}</span>
                      <select
                        className="mj-select w-auto"
                        value={escalation[item.key]}
                        onChange={(e) => {
                          setEscalation((prev) => ({ ...prev, [item.key]: e.target.value }));
                          setAlertsDirty(true);
                        }}
                      >
                        {ESCALATION_OPTIONS[item.key].map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {t(opt.labelKey)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {tab === 'comparisons' && (
            <div className="mj-card p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="mj-title">{t('settingsComparisonsTitle')}</h2>
                  <p className="mt-1 text-sm text-[color:var(--mj-muted)]">{t('settingsComparisonsDesc')}</p>
                </div>
                <button
                  type="button"
                  className="mj-btn mj-btn--primary mj-btn--sm"
                  disabled={!comparisonDirty || saving}
                  onClick={saveComparison}
                >
                  <Save className="h-4 w-4" />
                  {t('save')}
                </button>
              </div>

              <div className="grid gap-3">
                {COMPARISON_MODES.map((mode) => {
                  const selected = comparisonMode === mode.value;
                  return (
                    <label
                      key={mode.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                        selected
                          ? 'border-[color:var(--mj-accent)] bg-[color:var(--mj-accent-soft)]'
                          : 'border-[color:var(--mj-border)] hover:border-[color:var(--mj-accent)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="defaultComparison"
                        checked={selected}
                        onChange={() => {
                          setComparisonMode(mode.value);
                          setComparisonDirty(true);
                        }}
                        className="mt-0.5 h-4 w-4 accent-[color:var(--mj-accent)]"
                      />
                      <span>
                        <span className="block font-semibold text-[color:var(--mj-ink-strong)]">
                          {t(mode.labelKey)}
                        </span>
                        <span className="mt-0.5 block text-sm text-[color:var(--mj-muted)]">
                          {t(mode.descKey)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'audit' && (
            <div className="mj-card p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="mj-title">{t('settingsTabAudit')}</h2>
                  <p className="mt-1 text-sm text-[color:var(--mj-muted)]">{t('settingsAuditDesc')}</p>
                </div>
                <button
                  type="button"
                  className="mj-btn mj-btn--ghost mj-btn--sm"
                  disabled={exporting || auditRows.length === 0}
                  onClick={exportAudit}
                >
                  <Download className="h-4 w-4" />
                  {exporting ? t('loading') : t('exportLog')}
                </button>
              </div>

              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="mj-field">
                  <label className="mj-label">{t('search')}</label>
                  <input
                    className="mj-input"
                    type="search"
                    placeholder={t('auditSearchPlaceholder')}
                    value={auditQ}
                    onChange={(e) => setAuditQ(e.target.value)}
                  />
                </div>
                <div className="mj-field">
                  <label className="mj-label" htmlFor="audit-category">
                    {t('auditCategoryLabel')}
                  </label>
                  <select
                    id="audit-category"
                    className="mj-select"
                    value={auditCategory}
                    onChange={(e) => setAuditCategory(e.target.value)}
                  >
                    <option value="ALL">{t('allCategories')}</option>
                    {Object.entries(CATEGORY_KEYS).map(([value, key]) => (
                      <option key={value} value={value}>
                        {t(key)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mj-field">
                  <label className="mj-label" htmlFor="audit-result">
                    {t('auditResultLabel')}
                  </label>
                  <select
                    id="audit-result"
                    className="mj-select"
                    value={auditResult}
                    onChange={(e) => setAuditResult(e.target.value)}
                  >
                    <option value="ALL">{t('allResults')}</option>
                    {Object.entries(RESULT_META).map(([value, meta]) => (
                      <option key={value} value={value}>
                        {t(meta.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {auditLoading ? (
                <div className="p-6">
                  <PencilLoader label={t('loading')} />
                </div>
              ) : auditError ? (
                <div className="p-6 text-center">
                  <p className="mb-3 font-semibold text-[color:var(--mj-ink-strong)]">{t('auditLoadError')}</p>
                  <button
                    type="button"
                    className="mj-btn mj-btn--primary mj-btn--sm"
                    onClick={() => loadAudit(auditQ, auditCategory, auditResult, auditPage)}
                  >
                    {t('retry')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-start">
                      <thead>
                        <tr className="border-b border-[color:var(--mj-border-soft)] text-start text-xs font-bold text-[color:var(--mj-muted)]">
                          <th className="py-2 pe-4 text-start">{t('auditTimeCol')}</th>
                          <th className="py-2 pe-4 text-start">{t('auditActionCol')}</th>
                          <th className="py-2 pe-4 text-start">{t('auditTargetCol')}</th>
                          <th className="py-2 pe-4 text-start">{t('auditActorCol')}</th>
                          <th className="py-2 text-start">{t('auditResultCol')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--mj-border-soft)]">
                        {auditRows.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-sm text-[color:var(--mj-muted)]">
                              {t('auditEmpty')}
                            </td>
                          </tr>
                        )}
                        {auditRows.map((row) => {
                          const resultMeta = RESULT_META[row.result] ?? { labelKey: 'resultSuccess', tone: 'slate' as CenterPillTone };
                          const catKey = CATEGORY_KEYS[row.category] ?? 'categoryOperations';
                          return (
                            <tr key={row.id} className="align-top">
                              <td className="whitespace-nowrap py-3 pe-4 text-sm text-[color:var(--mj-muted)]">
                                {auditTime(row.time)}
                              </td>
                              <td className="py-3 pe-4">
                                <p className="font-semibold text-[color:var(--mj-ink-strong)]">
                                  {auditActionLabel(row.action)}
                                </p>
                                <CenterPill tone={CATEGORY_TONES[row.category] ?? 'slate'}>
                                  {t(catKey)}
                                </CenterPill>
                              </td>
                              <td className="py-3 pe-4">
                                <p className="text-sm font-medium text-[color:var(--mj-ink-strong)]">
                                  {row.target}
                                  {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ''}
                                </p>
                                {row.details && (
                                  <p className="mt-0.5 text-sm text-[color:var(--mj-muted)]">{row.details}</p>
                                )}
                              </td>
                              <td className="py-3 pe-4">
                                <p className="text-sm font-medium text-[color:var(--mj-ink-strong)]">
                                  {row.actorName || '—'}
                                </p>
                                <p className="text-sm text-[color:var(--mj-muted)]">{roleLabel(row.actorRole)}</p>
                              </td>
                              <td className="py-3">
                                <CenterPill tone={resultMeta.tone}>{t(resultMeta.labelKey)}</CenterPill>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {auditMeta && auditMeta.totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-[color:var(--mj-muted)]">
                        {auditMeta.page} / {auditMeta.totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="mj-btn mj-btn--ghost mj-btn--sm"
                          disabled={auditMeta.page <= 1 || auditLoading}
                          onClick={() =>
                            setAuditPage((p) => {
                              const next = p - 1;
                              loadAudit(auditQ, auditCategory, auditResult, next);
                              return next;
                            })
                          }
                        >
                          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                          {t('back')}
                        </button>
                        <button
                          type="button"
                          className="mj-btn mj-btn--ghost mj-btn--sm"
                          disabled={auditMeta.page >= auditMeta.totalPages || auditLoading}
                          onClick={() =>
                            setAuditPage((p) => {
                              const next = p + 1;
                              loadAudit(auditQ, auditCategory, auditResult, next);
                              return next;
                            })
                          }
                        >
                          {t('next')}
                          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="mt-4 border-t border-[color:var(--mj-border-soft)] pt-4 text-sm text-[color:var(--mj-muted)]">
                    {t('auditImmutableNote')}
                  </p>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
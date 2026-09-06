'use client';

import { useRef, useState } from 'react';
import { MessagesSquare, Plus, UserRound, CheckCheck, Eye } from 'lucide-react';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill, type CenterPillTone } from '../ui/CenterPill';
import { CenterSearchInput } from '../ui/CenterSearchInput';
import { CenterModal } from '../ui/CenterModal';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey, type TranslateParams } from '../../../i18n';

const COMPLAINTS_API = '/center/account/communications/complaints';
const MESSAGES_API = '/center/account/communications/messages';

interface ComplaintsSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  open: number;
}

interface ComplaintRow {
  id: string;
  code: string;
  source: string;
  severity: string;
  score: number | null;
  subject: string;
  description: string | null;
  reporterName: string | null;
  assignee: string | null;
  status: string;
  internalAssessment: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

interface MessagesSummary {
  total: number;
  unread: number;
}

interface MessageRow {
  id: string;
  subject: string;
  message: string;
  read: boolean;
  readAt: string | null;
  sender: string;
  recipient: string | null;
  recipientRole: string | null;
  createdAt: string;
}

const SEVERITIES = [
  { value: 'CRITICAL', labelKey: 'complaintCritical' },
  { value: 'HIGH', labelKey: 'complaintHigh' },
  { value: 'MEDIUM', labelKey: 'complaintMedium' },
  { value: 'LOW', labelKey: 'complaintLow' },
] as const;

const SOURCES = [
  { value: 'STUDENT', labelKey: 'complaintSourceStudent' },
  { value: 'PARENT', labelKey: 'complaintSourceParent' },
  { value: 'TEACHER', labelKey: 'complaintSourceTeacher' },
  { value: 'EMPLOYEE', labelKey: 'complaintSourceEmployee' },
  { value: 'EXTERNAL', labelKey: 'complaintSourceExternal' },
] as const;

const STATUSES = [
  { value: 'OPEN', labelKey: 'complaintStatusOpen' },
  { value: 'IN_PROGRESS', labelKey: 'complaintStatusInProgress' },
  { value: 'RESOLVED', labelKey: 'complaintStatusResolved' },
  { value: 'CLOSED', labelKey: 'complaintStatusClosed' },
] as const;

const severityTone = (s: string): CenterPillTone =>
  s === 'CRITICAL' ? 'red' : s === 'HIGH' ? 'amber' : s === 'MEDIUM' ? 'blue' : 'slate';
const statusTone = (s: string): CenterPillTone =>
  s === 'OPEN' ? 'red' : s === 'IN_PROGRESS' ? 'amber' : s === 'RESOLVED' ? 'green' : 'slate';

type TFunc = (k: DictKey, params?: TranslateParams) => string;

function severityLabel(t: TFunc, s: string | null | undefined): string {
  const found = SEVERITIES.find((x) => x.value === s);
  return found ? t(found.labelKey) : (s ?? '—');
}
function sourceLabel(t: TFunc, s: string | null | undefined): string {
  const found = SOURCES.find((x) => x.value === s);
  return found ? t(found.labelKey) : (s ?? '—');
}
function statusLabel(t: TFunc, s: string | null | undefined): string {
  const found = STATUSES.find((x) => x.value === s);
  return found ? t(found.labelKey) : (s ?? '—');
}

const STAT_TONE: Record<string, string> = {
  brand: 'text-[color:var(--mj-accent)]',
  red: 'text-[color:var(--mj-danger)]',
  amber: 'text-[color:var(--mj-amber)]',
  blue: 'text-[color:var(--mj-link)]',
  slate: 'text-[color:var(--mj-muted)]',
  violet: 'text-[color:var(--mj-accent)]',
};

export function CenterCommunicationsPage() {
  const { t, lang } = useT();
  const [tab, setTab] = useState('complaints');

  return (
    <div className="space-y-5">
      <CenterPageHeader title={t('moduleCommunications')} description={t('communicationsSub')} />
      <nav className="mj-tabs">
        <button
          type="button"
          className={`mj-tab ${tab === 'complaints' ? 'mj-tab--active' : ''}`}
          onClick={() => setTab('complaints')}
        >
          {t('complaintsTab')}
        </button>
        <button
          type="button"
          className={`mj-tab ${tab === 'messages' ? 'mj-tab--active' : ''}`}
          onClick={() => setTab('messages')}
        >
          {t('messagesTab')}
        </button>
      </nav>
      <div className="pt-1">
        {tab === 'complaints' && <ComplaintsTab t={t} lang={lang} />}
        {tab === 'messages' && <MessagesTab t={t} lang={lang} />}
      </div>
    </div>
  );
}

function ComplaintsTab({ t, lang }: { t: TFunc; lang: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [detail, setDetail] = useState<ComplaintRow | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [debounced, setDebounced] = useState('');
  const debounceRef = useRef<number | undefined>(undefined);
  const { data: summary } = useApi<ComplaintsSummary>(
    () => api.get<ComplaintsSummary>(`${COMPLAINTS_API}/summary`),
    [],
  );
  const { data: complaints, loading, error, reload } = useApi<ComplaintRow[]>(
    () =>
      api.get<ComplaintRow[]>(COMPLAINTS_API, {
        ...(debounced ? { search: debounced } : {}),
        ...(status ? { status } : {}),
        ...(severity ? { severity } : {}),
      }),
    [debounced, status, severity],
  );

  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' })
      : '—';

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <CenterStatCard value={<span className={STAT_TONE.brand}>{summary.total ?? '—'}</span>} label={t('complaintTotal')} />
          <CenterStatCard value={<span className={STAT_TONE.red}>{summary.critical ?? '—'}</span>} label={t('complaintCritical')} />
          <CenterStatCard value={<span className={STAT_TONE.amber}>{summary.high ?? '—'}</span>} label={t('complaintHigh')} />
          <CenterStatCard value={<span className={STAT_TONE.blue}>{summary.medium ?? '—'}</span>} label={t('complaintMedium')} />
          <CenterStatCard value={<span className={STAT_TONE.slate}>{summary.low ?? '—'}</span>} label={t('complaintLow')} />
          <CenterStatCard value={<span className={STAT_TONE.violet}>{summary.open ?? '—'}</span>} label={t('complaintOpenCount')} />
        </div>
      )}

      <div className="mj-card mj-card--padding">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1 lg:max-w-sm">
            <CenterSearchInput
              value={search}
              placeholder={t('search') + '...'}
              aria-label={t('search')}
              onChange={(value) => {
                setSearch(value);
                window.clearTimeout(debounceRef.current);
                debounceRef.current = window.setTimeout(() => setDebounced(value), 300);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:flex lg:items-center">
            <div className="w-full lg:w-44">
              <select
                className="mj-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">{t('allStatuses')}</option>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
              </select>
            </div>
            <div className="w-full lg:w-44">
              <select
                className="mj-select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="">{t('allSeverities')}</option>
                {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
              </select>
            </div>
          </div>
          <button type="button" className="mj-btn mj-btn--primary mj-btn--sm lg:ms-auto" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />
            {t('addComplaint')}
          </button>
        </div>
      </div>

      {loading && <PencilLoader label={t('loading')} />}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>
      )}

      {!loading && complaints && complaints.length > 0 && (
        <div className="mj-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[color:var(--mj-border-soft)] px-5 py-3">
            <p className="text-sm text-[color:var(--mj-muted)]">
              {t('showingResults', { count: complaints.length })}
            </p>
          </div>
          <div className="divide-y divide-[color:var(--mj-border-soft)]">
            {complaints.map((c) => (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => setDetail(c)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDetail(c);
                  }
                }}
                className="group flex cursor-pointer flex-col gap-3 px-5 py-4 transition-colors hover:bg-[color:var(--mj-wash)] focus:outline-none lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[color:var(--mj-muted-2)]">{c.code}</span>
                    <CenterPill tone={severityTone(c.severity)}>{severityLabel(t, c.severity)}</CenterPill>
                    <CenterPill tone={statusTone(c.status)}>{statusLabel(t, c.status)}</CenterPill>
                    <span className="flex items-center gap-1 text-xs text-[color:var(--mj-muted-2)]">
                      <UserRound className="h-3.5 w-3.5" />
                      {sourceLabel(t, c.source)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-[color:var(--mj-ink-strong)]">{c.subject}</p>
                  {c.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-[color:var(--mj-muted)]">{c.description}</p>
                  )}
                  <p className="mt-1 text-xs text-[color:var(--mj-muted-2)]">
                    {fmtDate(c.createdAt)} · {t('complaintReporter')}: {c.reporterName ?? '—'} ·{' '}
                    {t('complaintAssignee')}: {c.assignee ?? '—'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className="mj-btn mj-btn--ghost mj-btn--sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetail(c);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    {t('viewDetails')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && complaints?.length === 0 && (
        <div className="mj-card">
          <div className="mj-empty">
            <MessagesSquare className="mj-empty-icon" />
            <p className="text-sm">{t('noComplaints')}</p>
          </div>
        </div>
      )}

      {showAdd && (
        <AddComplaintModal t={t} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); reload(); }} />
      )}
      {detail && (
        <ComplaintDetailModal
          t={t}
          lang={lang}
          complaint={detail}
          onClose={() => setDetail(null)}
          onUpdated={reload}
        />
      )}
    </div>
  );
}

function ComplaintDetailModal({
  t,
  lang,
  complaint,
  onClose,
  onUpdated,
}: {
  t: TFunc;
  lang: string;
  complaint: ComplaintRow;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const toast = useToast();
  const [local, setLocal] = useState(complaint);
  const [status, setStatus] = useState(complaint.status);
  const [saving, setSaving] = useState(false);

  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';

  const saveStatus = async () => {
    if (status === local.status) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await api.patch(`${COMPLAINTS_API}/${local.id}`, { status });
      toast.success(t('complaintUpdatedToast'));
      setLocal((c) => ({ ...c, status }));
      onUpdated();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CenterModal
      open
      onClose={onClose}
      title={t('complaintDetails')}
      footer={
        <>
          <div className="flex items-center gap-2">
            <select className="mj-select w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
            </select>
            <button type="button" className="mj-btn mj-btn--primary" onClick={saveStatus} disabled={saving}>
              {t('saveStatus')}
            </button>
          </div>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>
            {t('cancel')}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[color:var(--mj-muted-2)]">{local.code}</span>
          <CenterPill tone={severityTone(local.severity)}>{severityLabel(t, local.severity)}</CenterPill>
          <CenterPill tone={statusTone(local.status)}>{statusLabel(t, local.status)}</CenterPill>
        </div>
        <h3 className="text-base font-semibold text-[color:var(--mj-ink-strong)]">{local.subject}</h3>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <InfoItem label={t('complaintSource')} value={sourceLabel(t, local.source)} />
          <InfoItem label={t('complaintSeverity')} value={severityLabel(t, local.severity)} />
          <InfoItem label={t('complaintScore')} value={local.score != null ? String(local.score) : '—'} />
          <InfoItem label={t('complaintReporter')} value={local.reporterName ?? '—'} />
          <InfoItem label={t('complaintAssignee')} value={local.assignee ?? '—'} />
          <InfoItem label={t('reportedOn')} value={fmtDate(local.createdAt)} />
          {local.resolvedAt && <InfoItem label={t('resolvedOn')} value={fmtDate(local.resolvedAt)} />}
        </dl>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--mj-muted-2)]">
            {t('complaintDescription')}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[color:var(--mj-ink)]">
            {local.description || t('noDescription')}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--mj-muted-2)]">
            {t('complaintAssessment')}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[color:var(--mj-ink)]">
            {local.internalAssessment || t('noAssessment')}
          </p>
        </div>
      </div>
    </CenterModal>
  );
}

function AddComplaintModal({
  t,
  onClose,
  onDone,
}: {
  t: TFunc;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ source: 'EXTERNAL', severity: 'MEDIUM', subject: '', description: '', reporterName: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) {
      toast.error(t('requiredFields'));
      return;
    }
    setSaving(true);
    try {
      await api.post(COMPLAINTS_API, form);
      toast.success(t('complaintCreatedToast'));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CenterModal
      open
      onClose={onClose}
      title={t('addComplaint')}
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={submit} disabled={saving}>
            {t('save')}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-0" noValidate>
        <div className="grid grid-cols-1 gap-x-4 gap-y-0 sm:grid-cols-2">
          <div className="mj-field">
            <label className="mj-label">{t('complaintSource')}</label>
            <select className="mj-select" value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}>
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('complaintSeverity')}</label>
            <select className="mj-select" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
              {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
            </select>
          </div>
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('complaintSubject')}</label>
          <input type="text" className="mj-input" required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('complaintDescription')}</label>
          <textarea className="mj-textarea" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('complaintReporter')}</label>
          <input type="text" className="mj-input" value={form.reporterName} onChange={(e) => setForm((f) => ({ ...f, reporterName: e.target.value }))} />
        </div>
      </form>
    </CenterModal>
  );
}

function MessagesTab({ t, lang }: { t: TFunc; lang: string }) {
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const { data: summary } = useApi<MessagesSummary>(() => api.get<MessagesSummary>(`${MESSAGES_API}/summary`), []);
  const { data: messages, loading, error, reload } = useApi<MessageRow[]>(() => api.get<MessageRow[]>(MESSAGES_API), []);

  const markRead = async (id: string) => {
    try {
      await api.patch(`${MESSAGES_API}/${id}/read`);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <div className="space-y-4">
      {(summary?.total ?? 0) > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:max-w-md">
          <CenterStatCard value={<span className={STAT_TONE.brand}>{summary?.total ?? '—'}</span>} label={t('messagesTitle')} />
          <CenterStatCard value={<span className={STAT_TONE.amber}>{summary?.unread ?? '—'}</span>} label={t('messageUnread')} />
        </div>
      )}

      <div className="mj-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-5 py-3">
          <p className="text-sm font-semibold text-[color:var(--mj-ink-strong)]">{t('messagesTitle')}</p>
          <button type="button" className="mj-btn mj-btn--primary mj-btn--sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" />
            {t('sendMessage')}
          </button>
        </div>

        {loading && <PencilLoader label={t('loading')} />}
        {error && (
          <div className="m-4 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>
        )}

        {!loading && messages && messages.length > 0 ? (
          <div className="divide-y divide-[color:var(--mj-border-soft)]">
            {messages.map((m) => (
              <div key={m.id} className="flex items-start gap-3 px-5 py-4">
                <div
                  className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    m.read ? 'bg-[color:var(--mj-line-bg)]' : 'bg-[color:var(--mj-accent)]'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-semibold ${m.read ? 'text-[color:var(--mj-muted)]' : 'text-[color:var(--mj-ink-strong)]'}`}>
                      {m.subject}
                    </p>
                    <CenterPill tone={m.recipient ? 'blue' : 'slate'}>{m.recipient ?? t('toAllCenter')}</CenterPill>
                  </div>
                  <p className={`mt-0.5 text-sm ${m.read ? 'text-[color:var(--mj-muted)]' : 'text-[color:var(--mj-ink)]'}`}>
                    {m.message}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--mj-muted-2)]">
                    {fmtDate(m.createdAt)} · {t('messageFrom')}: {m.sender}
                  </p>
                </div>
                {!m.read && (
                  <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => markRead(m.id)}>
                    <CheckCheck className="h-4 w-4" />
                    {t('read')}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="mj-empty">
              <MessagesSquare className="mj-empty-icon" />
              <p className="text-sm">{t('noMessages')}</p>
            </div>
          )
        )}
      </div>

      {showNew && (
        <NewMessageModal t={t} onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); reload(); }} />
      )}
    </div>
  );
}

function NewMessageModal({
  t,
  onClose,
  onDone,
}: {
  t: TFunc;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error(t('requiredFields'));
      return;
    }
    setSaving(true);
    try {
      await api.post(MESSAGES_API, form);
      toast.success(t('messageSentToast'));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CenterModal
      open
      onClose={onClose}
      title={t('sendMessage')}
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={submit} disabled={saving}>
            {t('send')}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-0" noValidate>
        <div className="mj-field">
          <label className="mj-label">{t('messageSubject')}</label>
          <input
            type="text"
            className="mj-input"
            required
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('messageText')}</label>
          <textarea
            className="mj-textarea"
            required
            rows={5}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          />
        </div>
      </form>
    </CenterModal>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[color:var(--mj-wash)] px-3 py-2">
      <p className="text-[11px] font-medium text-[color:var(--mj-muted-2)]">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-[color:var(--mj-ink)]">{value}</p>
    </div>
  );
}

export default CenterCommunicationsPage;

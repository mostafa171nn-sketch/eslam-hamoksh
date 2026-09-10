'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MessagesSquare,
  Send,
  CheckCheck,
  Cpu,
  StickyNote,
  ShieldAlert,
} from 'lucide-react';
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

const COMMUNICATIONS_API = '/center/account/communications';

interface CommunicationsSummary {
  employeeMessages: number;
  unread: number;
  openComplaints: number;
  criticalHigh: number;
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
  assigneeId: string | null;
  assignee: string | null;
  assigneeRole: string | null;
  status: string;
  internalAssessment: string | null;
  internalNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeRow {
  id: string;
  fullName: string;
  role: string | null;
}

interface MessageRow {
  id: string;
  subject: string;
  message: string;
  read: boolean;
  readAt: string | null;
  sender: string;
  senderRole: string | null;
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
  { value: 'WAITING_CUSTOMER', labelKey: 'complaintStatusWaiting' },
  { value: 'RESOLVED', labelKey: 'complaintStatusResolved' },
  { value: 'CLOSED', labelKey: 'complaintStatusClosed' },
] as const;

const RESPONSE_TARGET: Record<string, DictKey> = {
  CRITICAL: 'responseImmediate',
  HIGH: 'responseUrgent',
  MEDIUM: 'responseToday',
  LOW: 'responseThisWeek',
};

const severityTone = (s: string): CenterPillTone =>
  s === 'CRITICAL' ? 'red' : s === 'HIGH' ? 'amber' : s === 'MEDIUM' ? 'blue' : 'slate';
const statusTone = (s: string): CenterPillTone =>
  s === 'OPEN'
    ? 'red'
    : s === 'IN_PROGRESS'
    ? 'amber'
    : s === 'WAITING_CUSTOMER'
    ? 'blue'
    : s === 'RESOLVED'
    ? 'green'
    : 'slate';

const STAT_TONE: Record<string, string> = {
  brand: 'text-[color:var(--mj-accent)]',
  red: 'text-[color:var(--mj-danger)]',
  amber: 'text-[color:var(--mj-amber)]',
  blue: 'text-[color:var(--mj-link)]',
  slate: 'text-[color:var(--mj-muted)]',
};

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

function formatSmartDatetime(iso: string, lang: string, t: TFunc): string {
  const d = new Date(iso);
  const now = new Date();
  const date = d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
  const time = d.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (d.toDateString() === now.toDateString()) return `${t('todayLabel')} ${time}`;
  return `${date} ${time}`;
}

function waitSince(iso: string, t: TFunc): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.max(1, Math.floor(ms / 3_600_000));
  return t('complaintWait', { hours });
}

export function CenterCommunicationsPage() {
  const { t, lang } = useT();
  const [tab, setTab] = useState<'complaints' | 'messages'>('complaints');
  const [showNew, setShowNew] = useState(false);
  const { data: summary, reload: reloadSummary } = useApi<CommunicationsSummary>(
    () => api.get<CommunicationsSummary>(`${COMMUNICATIONS_API}/summary`),
    [],
  );
  const { data: employees } = useApi<EmployeeRow[]>(() => api.get('/center/employees', { limit: 200 }), []);

  const unread = summary?.unread ?? 0;
  const open = summary?.openComplaints ?? 0;

  return (
    <div className="space-y-5">
      <CenterPageHeader
        eyebrow={t('communicationsEyebrow')}
        title={t('moduleCommunications')}
        description={t('communicationsSub')}
      >
        <button type="button" className="mj-btn mj-btn--primary" onClick={() => setShowNew(true)}>
          <Send className="h-4 w-4" />
          {t('sendMessageToEmployee')}
        </button>
      </CenterPageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <CenterStatCard
          value={<span className={STAT_TONE.brand}>{summary?.employeeMessages ?? '—'}</span>}
          label={t('employeeMessagesStat')}
        />
        <CenterStatCard
          value={<span className={STAT_TONE.amber}>{summary?.unread ?? '—'}</span>}
          label={t('messageUnreadStat')}
        />
        <CenterStatCard
          value={<span className={STAT_TONE.blue}>{summary?.openComplaints ?? '—'}</span>}
          label={t('openComplaintsStat')}
        />
        <CenterStatCard
          value={<span className={STAT_TONE.red}>{summary?.criticalHigh ?? '—'}</span>}
          label={t('criticalHighStat')}
        />
      </div>

      <nav className="mj-tabs">
        <button
          type="button"
          className={`mj-tab ${tab === 'messages' ? 'mj-tab--active' : ''}`}
          onClick={() => setTab('messages')}
        >
          {t('messagesTab')}
          {unread > 0 && <span className="mj-tab-count">{unread}</span>}
        </button>
        <button
          type="button"
          className={`mj-tab ${tab === 'complaints' ? 'mj-tab--active' : ''}`}
          onClick={() => setTab('complaints')}
        >
          {t('complaintsTab')}
          {open > 0 && <span className="mj-tab-count">{open}</span>}
        </button>
      </nav>

      <div className="pt-1">
        {tab === 'complaints' && <ComplaintsTab t={t} lang={lang} employees={employees ?? []} />}
        {tab === 'messages' && <MessagesTab t={t} lang={lang} />}
      </div>

      {showNew && (
        <NewMessageModal
          t={t}
          employees={employees ?? []}
          onClose={() => setShowNew(false)}
          onDone={() => {
            setShowNew(false);
            reloadSummary();
          }}
        />
      )}
    </div>
  );
}

function ComplaintsTab({
  t,
  lang,
  employees,
}: {
  t: TFunc;
  lang: string;
  employees: EmployeeRow[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const debounceRef = useRef<number | undefined>(undefined);

  const { data: complaints, loading, error, reload } = useApi<ComplaintRow[]>(
    () =>
      api.get<ComplaintRow[]>(`${COMMUNICATIONS_API}/complaints`, {
        ...(debounced ? { search: debounced } : {}),
        ...(severity ? { severity } : {}),
        ...(status ? { status } : {}),
      }),
    [debounced, severity, status],
  );

  const selected = complaints?.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <div className="mj-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[color:var(--mj-border-soft)] p-4">
          <CenterSearchInput
            value={search}
            placeholder={t('complaintSearchPlaceholder')}
            aria-label={t('complaintSearchPlaceholder')}
            onChange={(value) => {
              setSearch(value);
              window.clearTimeout(debounceRef.current);
              debounceRef.current = window.setTimeout(() => setDebounced(value), 300);
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <select className="mj-select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">{t('allSeverities')}</option>
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.labelKey)}
                </option>
              ))}
            </select>
            <select className="mj-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t('allStatuses')}</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {loading && <PencilLoader label={t('loading')} />}
          {error && (
            <div className="m-4 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}
          {!loading && complaints?.length === 0 && (
            <div className="mj-empty">
              <MessagesSquare className="mj-empty-icon" />
              <p className="text-sm">{t('noComplaints')}</p>
            </div>
          )}
          {!loading && complaints && complaints.length > 0 && (
            <div className="divide-y divide-[color:var(--mj-border-soft)]">
              {complaints.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`block w-full px-4 py-3.5 text-start transition-colors hover:bg-[color:var(--mj-wash)] ${
                    selected?.id === c.id ? 'bg-[color:var(--mj-wash)]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <CenterPill tone={severityTone(c.severity)} dot>
                      {severityLabel(t, c.severity)}
                    </CenterPill>
                    <CenterPill tone={statusTone(c.status)}>{statusLabel(t, c.status)}</CenterPill>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[color:var(--mj-ink-strong)]">{c.subject}</p>
                  <p className="mt-0.5 text-xs text-[color:var(--mj-muted)]">
                    <span className="font-mono">{c.code}</span> · {c.reporterName ?? '—'} (
                    {sourceLabel(t, c.source)})
                  </p>
                  <p className="mt-0.5 text-xs text-[color:var(--mj-muted-2)]">
                    {c.assignee ?? '—'} · {waitSince(c.createdAt, t)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        {selected ? (
          <ComplaintDetail
            t={t}
            lang={lang}
            complaint={selected}
            employees={employees}
            onUpdated={reload}
          />
        ) : (
          <div className="mj-card">
            <div className="mj-empty">
              <MessagesSquare className="mj-empty-icon" />
              <p className="text-sm">{t('selectComplaint')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ComplaintDetail({
  t,
  lang,
  complaint,
  employees,
  onUpdated,
}: {
  t: TFunc;
  lang: string;
  complaint: ComplaintRow;
  employees: EmployeeRow[];
  onUpdated: () => void;
}) {
  const toast = useToast();
  const [status, setStatus] = useState(complaint.status);
  const [assigneeId, setAssigneeId] = useState(complaint.assigneeId ?? '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<null | 'status' | 'assignee' | 'resolved' | 'note'>(null);

  useEffect(() => {
    setStatus(complaint.status);
    setAssigneeId(complaint.assigneeId ?? '');
  }, [complaint.id, complaint.status, complaint.assigneeId]);

  const updateField = async (patch: Record<string, unknown>, kind: 'status' | 'assignee' | 'resolved') => {
    setSaving(kind);
    try {
      await api.patch(`${COMMUNICATIONS_API}/complaints/${complaint.id}`, patch);
      toast.success(t('complaintUpdatedToast'));
      onUpdated();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  const onStatusChange = (value: string) => {
    setStatus(value);
    void updateField({ status: value }, 'status');
  };

  const onAssigneeChange = (value: string) => {
    setAssigneeId(value);
    void updateField({ assigneeId: value || null }, 'assignee');
  };

  const addNote = async () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    setSaving('note');
    try {
      await api.patch(`${COMMUNICATIONS_API}/complaints/${complaint.id}`, { note: trimmed });
      toast.success(t('complaintUpdatedToast'));
      setNote('');
      onUpdated();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  const resolved = complaint.status === 'RESOLVED' || complaint.status === 'CLOSED';
  const notes = (complaint.internalNotes ?? '').split('\n').filter(Boolean);

  return (
    <div className="mj-card mj-card--padding space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--mj-border-soft)] pb-4">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-[color:var(--mj-muted-2)]">
            {complaint.code} · {formatSmartDatetime(complaint.createdAt, lang, t)}
          </p>
          <h2 className="mt-1 text-base font-bold text-[color:var(--mj-ink-strong)]">{complaint.subject}</h2>
          <p className="mt-0.5 text-sm text-[color:var(--mj-muted)]">
            {complaint.reporterName ?? '—'} · {sourceLabel(t, complaint.source)}
          </p>
        </div>
        <CenterPill tone={severityTone(complaint.severity)}>
          {severityLabel(t, complaint.severity)} · {complaint.score != null ? `${complaint.score}/100` : '—/100'}
        </CenterPill>
      </header>

      <section className="rounded-lg bg-[color:var(--mj-wash)] p-3.5">
        <p className="flex items-center gap-1.5 text-xs font-bold text-[color:var(--mj-muted-2)]">
          <Cpu className="h-3.5 w-3.5" />
          {t('internalAssessmentTitle')}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--mj-ink)]">
          {complaint.internalAssessment || t('noAssessment')}
        </p>
        <p className="mt-2 text-xs text-[color:var(--mj-muted-2)]">{t('internalAssessmentNote')}</p>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--mj-muted-2)]">
          {t('complaintDetailsLabel')}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--mj-ink)]">
          {complaint.description || t('noDescription')}
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="mj-field">
          <label className="mj-label">{t('complaintAssignee')}</label>
          <select
            className="mj-select"
            value={assigneeId}
            disabled={saving !== null}
            onChange={(e) => onAssigneeChange(e.target.value)}
          >
            <option value="">—</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName}
              </option>
            ))}
          </select>
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('complaintStatus')}</label>
          <select
            className="mj-select"
            value={status}
            disabled={saving !== null}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {t(s.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('responseTarget')}</label>
          <p className="mt-2 text-sm font-semibold text-[color:var(--mj-accent)]">
            {t(RESPONSE_TARGET[complaint.severity] ?? 'responseThisWeek')}
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-[color:var(--mj-border-soft)] p-3.5">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[color:var(--mj-muted-2)]">
          <StickyNote className="h-3.5 w-3.5" />
          {t('internalNotes')}
        </h3>
        {notes.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {notes.map((n, i) => (
              <li key={i} className="text-sm leading-relaxed text-[color:var(--mj-ink)]">
                {n}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <textarea
            className="mj-textarea flex-1"
            rows={2}
            value={note}
            placeholder={t('notePlaceholder')}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            type="button"
            className="mj-btn mj-btn--secondary mj-btn--sm"
            onClick={addNote}
            disabled={saving !== null || !note.trim()}
          >
            {saving === 'note' ? t('saving') : t('addNote')}
          </button>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--mj-border-soft)] pt-4">
        <p className="flex items-start gap-1.5 text-xs text-[color:var(--mj-muted-2)]">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t('escalationHint')}
        </p>
        {resolved ? (
          <span className="flex flex-col items-end gap-1">
            <CenterPill tone="green">{statusLabel(t, complaint.status)}</CenterPill>
            {complaint.resolvedAt && (
              <span className="text-xs text-[color:var(--mj-muted-2)]">
                {formatSmartDatetime(complaint.resolvedAt, lang, t)}
              </span>
            )}
          </span>
        ) : (
          <button
            type="button"
            className="mj-btn mj-btn--primary"
            onClick={() => void updateField({ status: 'RESOLVED' }, 'resolved')}
            disabled={saving !== null}
          >
            <CheckCheck className="h-4 w-4" />
            {saving === 'resolved' ? t('saving') : t('markAsResolved')}
          </button>
        )}
      </footer>
    </div>
  );
}

function MessagesTab({ t, lang }: { t: TFunc; lang: string }) {
  const toast = useToast();
  const { data: messages, loading, error, reload } = useApi<MessageRow[]>(
    () => api.get<MessageRow[]>(`${COMMUNICATIONS_API}/messages`),
    [],
  );

  const markRead = async (id: string) => {
    try {
      await api.patch(`${COMMUNICATIONS_API}/messages/${id}/read`);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="mj-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-5 py-3">
        <p className="text-sm font-semibold text-[color:var(--mj-ink-strong)]">{t('employeeMessagesStat')}</p>
      </div>

      {loading && <PencilLoader label={t('loading')} />}
      {error && (
        <div className="m-4 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>
      )}

      {!loading && messages && messages.length > 0 && (
        <div className="divide-y divide-[color:var(--mj-border-soft)]">
          {messages.map((m) => (
            <div key={m.id} className="flex items-start gap-4 px-5 py-4">
              <div
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  m.read ? 'bg-[color:var(--mj-line-bg)]' : 'bg-[color:var(--mj-accent)]'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={`text-sm font-semibold ${
                      m.read ? 'text-[color:var(--mj-muted)]' : 'text-[color:var(--mj-ink-strong)]'
                    }`}
                  >
                    {m.subject}
                  </p>
                  <CenterPill tone={m.recipient ? 'blue' : 'slate'}>{m.recipient ?? t('messageToAll')}</CenterPill>
                </div>
                <p className={`mt-0.5 text-sm ${m.read ? 'text-[color:var(--mj-muted)]' : 'text-[color:var(--mj-ink)]'}`}>
                  {m.message}
                </p>
                <p className="mt-1 text-xs text-[color:var(--mj-muted-2)]">
                  {formatSmartDatetime(m.createdAt, lang, t)} · {t('messageFrom')}: {m.sender}
                </p>
              </div>
              {!m.read && (
                <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => markRead(m.id)}>
                  <CheckCheck className="h-4 w-4" />
                  {t('markReadAction')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && messages?.length === 0 && (
        <div className="mj-empty">
          <MessagesSquare className="mj-empty-icon" />
          <p className="text-sm">{t('noMessages')}</p>
        </div>
      )}
    </div>
  );
}

function NewMessageModal({
  t,
  employees,
  onClose,
  onDone,
}: {
  t: TFunc;
  employees: EmployeeRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ recipientId: '', subject: '', message: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error(t('requiredFields'));
      return;
    }
    setSaving(true);
    try {
      await api.post(`${COMMUNICATIONS_API}/messages`, {
        subject: form.subject.trim(),
        message: form.message.trim(),
        recipientId: form.recipientId || null,
      });
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
      title={t('sendMessageToEmployee')}
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
          <label className="mj-label">{t('messageRecipient')}</label>
          <select
            className="mj-select"
            value={form.recipientId}
            onChange={(e) => setForm((f) => ({ ...f, recipientId: e.target.value }))}
          >
            <option value="">{t('messageToAll')}</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName}
              </option>
            ))}
          </select>
        </div>
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

export default CenterCommunicationsPage;
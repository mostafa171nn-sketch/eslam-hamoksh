'use client';

import { useRef, useState } from 'react';
import { MessagesSquare, Plus, UserRound, CheckCheck, Eye } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
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

const severityTone = (s: string) =>
  s === 'CRITICAL' ? 'red' : s === 'HIGH' ? 'amber' : s === 'MEDIUM' ? 'blue' : 'slate';
const statusTone = (s: string) =>
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

export function CenterCommunicationsPage() {
  const { t, lang } = useT();
  const [tab, setTab] = useState('complaints');

  return (
    <div className="space-y-6">
      <PageHeader title={t('moduleCommunications')} subtitle={t('communicationsSub')} />
      <Tabs
        tabs={[
          { key: 'complaints', label: t('complaintsTab') },
          { key: 'messages', label: t('messagesTab') },
        ]}
        activeKey={tab}
        onChange={setTab}
      >
        <div className="pt-1">
          {tab === 'complaints' && <ComplaintsTab t={t} lang={lang} />}
          {tab === 'messages' && <MessagesTab t={t} lang={lang} />}
        </div>
      </Tabs>
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryChip label={t('complaintTotal')} value={summary?.total} tone="brand" />
        <SummaryChip label={t('complaintCritical')} value={summary?.critical} tone="red" />
        <SummaryChip label={t('complaintHigh')} value={summary?.high} tone="amber" />
        <SummaryChip label={t('complaintMedium')} value={summary?.medium} tone="blue" />
        <SummaryChip label={t('complaintLow')} value={summary?.low} tone="slate" />
        <SummaryChip label={t('complaintOpenCount')} value={summary?.open} tone="violet" />
      </div>

      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input
            className="lg:max-w-sm"
            placeholder={t('search') + '...'}
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);
              window.clearTimeout(debounceRef.current);
              debounceRef.current = window.setTimeout(() => setDebounced(value), 300);
            }}
          />
          <div className="grid grid-cols-2 gap-3 lg:flex lg:items-center">
            <div className="w-full lg:w-44">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: '', label: t('allStatuses') },
                  ...STATUSES.map((s) => ({ value: s.value, label: t(s.labelKey) })),
                ]}
              />
            </div>
            <div className="w-full lg:w-44">
              <Select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                options={[
                  { value: '', label: t('allSeverities') },
                  ...SEVERITIES.map((s) => ({ value: s.value, label: t(s.labelKey) })),
                ]}
              />
            </div>
          </div>
          <Button size="sm" className="lg:ms-auto" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />
            {t('addComplaint')}
          </Button>
        </div>
      </Card>

      {loading && <PencilLoader label={t('loading')} />}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>
      )}

      {!loading && complaints && complaints.length > 0 && (
        <Card bodyClassName="p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('showingResults', { count: complaints.length })}
            </p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
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
                className="group flex cursor-pointer flex-col gap-3 px-5 py-4 transition-colors focus:outline-none focus-visible:bg-slate-50 hover:bg-slate-50 dark:focus-visible:bg-slate-700/40 dark:hover:bg-slate-700/40 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-400">{c.code}</span>
                    <Badge tone={severityTone(c.severity)}>{severityLabel(t, c.severity)}</Badge>
                    <Badge tone={statusTone(c.status)}>{statusLabel(t, c.status)}</Badge>
                    <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <UserRound className="h-3.5 w-3.5" />
                      {sourceLabel(t, c.source)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white">{c.subject}</p>
                  {c.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{c.description}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {fmtDate(c.createdAt)} · {t('complaintReporter')}: {c.reporterName ?? '—'} ·{' '}
                    {t('complaintAssignee')}: {c.assignee ?? '—'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetail(c);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    {t('viewDetails')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!loading && complaints?.length === 0 && (
        <EmptyState icon={MessagesSquare} title={t('noComplaints')} />
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
    <Modal
      open
      onClose={onClose}
      title={t('complaintDetails')}
      size="lg"
      footer={
        <>
          <div className="flex items-center gap-2">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={STATUSES.map((s) => ({ value: s.value, label: t(s.labelKey) }))}
              className="w-40"
            />
            <Button onClick={saveStatus} loading={saving}>
              {t('saveStatus')}
            </Button>
          </div>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-slate-400">{local.code}</span>
          <Badge tone={severityTone(local.severity)}>{severityLabel(t, local.severity)}</Badge>
          <Badge tone={statusTone(local.status)}>{statusLabel(t, local.status)}</Badge>
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{local.subject}</h3>

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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {t('complaintDescription')}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {local.description || t('noDescription')}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {t('complaintAssessment')}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {local.internalAssessment || t('noAssessment')}
          </p>
        </div>
      </div>
    </Modal>
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
    <Modal
      open
      onClose={onClose}
      title={t('addComplaint')}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={submit} loading={saving}>
            {t('save')}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label={t('complaintSource')}
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            options={SOURCES.map((s) => ({ value: s.value, label: t(s.labelKey) }))}
          />
          <Select
            label={t('complaintSeverity')}
            value={form.severity}
            onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
            options={SEVERITIES.map((s) => ({ value: s.value, label: t(s.labelKey) }))}
          />
        </div>
        <Input
          label={t('complaintSubject')}
          required
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
        />
        <Textarea
          label={t('complaintDescription')}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <Input
          label={t('complaintReporter')}
          value={form.reporterName}
          onChange={(e) => setForm((f) => ({ ...f, reporterName: e.target.value }))}
        />
      </form>
    </Modal>
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
          <SummaryChip label={t('messagesTitle')} value={summary?.total} tone="brand" />
          <SummaryChip label={t('messageUnread')} value={summary?.unread} tone="amber" />
        </div>
      )}

      <Card bodyClassName="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('messagesTitle')}</p>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" />
            {t('sendMessage')}
          </Button>
        </div>

        {loading && <PencilLoader label={t('loading')} />}
        {error && (
          <div className="m-4 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>
        )}

        {!loading && messages && messages.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {messages.map((m) => (
              <div key={m.id} className="flex items-start gap-3 px-5 py-4">
                <div
                  className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    m.read ? 'bg-slate-200 dark:bg-slate-600' : 'bg-brand-500'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-semibold ${m.read ? 'text-slate-600 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                      {m.subject}
                    </p>
                    <Badge tone={m.recipient ? 'blue' : 'slate'}>{m.recipient ?? t('toAllCenter')}</Badge>
                  </div>
                  <p className={`mt-0.5 text-sm ${m.read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                    {m.message}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {fmtDate(m.createdAt)} · {t('messageFrom')}: {m.sender}
                  </p>
                </div>
                {!m.read && (
                  <Button size="sm" variant="outline" onClick={() => markRead(m.id)}>
                    <CheckCheck className="h-4 w-4" />
                    {t('read')}
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          !loading && <EmptyState icon={MessagesSquare} title={t('noMessages')} />
        )}
      </Card>

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
    <Modal
      open
      onClose={onClose}
      title={t('sendMessage')}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={submit} loading={saving}>
            {t('send')}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input
          label={t('messageSubject')}
          required
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
        />
        <Textarea
          label={t('messageText')}
          required
          rows={5}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        />
      </form>
    </Modal>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/40">
      <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | undefined;
  tone: 'brand' | 'red' | 'amber' | 'blue' | 'slate' | 'violet';
}) {
  const tones: Record<string, string> = {
    brand: 'text-brand-700 dark:text-brand-300',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-blue-600 dark:text-blue-400',
    slate: 'text-slate-700 dark:text-slate-200',
    violet: 'text-violet-600 dark:text-violet-400',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className={`text-xl font-bold ${tones[tone]}`}>{value ?? '—'}</p>
      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export default CenterCommunicationsPage;
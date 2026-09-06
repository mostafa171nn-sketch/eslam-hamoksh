'use client';

import { useState } from 'react';
import {
  MessagesSquare, Plus, UserRound, CheckCheck,
} from 'lucide-react';
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
import { useT, type DictKey } from '../../../i18n';

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
  score: number;
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
  { value: 'LOW', label: 'منخفضة' },
  { value: 'MEDIUM', label: 'متوسطة' },
  { value: 'HIGH', label: 'عالية' },
  { value: 'CRITICAL', label: 'حرجة' },
];
const SOURCES = [
  { value: 'EXTERNAL', label: 'خارجي' },
  { value: 'INTERNAL', label: 'داخلي' },
  { value: 'PHONE', label: 'هاتف' },
  { value: 'WHATSAPP', label: 'واتساب' },
  { value: 'SOCIAL', label: 'سوشيال ميديا' },
  { value: 'OTHER', label: 'أخرى' },
];
const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const severityTone = (s: string) =>
  s === 'CRITICAL' ? 'red' : s === 'HIGH' ? 'amber' : s === 'MEDIUM' ? 'blue' : 'slate';

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

function ComplaintsTab({ t, lang }: { t: (k: DictKey) => string; lang: string }) {
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [debounced, setDebounced] = useState('');
  const { data: summary } = useApi<ComplaintsSummary>(() => api.get<ComplaintsSummary>('/center/communications/complaints/summary'), []);
  const { data: complaints, loading, error, reload } = useApi<ComplaintRow[]>(
    () => api.get<ComplaintRow[]>('/center/communications/complaints', status ? { search: debounced || undefined, status } : { search: debounced || undefined }),
    [debounced, status]
  );

  const setStatusNow = async (id: string, next: string) => {
    try {
      await api.patch(`/center/communications/complaints/${id}`, { status: next });
      toast.success(t('complaintUpdatedToast'));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' }) : '—';

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            className="sm:max-w-sm"
            placeholder={t('search') + '...'}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              clearTimeout((window as any).__c_s_t);
              (window as any).__c_s_t = setTimeout(() => setDebounced(e.target.value), 300);
            }}
          />
          <div className="sm:w-44">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: '', label: t('selectBranch') },
                ...STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
              ]}
            />
          </div>
          <Button size="sm" className="sm:ms-auto" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />
            {t('addComplaint')}
          </Button>
        </div>
      </Card>

      {loading && <PencilLoader label={t('loading')} />}
      {error && <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>}

      {!loading && complaints && complaints.length > 0 && (
        <Card bodyClassName="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {complaints.map((c) => (
              <div key={c.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-400">{c.code}</span>
                    <Badge tone={severityTone(c.severity)}>{c.severity}</Badge>
                    <Badge tone={c.status === 'OPEN' ? 'red' : c.status === 'IN_PROGRESS' ? 'amber' : 'green'}>{c.status?.replace(/_/g, ' ')}</Badge>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <UserRound className="h-3.5 w-3.5" />
                      {lang === 'ar' ? c.reporterName : c.reporterName}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white">{c.subject}</p>
                  {c.description && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{c.description}</p>}
                  <p className="mt-1 text-xs text-slate-400">{fmtDate(c.createdAt)} · {t('complaintAssignee')}: {c.assignee ?? '—'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Select
                    value={c.status}
                    onChange={(e) => setStatusNow(c.id, e.target.value)}
                    options={STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
                    className="w-36"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!loading && complaints?.length === 0 && (
        <EmptyState icon={MessagesSquare} title={t('noComplaints')} />
      )}

      {showAdd && <AddComplaintModal t={t} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); reload(); }} />}
    </div>
  );
}

function AddComplaintModal({ t, onClose, onDone }: { t: (k: DictKey) => string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ source: 'EXTERNAL', severity: 'MEDIUM', subject: '', description: '', reporterName: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) { toast.error(t('requiredFields')); return; }
    setSaving(true);
    try {
      await api.post('/center/communications/complaints', form);
      toast.success(t('complaintCreatedToast'));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={t('addComplaint')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={submit} loading={saving}>{t('save')}</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label={t('complaintSource')} value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} options={SOURCES} />
          <Select label={t('complaintSeverity')} value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))} options={SEVERITIES} />
        </div>
        <Input label={t('complaintSubject')} required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
        <Textarea label={t('complaintDescription')} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        <Input label={t('complaintReporter')} value={form.reporterName} onChange={(e) => setForm((f) => ({ ...f, reporterName: e.target.value }))} />
      </form>
    </Modal>
  );
}

function MessagesTab({ t, lang }: { t: (k: DictKey) => string; lang: string }) {
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const { data: summary } = useApi<MessagesSummary>(() => api.get<MessagesSummary>('/center/communications/messages/summary'), []);
  const { data: messages, loading, error, reload } = useApi<MessageRow[]>(() => api.get<MessageRow[]>('/center/communications/messages'), []);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/center/communications/messages/${id}/read`);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

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
          <p className="text-sm text-slate-500">{t('messagesTitle')}</p>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" />
            {t('sendMessage')}
          </Button>
        </div>

        {loading && <PencilLoader label={t('loading')} />}
        {error && <div className="m-4 rounded-lg bg-red-50 p-4 text-red-600">{error}</div>}

        {!loading && messages && messages.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {messages.map((m) => (
              <div key={m.id} className="flex items-start gap-3 px-5 py-4">
                <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${m.read ? 'bg-slate-200 dark:bg-slate-600' : 'bg-brand-500'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-semibold ${m.read ? 'text-slate-600 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>{m.subject}</p>
                    <Badge tone={m.recipient ? 'blue' : 'slate'}>{m.recipient ?? t('messageTo') + ': ' + (m.recipientRole ?? '—')}</Badge>
                  </div>
                  <p className={`mt-0.5 text-sm ${m.read ? 'text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>{m.message}</p>
                  <p className="mt-1 text-xs text-slate-400">
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

      {showNew && <NewMessageModal t={t} onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); reload(); }} />}
    </div>
  );
}

function NewMessageModal({ t, onClose, onDone }: { t: (k: DictKey) => string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) { toast.error(t('requiredFields')); return; }
    setSaving(true);
    try {
      await api.post('/center/communications/messages', form);
      toast.success(t('messageSentToast'));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={t('sendMessage')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={submit} loading={saving}>{t('send')}</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label={t('messageSubject')} required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
        <Textarea label={t('messageText')} required rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
      </form>
    </Modal>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: number | undefined; tone: 'brand' | 'red' | 'amber' | 'blue' | 'slate' | 'violet' }) {
  const tones: Record<string, string> = {
    brand: 'text-brand-700 dark:text-brand-300', red: 'text-red-600 dark:text-red-400', amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-blue-600 dark:text-blue-400', slate: 'text-slate-700 dark:text-slate-200', violet: 'text-violet-600 dark:text-violet-400',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className={`text-xl font-bold ${tones[tone]}`}>{value ?? '—'}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

export default CenterCommunicationsPage;
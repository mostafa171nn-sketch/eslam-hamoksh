'use client';

import { useState } from 'react';
import { Radio, Plus, Send, XCircle, Trash2, Users, CheckCheck } from 'lucide-react';
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
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey } from '../../../i18n';

interface BroadcastSummary {
  total: number;
  sent: number;
  scheduled: number;
  recipients: number;
}

interface BroadcastRow {
  id: string;
  audience: string;
  channel: string;
  subject: string;
  message: string;
  status: string;
  scheduledFor: string | null;
  sentAt: string | null;
  recipientCount: number;
  readCount: number;
  createdAt: string;
}

const AUDIENCES = [
  { value: 'EMPLOYEES', label: 'الموظفون' },
  { value: 'TEACHERS', label: 'المدرسون' },
  { value: 'STUDENTS', label: 'الطلاب' },
];
const CHANNELS = [
  { value: 'APP', label: 'التطبيق' },
  { value: 'SMS', label: 'رسائل نصية' },
  { value: 'EMAIL', label: 'الإيميل' },
];

const statusTone = (s: string) =>
  s === 'SENT' ? 'green' : s === 'SCHEDULED' ? 'amber' : s === 'CANCELLED' ? 'red' : 'slate';

export function CenterBroadcastPage() {
  const { t, lang } = useT();
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const { data: summary } = useApi<BroadcastSummary>(() => api.get<BroadcastSummary>('/center/broadcast/summary'), []);
  const { data: broadcasts, loading, error, reload } = useApi<BroadcastRow[]>(() => api.get<BroadcastRow[]>('/center/broadcast'), []);

  const act = async (url: string, msg: string) => {
    try {
      await api.post(url);
      toast.success(msg);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api.delete(`/center/broadcast/${id}`);
      toast.success(t('broadcastDeletedToast'));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="space-y-6">
      <PageHeader title={t('moduleBroadcast')} subtitle={t('broadcastSub')} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('broadcastTotal')} value={summary?.total ?? '—'} icon={Radio} tone="teal" />
        <StatCard label={t('broadcastSent')} value={summary?.sent ?? '—'} icon={CheckCheck} tone="emerald" />
        <StatCard label={t('broadcastScheduled')} value={summary?.scheduled ?? '—'} icon={Send} tone="amber" />
        <StatCard label={t('broadcastRecipients')} value={summary?.recipients ?? '—'} icon={Users} tone="violet" />
      </div>

      <Card bodyClassName="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-700">
          <p className="text-sm text-slate-500">{t('listBroadcasts')}</p>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" />
            {t('addBroadcast')}
          </Button>
        </div>

        {loading && <PencilLoader label={t('loading')} />}
        {error && <div className="m-4 rounded-lg bg-red-50 p-4 text-red-600">{error}</div>}

        {!loading && broadcasts && broadcasts.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {broadcasts.map((b) => (
              <div key={b.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{b.subject}</p>
                    <Badge tone={statusTone(b.status)}>{b.status?.replace(/_/g, ' ')}</Badge>
                    <Badge tone="blue">{b.audience}</Badge>
                    <Badge tone="slate">{b.channel}</Badge>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{b.message}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{b.recipientCount}</span>
                    <span className="flex items-center gap-1"><CheckCheck className="h-3.5 w-3.5 text-emerald-500" />{b.readCount} {t('read')}</span>
                    <span>{b.status === 'SENT' ? fmtDate(b.sentAt) : fmtDate(b.scheduledFor)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {b.status === 'SCHEDULED' && (
                    <Button size="sm" variant="outline" onClick={() => act(`/center/broadcast/${b.id}/send`, t('broadcastSentToast'))}>
                      <Send className="h-4 w-4" />
                      {t('broadcastSendNow')}
                    </Button>
                  )}
                  {b.status !== 'SENT' && b.status !== 'CANCELLED' && (
                    <Button size="sm" variant="outline" onClick={() => act(`/center/broadcast/${b.id}/cancel`, t('broadcastCancelledToast'))}>
                      <XCircle className="h-4 w-4" />
                      {t('broadcastCancel')}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(b.id)} aria-label={t('delete')}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loading && <EmptyState icon={Radio} title={t('noBroadcasts')} />
        )}
      </Card>

      {showNew && <NewBroadcastModal t={t} onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); reload(); }} />}
    </div>
  );
}

function NewBroadcastModal({ t, onClose, onDone }: { t: (k: DictKey) => string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ audience: 'EMPLOYEES', channel: 'APP', subject: '', message: '', scheduledFor: '', sendNow: true });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) { toast.error(t('requiredFields')); return; }
    setSaving(true);
    try {
      await api.post('/center/broadcast', form);
      toast.success(t('broadcastCreatedToast'));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={t('addBroadcast')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={submit} loading={saving}>{t('send')}</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label={t('broadcastAudience')} value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))} options={AUDIENCES} />
          <Select label={t('broadcastChannel')} value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))} options={CHANNELS} />
        </div>
        <Input label={t('broadcastSubject')} required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
        <Textarea label={t('broadcastMessage')} required rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" className="accent-teal-600" checked={form.sendNow} onChange={(e) => setForm((f) => ({ ...f, sendNow: e.target.checked }))} />
          {t('sendNow')}
        </label>
        {!form.sendNow && (
          <Input label={t('scheduleDate')} type="datetime-local" required value={form.scheduledFor} onChange={(e) => setForm((f) => ({ ...f, scheduledFor: e.target.value }))} />
        )}
      </form>
    </Modal>
  );
}

export default CenterBroadcastPage;
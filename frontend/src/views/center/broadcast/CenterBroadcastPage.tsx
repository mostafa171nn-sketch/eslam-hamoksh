'use client';

import { useState } from 'react';
import { Plus, Send, XCircle, Trash2, Users, CheckCheck, Radio } from 'lucide-react';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill, type CenterPillTone } from '../ui/CenterPill';
import { CenterModal } from '../ui/CenterModal';
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

const statusTone = (s: string): CenterPillTone =>
  s === 'SENT' ? 'green' : s === 'SCHEDULED' ? 'amber' : s === 'CANCELLED' ? 'red' : 'slate';

export function CenterBroadcastPage() {
  const { t, lang } = useT();
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const { data: summary } = useApi<BroadcastSummary>(() => api.get<BroadcastSummary>('/center/account/broadcast/summary'), []);
  const { data: broadcasts, loading, error, reload } = useApi<BroadcastRow[]>(() => api.get<BroadcastRow[]>('/center/account/broadcast'), []);

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
      await api.delete(`/center/account/broadcast/${id}`);
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
      <CenterPageHeader
        eyebrow={t('centerDashboard')}
        title={t('moduleBroadcast')}
        description={t('broadcastSub')}
      >
        <button type="button" className="mj-btn mj-btn--primary" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" /> {t('addBroadcast')}
        </button>
      </CenterPageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CenterStatCard value={summary?.total ?? '—'} label={t('broadcastTotal')} />
        <CenterStatCard value={summary?.sent ?? '—'} label={t('broadcastSent')} />
        <CenterStatCard value={summary?.scheduled ?? '—'} label={t('broadcastScheduled')} />
        <CenterStatCard value={summary?.recipients ?? '—'} label={t('broadcastRecipients')} />
      </div>

      <div className="mj-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <h2 className="mj-title">{t('listBroadcasts')}</h2>
          <button type="button" className="mj-btn mj-btn--soft mj-btn--sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" /> {t('addBroadcast')}
          </button>
        </div>
        <div className="mj-divider" />

        {loading && <div className="p-8"><PencilLoader label={t('loading')} /></div>}
        {error && <div className="m-4 rounded-lg bg-[color:var(--mj-danger-soft)] p-4 text-[color:var(--mj-danger)]">{error}</div>}

        {!loading && broadcasts && broadcasts.length > 0 ? (
          <div className="divide-y divide-[color:var(--mj-border-soft)]">
            {broadcasts.map((b) => (
              <div key={b.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{b.subject}</p>
                    <CenterPill tone={statusTone(b.status)}>{b.status?.replace(/_/g, ' ')}</CenterPill>
                    <CenterPill tone="blue">{b.audience}</CenterPill>
                    <CenterPill tone="slate">{b.channel}</CenterPill>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-[color:var(--mj-muted)]">{b.message}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--mj-muted-2)]">
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /><strong className="text-[color:var(--mj-ink-strong)]">{b.recipientCount}</strong>{t('recipientsCount')}</span>
                    <span className="flex items-center gap-1.5"><CheckCheck className="h-3.5 w-3.5 text-[color:var(--mj-success)]" /><strong className="text-[color:var(--mj-ink-strong)]">{b.readCount}</strong>{t('read')}</span>
                    <span className="flex items-center gap-1.5"><Send className="h-3.5 w-3.5" />{b.status === 'SENT' ? fmtDate(b.sentAt) : fmtDate(b.scheduledFor)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {b.status === 'SCHEDULED' && (
                    <button type="button" className="mj-btn mj-btn--soft mj-btn--sm" onClick={() => act(`/center/account/broadcast/${b.id}/send`, t('broadcastSentToast'))}>
                      <Send className="h-4 w-4" /> {t('broadcastSendNow')}
                    </button>
                  )}
                  {b.status !== 'SENT' && b.status !== 'CANCELLED' && (
                    <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => act(`/center/account/broadcast/${b.id}/cancel`, t('broadcastCancelledToast'))}>
                      <XCircle className="h-4 w-4" /> {t('broadcastCancel')}
                    </button>
                  )}
                  <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => remove(b.id)} aria-label={t('delete')}>
                    <Trash2 className="h-4 w-4 text-[color:var(--mj-danger)]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="mj-empty">
              <Radio className="mj-empty-icon" />
              <p className="text-sm">{t('noBroadcasts')}</p>
            </div>
          )
        )}
      </div>

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
      await api.post('/center/account/broadcast', form);
      toast.success(t('broadcastCreatedToast'));
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
      title={t('addBroadcast')}
      size="md"
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={submit} disabled={saving}>
            <Send className="h-4 w-4" /> {saving ? t('loading') : t('send')}
          </button>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="mj-field">
            <label className="mj-label">{t('broadcastAudience')}</label>
            <select className="mj-select" value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}>
              {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('broadcastChannel')}</label>
            <select className="mj-select" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}>
              {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('broadcastSubject')}</label>
          <input className="mj-input" required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('broadcastMessage')}</label>
          <textarea className="mj-textarea" required rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
        </div>
        <label className="mb-3 flex items-center gap-2 text-sm text-[color:var(--mj-ink)]">
          <input type="checkbox" className="accent-[color:var(--mj-accent)]" checked={form.sendNow} onChange={(e) => setForm((f) => ({ ...f, sendNow: e.target.checked }))} />
          {t('sendNow')}
        </label>
        {!form.sendNow && (
          <div className="mj-field">
            <label className="mj-label">{t('scheduleDate')}</label>
            <input className="mj-input" type="datetime-local" required value={form.scheduledFor} onChange={(e) => setForm((f) => ({ ...f, scheduledFor: e.target.value }))} />
          </div>
        )}
      </form>
    </CenterModal>
  );
}

export default CenterBroadcastPage;

'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Radio, Send, XCircle, Copy } from 'lucide-react';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill, type CenterPillTone } from '../ui/CenterPill';
import { CenterSearchInput } from '../ui/CenterSearchInput';
import { CenterModal } from '../ui/CenterModal';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey, type TranslateParams } from '../../../i18n';

const BROADCAST_API = '/center/account/broadcast';

interface BroadcastSummary {
  total: number;
  sent: number;
  scheduled: number;
  recipientsToday: number;
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
  groupName: string | null;
  createdAt: string;
}

interface GroupOption {
  id: string;
  name: string;
  subject: string | null;
}

const AUDIENCE_LABEL_KEY: Record<string, DictKey> = {
  EMPLOYEES: 'audienceEmployees',
  TEACHERS: 'audienceTeachers',
  STUDENTS: 'audienceStudents',
  PARENTS: 'audienceParents',
  GROUP: 'audienceGroup',
};

const STATUS_LABEL_KEY: Record<string, DictKey> = {
  SENT: 'broadcastStatusSent',
  SCHEDULED: 'broadcastStatusScheduled',
  DRAFT: 'broadcastStatusDraft',
  CANCELLED: 'broadcastStatusCancelled',
};

const FILTER_STATUSES: { value: string; labelKey: DictKey }[] = [
  { value: '', labelKey: 'broadcastAllStatuses' },
  { value: 'SENT', labelKey: 'broadcastStatusSent' },
  { value: 'SCHEDULED', labelKey: 'broadcastStatusScheduled' },
  { value: 'DRAFT', labelKey: 'broadcastStatusDraft' },
  { value: 'CANCELLED', labelKey: 'broadcastStatusCancelled' },
];

const CREATE_AUDIENCES: { value: string; labelKey: DictKey }[] = [
  { value: 'EMPLOYEES', labelKey: 'audienceEmployees' },
  { value: 'TEACHERS', labelKey: 'audienceTeachers' },
  { value: 'STUDENTS', labelKey: 'audienceStudents' },
  { value: 'PARENTS', labelKey: 'audienceParents' },
  { value: 'GROUP', labelKey: 'audienceGroup' },
];

const SCHEDULE_OPTIONS: { value: 'now' | 'schedule'; labelKey: DictKey }[] = [
  { value: 'now', labelKey: 'sendNow' },
  { value: 'schedule', labelKey: 'broadcastScheduleOption' },
];

const statusTone = (s: string): CenterPillTone =>
  s === 'SENT' ? 'green' : s === 'SCHEDULED' ? 'amber' : s === 'CANCELLED' ? 'red' : 'slate';

type TFunc = (k: DictKey, params?: TranslateParams) => string;

function audienceLine(t: TFunc, b: BroadcastRow): string {
  const audience =
    b.audience === 'GROUP'
      ? t('broadcastAudienceGroup', { group: b.groupName ?? '—' })
      : t(AUDIENCE_LABEL_KEY[b.audience] ?? 'audienceGroup');
  return `${audience} · ${t('broadcastInApp')}`;
}

function smartTime(t: TFunc, lang: string, iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (d.toDateString() === now.toDateString()) return `${t('todayLabel')} ${time}`;
  const date = d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
  return `${date} ${time}`;
}

function broadcastTimeValue(t: TFunc, lang: string, b: BroadcastRow): string {
  if (b.status === 'DRAFT') return t('broadcastStatusDraft');
  if (b.status === 'SENT') return smartTime(t, lang, b.sentAt);
  return smartTime(t, lang, b.scheduledFor);
}

function broadcastReadValue(b: BroadcastRow): string {
  if (b.status !== 'SENT' || b.recipientCount <= 0) return '—';
  return `${Math.round((b.readCount / b.recipientCount) * 100)}%`;
}

export function CenterBroadcastPage() {
  const { t, lang } = useT();
  const [showNew, setShowNew] = useState(false);
  const { data: summary, reload: reloadSummary } = useApi<BroadcastSummary>(() => api.get(`${BROADCAST_API}/summary`), []);
  const list = useBroadcastList();

  return (
    <div className="space-y-6">
      <CenterPageHeader
        eyebrow={t('broadcastEyebrow')}
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
        <CenterStatCard value={summary?.recipientsToday ?? '—'} label={t('broadcastRecipientsToday')} />
      </div>

      <div className="mj-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[color:var(--mj-border-soft)] p-4 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label className="mj-label">{t('broadcastSearchLabel')}</label>
            <CenterSearchInput
              value={list.search}
              placeholder={t('broadcastSearchPlaceholder')}
              aria-label={t('broadcastSearchPlaceholder')}
              onChange={list.setSearch}
            />
          </div>
          <div className="lg:w-56">
            <label className="mj-label">{t('broadcastFilterLabel')}</label>
            <select className="mj-select" value={list.status} onChange={(e) => list.setStatus(e.target.value)}>
              {FILTER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {list.loading && <div className="p-8"><PencilLoader label={t('loading')} /></div>}
        {list.error && (
          <div className="m-4 rounded-lg bg-[color:var(--mj-danger-soft)] p-4 text-[color:var(--mj-danger)]">{list.error}</div>
        )}

        {!list.loading && list.data && list.data.length > 0 && (
          <div className="divide-y divide-[color:var(--mj-border-soft)]">
            {list.data.map((b) => (
              <BroadcastCard key={b.id} t={t} lang={lang} broadcast={b} onChanged={list.reload} />
            ))}
          </div>
        )}

        {!list.loading && list.data?.length === 0 && (
          <div className="mj-empty">
            <Radio className="mj-empty-icon" />
            <p className="text-sm">{t('noBroadcasts')}</p>
          </div>
        )}
      </div>

      {showNew && (
        <NewBroadcastModal
          t={t}
          onClose={() => setShowNew(false)}
          onDone={() => {
            setShowNew(false);
            list.reload();
            reloadSummary();
          }}
        />
      )}
    </div>
  );
}

function useBroadcastList() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const debounceRef = useRef<number | undefined>(undefined);

  const handleSearch = (value: string) => {
    setSearch(value);
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setDebounced(value), 300);
  };

  const { data, loading, error, reload } = useApi<BroadcastRow[]>(
    () =>
      api.get<BroadcastRow[]>(BROADCAST_API, {
        ...(debounced ? { search: debounced } : {}),
        ...(status ? { status } : {}),
      }),
    [debounced, status],
  );

  useEffect(() => () => window.clearTimeout(debounceRef.current), []);

  return { data: data ?? [], loading, error, reload, search, setSearch: handleSearch, status, setStatus };
}

function BroadcastCard({
  t,
  lang,
  broadcast: b,
  onChanged,
}: {
  t: TFunc;
  lang: string;
  broadcast: BroadcastRow;
  onChanged: () => void;
}) {
  const toast = useToast();

  const act = async (url: string, msg: string) => {
    try {
      await api.post(url);
      toast.success(msg);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{b.subject}</p>
        <p className="mt-1 line-clamp-2 text-sm text-[color:var(--mj-muted)]">{b.message}</p>
        <p className="mt-1.5 text-xs text-[color:var(--mj-muted-2)]">{audienceLine(t, b)}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <dt className="text-xs text-[color:var(--mj-muted-2)]">{t('broadcastRecipientsLabel')}</dt>
          <dd className="mt-0.5 text-sm font-bold text-[color:var(--mj-ink-strong)]">{b.recipientCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-[color:var(--mj-muted-2)]">{t('broadcastTimeLabel')}</dt>
          <dd className="mt-0.5 text-sm font-bold text-[color:var(--mj-ink-strong)]">
            {broadcastTimeValue(t, lang, b)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[color:var(--mj-muted-2)]">{t('broadcastReadLabel')}</dt>
          <dd className="mt-0.5 text-sm font-bold text-[color:var(--mj-ink-strong)]">{broadcastReadValue(b)}</dd>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <CenterPill tone={statusTone(b.status)}>{t(STATUS_LABEL_KEY[b.status] ?? 'broadcastStatusScheduled')}</CenterPill>
        <div className="flex flex-wrap items-center gap-2">
          {b.status === 'SCHEDULED' && (
            <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => act(`${BROADCAST_API}/${b.id}/cancel`, t('broadcastCancelledToast'))}>
              <XCircle className="h-4 w-4" /> {t('broadcastCancel')}
            </button>
          )}
          <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => act(`${BROADCAST_API}/${b.id}/duplicate`, t('broadcastDuplicatedToast'))}>
            <Copy className="h-4 w-4" /> {t('broadcastDuplicate')}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewBroadcastModal({ t, onClose, onDone }: { t: TFunc; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    audience: 'EMPLOYEES',
    groupId: '',
    subject: '',
    message: '',
    schedule: 'now' as 'now' | 'schedule',
    scheduledFor: '',
  });
  const { data: groups } = useApi<GroupOption[]>(() => api.get('/center/groups'), []);
  const groupOptions = (groups ?? []).map((g) => ({
    id: g.id,
    label: g.subject ? `${g.subject} · ${g.name}` : g.name,
  }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error(t('requiredFields'));
      return;
    }
    if (form.audience === 'GROUP' && !form.groupId) {
      toast.error(t('requiredFields'));
      return;
    }
    if (form.schedule === 'schedule' && !form.scheduledFor) {
      toast.error(t('requiredFields'));
      return;
    }
    setSaving(true);
    try {
      await api.post(BROADCAST_API, {
        audience: form.audience,
        subject: form.subject.trim(),
        message: form.message.trim(),
        ...(form.audience === 'GROUP' ? { groupId: form.groupId } : {}),
        ...(form.schedule === 'schedule'
          ? { scheduledFor: form.scheduledFor, sendNow: false }
          : { sendNow: true }),
      });
      toast.success(t('broadcastCreatedToast'));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const submitLabel = form.schedule === 'schedule' ? t('broadcastScheduleOption') : t('send');

  return (
    <CenterModal
      open
      onClose={onClose}
      title={t('broadcastNewTitle')}
      description={t('broadcastCreateHint')}
      size="md"
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={submit} disabled={saving}>
            <Send className="h-4 w-4" /> {saving ? t('loading') : submitLabel}
          </button>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="mj-field">
            <label className="mj-label">{t('broadcastAudienceField')}</label>
            <select
              className="mj-select"
              value={form.audience}
              onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value, groupId: '' }))}
            >
              {CREATE_AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {t(a.labelKey)}
                </option>
              ))}
            </select>
          </div>
          {form.audience === 'GROUP' && (
            <div className="mj-field">
              <label className="mj-label">{t('broadcastGroupField')}</label>
              <select
                className="mj-select"
                value={form.groupId}
                onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}
              >
                <option value="">{t('broadcastSelectGroup')}</option>
                {groupOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mj-field">
            <label className="mj-label">{t('broadcastSubjectField')}</label>
            <input
              type="text"
              className="mj-input"
              required
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('broadcastSendTimeField')}</label>
            <select
              className="mj-select"
              value={form.schedule}
              onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value as 'now' | 'schedule' }))}
            >
              {SCHEDULE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.labelKey)}
                </option>
              ))}
            </select>
          </div>
          {form.schedule === 'schedule' && (
            <div className="mj-field">
              <label className="mj-label">{t('broadcastScheduledForField')}</label>
              <input
                type="datetime-local"
                className="mj-input"
                required
                value={form.scheduledFor}
                onChange={(e) => setForm((f) => ({ ...f, scheduledFor: e.target.value }))}
              />
            </div>
          )}
          <div className="mj-field sm:col-span-2">
            <label className="mj-label">{t('broadcastMessage')}</label>
            <textarea
              className="mj-textarea"
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            />
          </div>
        </div>
        <p className="mt-4 text-xs text-[color:var(--mj-muted-2)]">{t('broadcastCreateFooter')}</p>
      </form>
    </CenterModal>
  );
}

export default CenterBroadcastPage;
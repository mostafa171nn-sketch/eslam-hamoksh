'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Search } from 'lucide-react';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill } from '../ui/CenterPill';
import { CenterSearchInput } from '../ui/CenterSearchInput';
import { CenterModal } from '../ui/CenterModal';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';
import { dayName, formatTime, formatCurrency } from '../../../lib/format';

interface Agreement {
  type: 'session' | 'monthly';
  amount: number;
}

interface GroupRow {
  id: string;
  name: string;
  slug: string | null;
  stage: string | null;
  status: string;
  teacherId: string | null;
  teacher: string | null;
  room: string | null;
  roomId: string | null;
  branch: string | null;
  subject: string | null;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  capacity: number | null;
  studentCount: number;
  agreement: Agreement;
}

interface GroupSummary {
  active: number;
  needsRoom: number;
  students: number;
  total: number;
}

interface FormData {
  teachers: { id: string; name: string }[];
  rooms: { id: string; name: string }[];
}

export default function CenterGroupsPage() {
  const { t, lang } = useT();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [showLink, setShowLink] = useState(false);

  const { data: summary } = useApi<GroupSummary>(() => api.get<GroupSummary>('/center/groups/summary'), []);
  const { data: groups, loading, error, reload } = useApi<GroupRow[]>(
    () => api.get<GroupRow[]>('/center/groups', {
      search: debounced || undefined,
      teacherId: teacherId || undefined,
      roomId: roomId || undefined,
    }),
    [debounced, teacherId, roomId]
  );
  const { data: formData } = useApi<FormData>(() => api.get<FormData>('/center/groups/form-data'), []);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const pillFor = (s: string) => {
    if (s === 'ACTIVE') return 'green' as const;
    if (s === 'NEEDS_ROOM') return 'amber' as const;
    return 'slate' as const;
  };

  const pillLabel = (s: string) => {
    if (s === 'ACTIVE') return t('groupActive');
    if (s === 'NEEDS_ROOM') return t('groupNeedsAction');
    return t('groupPaused');
  };

  const scheduleLine = (g: GroupRow) => {
    const time = `${formatTime(g.startTime)}–${formatTime(g.endTime)}`;
    if (g.dayOfWeek === null || g.dayOfWeek === undefined) return '—';
    return `${dayName(g.dayOfWeek, lang)} · ${time}`;
  };

  const agreementLine = (g: GroupRow) => {
    const amount = formatCurrency(g.agreement.amount, lang);
    return g.agreement.type === 'monthly'
      ? `${t('agreementMonthly')} · ${amount}`
      : `${t('agreementSession')} · ${amount}`;
  };

  return (
    <div className="space-y-5">
      <CenterPageHeader
        eyebrow={t('groupsEyebrow')}
        title={t('groupsTitle')}
        description={t('groupsSub')}
      >
        <button type="button" className="mj-btn mj-btn--primary" onClick={() => setShowLink(true)}>
          <Link2 className="h-4 w-4" />
          {t('linkGroupToBooking')}
        </button>
      </CenterPageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <CenterStatCard value={summary?.active ?? '—'} label={t('groupsStatActive')} />
        <CenterStatCard value={summary?.needsRoom ?? '—'} label={t('groupsStatNeedsRoom')} />
        <CenterStatCard value={summary?.students ?? '—'} label={t('groupsStatStudents')} />
      </div>

      <div className="mj-card mj-card--padding">
        <div className="mj-toolbar">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <CenterSearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('searchGroupsPlaceholder')}
              aria-label={t('searchGroupsPlaceholder')}
            />
          </div>
          <div className="min-w-0 sm:w-44">
            <select
              className="mj-select"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              aria-label={t('teacherField')}
            >
              <option value="">{t('allTeachers')}</option>
              {formData?.teachers.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0 sm:w-40">
            <select
              className="mj-select"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              aria-label={t('groupRoom')}
            >
              <option value="">{t('allRooms')}</option>
              {formData?.rooms.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <PencilLoader label={t('loading')} />}
      {error && <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

      {!loading && groups && groups.length > 0 && (
        <div className="mj-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="mj-table">
              <thead>
                <tr>
                  <th>{t('groupColumn')}</th>
                  <th>{t('teacherColumn')}</th>
                  <th>{t('groupStudents')}</th>
                  <th>{t('groupRoomSchedule')}</th>
                  <th>{t('agreement')}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr
                    key={g.id}
                    className="is-clickable"
                    onClick={() => router.push(`/center/groups/${g.slug ?? g.id}`)}
                  >
                    <td>
                      <span className="block font-bold text-[color:var(--mj-ink-strong)]">{g.name}</span>
                      {g.stage && (
                        <span className="mt-0.5 block text-xs text-[color:var(--mj-muted)]">{g.stage}</span>
                      )}
                    </td>
                    <td>
                      <span className="block font-medium text-[color:var(--mj-ink-strong)]">{g.teacher || '—'}</span>
                      {g.subject && (
                        <span className="mt-0.5 block text-xs text-[color:var(--mj-muted)]">{g.subject}</span>
                      )}
                    </td>
                    <td>
                      <span className="font-semibold text-[color:var(--mj-ink-strong)]">
                        {t('groupCapacityFraction', { count: g.studentCount, capacity: g.capacity ?? '∞' })}
                      </span>
                    </td>
                    <td>
                      <span className="block font-medium text-[color:var(--mj-ink-strong)]">
                        {g.room || t('groupNeedsRoom')}
                      </span>
                      <span className="mt-0.5 block text-xs text-[color:var(--mj-muted)]">{scheduleLine(g)}</span>
                    </td>
                    <td>
                      <span className="block font-semibold text-[color:var(--mj-ink-strong)]">{agreementLine(g)}</span>
                      <span className="mt-1 block">
                        <CenterPill tone={pillFor(g.status)}>{pillLabel(g.status)}</CenterPill>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && groups?.length === 0 && (
        <div className="mj-empty">
          <Search className="mj-empty-icon" />
          <p className="text-sm text-[color:var(--mj-ink-strong)]">{t('noGroups')}</p>
        </div>
      )}

      {showLink && formData && groups && (
        <LinkGroupModal
          groups={groups}
          rooms={formData.rooms}
          onClose={() => setShowLink(false)}
          onSuccess={() => { setShowLink(false); reload(); }}
        />
      )}
    </div>
  );
}

function LinkGroupModal({
  groups,
  rooms,
  onClose,
  onSuccess,
}: {
  groups: GroupRow[];
  rooms: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    groupId: '',
    roomId: '',
    dayOfWeek: '',
    startTime: '16:00',
    endTime: '17:30',
  });

  const days = Array.from({ length: 7 }, (_, i) => ({
    value: String(i),
    label: dayName(i),
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.groupId) { toast.error(t('selectGroupPlaceholder')); return; }
    setSaving(true);
    try {
      await api.put(`/center/groups/${form.groupId}`, {
        roomId: form.roomId || null,
        dayOfWeek: form.dayOfWeek !== '' ? Number(form.dayOfWeek) : null,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        status: form.roomId ? 'ACTIVE' : 'NEEDS_ROOM',
      });
      toast.success(t('groupLinkedToast'));
      onSuccess();
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
      title={t('linkGroupDialogTitle')}
      description={t('linkGroupDialogDesc')}
      size="md"
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={handleSubmit} disabled={saving}>
            {t('saveLink')}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mj-field">
          <label className="mj-label">{t('groupColumn')}</label>
          <select className="mj-select" value={form.groupId} onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}>
            <option value="">{t('selectGroupPlaceholder')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}{g.teacher ? ` · ${g.teacher}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('groupRoom')}</label>
          <select className="mj-select" value={form.roomId} onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}>
            <option value="">{t('groupNeedsRoom')}</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('groupDaysMeeting')}</label>
          <select className="mj-select" value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))}>
            <option value="">{t('selectBranch')}</option>
            {days.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="mj-field">
            <label className="mj-label">{t('groupStartTime')}</label>
            <input type="time" className="mj-input" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('groupEndTime')}</label>
            <input type="time" className="mj-input" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
          </div>
        </div>
      </form>
    </CenterModal>
  );
}
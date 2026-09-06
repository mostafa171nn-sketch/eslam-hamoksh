'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
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

const DAY_NAMES: Record<number, string> = {
  0: 'الأحد', 1: 'الاثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت',
};

interface GroupRow {
  id: string;
  name: string;
  slug: string | null;
  stage: string | null;
  status: string;
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
  branches: { id: string; name: string }[];
  students: { id: string; name: string }[];
}

export function CenterGroupsPage() {
  const { t } = useT();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [debounced, setDebounced] = useState('');

  const { data: summary } = useApi<GroupSummary>(() => api.get<GroupSummary>('/center/groups/summary'), []);
  const { data: groups, loading, error, reload } = useApi<GroupRow[]>(
    () => api.get<GroupRow[]>('/center/groups', statusFilter ? { search: debounced || undefined, status: statusFilter } : { search: debounced || undefined }),
    [debounced, statusFilter]
  );
  const { data: formData } = useApi<FormData>(() => api.get<FormData>('/center/groups/form-data'), []);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const [showAdd, setShowAdd] = useState(false);

  const dayLabel = (d: number | null) => (d == null ? '—' : DAY_NAMES[d]);

  const timeRange = (s: string | null, e: string | null) => {
    if (!s && !e) return '—';
    return `${s ?? ''}–${e ?? ''}`;
  };

  const pillFor = (s: string) => {
    if (s === 'ACTIVE') return 'green' as const;
    if (s === 'NEEDS_ROOM') return 'amber' as const;
    return 'slate' as const;
  };

  return (
    <div className="space-y-5">
      <CenterPageHeader
        title={t('groupsTitle')}
        description={t('groupsSub')}
      >
        <button type="button" className="mj-btn mj-btn--primary" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          {t('addGroup')}
        </button>
      </CenterPageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <CenterStatCard value={summary?.active ?? '—'} label={t('groupActive')} />
        <CenterStatCard value={summary?.needsRoom ?? '—'} label={t('groupNeedsRoom')} />
        <CenterStatCard value={summary?.students ?? '—'} label={t('groupStudents')} />
      </div>

      <div className="mj-card mj-card--padding">
        <div className="mj-toolbar">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <CenterSearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('searchPlaceholder')}
            />
          </div>
          <select
            className="mj-select sm:w-48"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t('allStatuses')}</option>
            <option value="ACTIVE">{t('groupActive')}</option>
            <option value="NEEDS_ROOM">{t('groupNeedsRoom')}</option>
            <option value="INACTIVE">{t('groupInactive')}</option>
          </select>
        </div>
      </div>

      {loading && <PencilLoader label={t('loading')} />}
      {error && <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>}

      {!loading && groups && groups.length > 0 && (
        <div className="mj-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="mj-table">
              <thead>
                <tr>
                  <th>{t('groupGeneric')}</th>
                  <th>{t('teacher')}</th>
                  <th>{t('groupStudents')}</th>
                  <th>{t('groupRoom')}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <Link
                        href={`/center/groups/${g.slug ?? g.id}`}
                        className="block"
                      >
                        <span className="font-bold text-[color:var(--mj-ink-strong)]">{g.name}</span>
                        {g.stage && (
                          <span className="mt-0.5 block text-xs text-[color:var(--mj-muted)]">{g.stage}</span>
                        )}
                      </Link>
                    </td>
                    <td>
                      <span className="font-medium text-[color:var(--mj-ink-strong)]">{g.teacher || '—'}</span>
                      {g.subject && (
                        <span className="mt-0.5 block text-xs text-[color:var(--mj-muted)]">{g.subject}</span>
                      )}
                    </td>
                    <td>
                      <span className="font-semibold text-[color:var(--mj-ink-strong)]">
                        {g.studentCount} / {g.capacity ?? '∞'}
                      </span>
                    </td>
                    <td>
                      <span className="font-medium text-[color:var(--mj-ink-strong)]">{g.room || t('groupNeedsRoom')}</span>
                      <span className="mt-0.5 block text-xs text-[color:var(--mj-muted)]">
                        {dayLabel(g.dayOfWeek)} · {timeRange(g.startTime, g.endTime)}
                      </span>
                    </td>
                    <td>
                      <CenterPill tone={pillFor(g.status)}>
                        {g.status === 'ACTIVE' ? t('groupActive') : g.status === 'NEEDS_ROOM' ? t('groupNeedsRoom') : t('groupInactive')}
                      </CenterPill>
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
          <p className="text-sm">{t('noClassrooms')}</p>
        </div>
      )}

      {showAdd && formData && (
        <AddGroupModal
          formData={formData}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); reload(); }}
        />
      )}
    </div>
  );
}

const WEEKDAYS = Object.entries(DAY_NAMES).map(([value, label]) => ({ value, label }));
const STAGES = [
  { value: 'ابتدائي', label: 'ابتدائي' },
  { value: 'اعدادي', label: 'اعدادي' },
  { value: 'ثانوي', label: 'ثانوي' },
];

function AddGroupModal({ formData, onClose, onSuccess }: { formData: FormData; onClose: () => void; onSuccess: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', stage: '', teacherId: '', roomId: '', branchId: '',
    capacity: '', dayOfWeek: '', startTime: '', endTime: '', status: 'ACTIVE', studentIds: [] as string[],
  });

  const toggleStudent = (id: string) => {
    setForm((f) => ({
      ...f,
      studentIds: f.studentIds.includes(id) ? f.studentIds.filter((s) => s !== id) : [...f.studentIds, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error(t('requiredFields')); return; }
    setSaving(true);
    try {
      await api.post('/center/groups', form);
      toast.success(t('groupCreatedToast'));
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
      title={t('addGroup')}
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={handleSubmit} disabled={saving}>{t('save')}</button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-0">
        <div className="grid grid-cols-1 gap-x-4 gap-y-0 sm:grid-cols-2">
          <div className="mj-field">
            <label className="mj-label">{t('groupName')}</label>
            <input type="text" className="mj-input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('groupStage')}</label>
            <select className="mj-select" value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}>
              <option value="">{t('selectBranch')}</option>
              {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('groupTeacher')}</label>
            <select className="mj-select" value={form.teacherId} onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}>
              <option value="">{t('selectBranch')}</option>
              {formData.teachers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('groupRoom')}</label>
            <select className="mj-select" value={form.roomId} onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}>
              <option value="">{t('selectBranch')}</option>
              {formData.rooms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('groupBranch')}</label>
            <select className="mj-select" value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}>
              <option value="">{t('selectBranch')}</option>
              {formData.branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('groupCapacity')}</label>
            <input type="number" className="mj-input" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('groupDay')}</label>
            <select className="mj-select" value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))}>
              <option value="">{t('selectBranch')}</option>
              {WEEKDAYS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="mj-field">
              <label className="mj-label">{t('groupStartTime')}</label>
              <input type="time" className="mj-input" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div className="mj-field">
              <label className="mj-label">{t('groupEndTime')}</label>
              <input type="time" className="mj-input" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="mj-field">
          <label className="mj-label">{t('groupStudents')}</label>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-[color:var(--mj-border)] p-2">
            {formData.students.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[color:var(--mj-wash)]">
                <input
                  type="checkbox"
                  className="accent-[color:var(--mj-accent)]"
                  checked={form.studentIds.includes(s.id)}
                  onChange={() => toggleStudent(s.id)}
                />
                {s.name}
              </label>
            ))}
          </div>
        </div>
      </form>
    </CenterModal>
  );
}

export default CenterGroupsPage;

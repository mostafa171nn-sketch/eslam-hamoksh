'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays, Users, Plus, Trash2, CreditCard, UserPlus,
} from 'lucide-react';
import { PageBackButton } from '../../../components/layout/PageBackButton';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { statusTone } from '../../../components/ui/Badge';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill } from '../ui/CenterPill';
import { CenterModal } from '../ui/CenterModal';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';

const DAY_NAMES: Record<number, string> = {
  0: 'الأحد', 1: 'الاثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت',
};

interface GroupDetail {
  id: string;
  name: string;
  slug: string | null;
  stage: string | null;
  status: string;
  capacity: number | null;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  teacher: string | null;
  room: string | null;
  branch: string | null;
  subject: string | null;
  students: {
    id: string;
    name: string;
    enrolledAt: string;
    status: string;
    totalPaid: number;
    financialStatus: string;
    lastAttendance: string | null;
  }[];
  bookings: { id: string; teacher: string; room: string; dayOfWeek: number | null; startTime: string; endTime: string; status: string }[];
}

interface FormData {
  students: { id: string; name: string }[];
}

export default function CenterGroupDetailPage() {
  const { t, lang } = useT();
  const params = useParams<{ slug: string }>();
  const toast = useToast();

  const { data: group, loading, error, reload } = useApi<GroupDetail>(
    () => api.get<GroupDetail>(`/center/groups/${params.slug}`),
    [params.slug]
  );
  const { data: formData } = useApi<FormData>(() => api.get<FormData>('/center/groups/form-data'), []);

  const [showAddStudents, setShowAddStudents] = useState(false);
  const [tab, setTab] = useState('students');

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>;
  if (!group) return null;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const occupancy = group.capacity && group.capacity > 0 ? Math.min(Math.round((group.students.length / group.capacity) * 100), 100) : 0;

  const removeStudent = async (studentId: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api.delete(`/center/groups/${group.id}/students/${studentId}`);
      toast.success(t('groupRemovedToast'));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const groupPill = (status: string) => {
    if (status === 'ACTIVE') return 'green' as const;
    if (status === 'NEEDS_ROOM') return 'amber' as const;
    return 'red' as const;
  };

  return (
    <div className="space-y-5">
      <PageBackButton />

      <CenterPageHeader
        eyebrow={t('groupGeneric')}
        title={group.name}
        description={group.subject || group.stage || t('groupGeneric')}
      >
        <CenterPill tone={groupPill(group.status)}>
          {group.status === 'ACTIVE' ? t('groupActive') : group.status === 'NEEDS_ROOM' ? t('groupNeedsRoom') : t('groupInactive')}
        </CenterPill>
      </CenterPageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CenterStatCard label={t('groupTeacher')} value={group.teacher || '—'} />
        <CenterStatCard label={t('groupRoom')} value={group.room || t('groupNeedsRoom')} />
        <CenterStatCard
          label={DAY_NAMES[group.dayOfWeek ?? -1] ?? t('selectBranch')}
          value={`${group.startTime ?? ''} — ${group.endTime ?? ''}`}
        />
        <CenterStatCard
          label={t('groupStudents')}
          value={`${group.students.length} / ${group.capacity ?? '∞'}`}
          sub={`(${occupancy}%)`}
        />
      </div>

      <div className="mj-tabs">
        <button
          type="button"
          className={`mj-tab ${tab === 'students' ? 'mj-tab--active' : ''}`}
          onClick={() => setTab('students')}
        >
          {t('groupTypeStudent')}
          <span className="mj-tab-count">{group.students.length}</span>
        </button>
        <button
          type="button"
          className={`mj-tab ${tab === 'bookings' ? 'mj-tab--active' : ''}`}
          onClick={() => setTab('bookings')}
        >
          {t('groupTypeBookings')}
          <span className="mj-tab-count">{group.bookings.length}</span>
        </button>
      </div>

      {tab === 'bookings' ? (
        <div className="mj-card overflow-hidden">
          {group.bookings.length === 0 ? (
            <div className="mj-empty">
              <CalendarDays className="mj-empty-icon" />
              <p className="text-sm">{t('noClassrooms')}</p>
            </div>
          ) : (
            <div className="divide-y divide-[color:var(--mj-border-soft)]">
              {group.bookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-[color:var(--mj-ink-strong)]">
                      {b.room || t('groupNeedsRoom')}
                    </p>
                    <p className="text-xs text-[color:var(--mj-muted)]">
                      {DAY_NAMES[b.dayOfWeek ?? -1] ?? t('selectBranch')} {b.startTime} — {b.endTime}
                    </p>
                  </div>
                  <CenterPill tone={statusTone(b.status) as 'green' | 'amber' | 'red' | 'blue' | 'slate'}>{b.status ?? '—'}</CenterPill>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mj-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-5 py-3">
            <p className="text-sm text-[color:var(--mj-muted)]">{t('groupStudents')}</p>
            <button type="button" className="mj-btn mj-btn--primary mj-btn--sm" onClick={() => setShowAddStudents(true)}>
              <UserPlus className="h-4 w-4" />
              {t('groupAddStudents')}
            </button>
          </div>
          {group.students.length === 0 ? (
            <div className="mj-empty">
              <Users className="mj-empty-icon" />
              <p className="text-sm">{t('noClassrooms')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="mj-table">
                <thead>
                  <tr>
                    <th>{t('fullName')}</th>
                    <th>{t('enrolledAt')}</th>
                    <th>{t('financialStatus')}</th>
                    <th>{t('lastAttendance')}</th>
                    <th className="text-end"></th>
                  </tr>
                </thead>
                <tbody>
                  {group.students.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--mj-accent-soft)] text-xs font-semibold text-[color:var(--mj-accent)]">
                            {s.name.charAt(0)}
                          </span>
                          <Link href={`/center/students/${s.id}`} className="font-medium text-[color:var(--mj-link)] hover:underline">
                            {s.name}
                          </Link>
                        </div>
                      </td>
                      <td>{fmtDate(s.enrolledAt)}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[color:var(--mj-success-soft)] text-[color:var(--mj-success)]">
                            <CreditCard className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-xs font-medium text-[color:var(--mj-ink-strong)]">
                            {s.totalPaid > 0 ? `${(s.totalPaid / 100).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} EGP` : t('financialNotPaid')}
                          </span>
                        </div>
                      </td>
                      <td>{s.lastAttendance ? fmtDate(s.lastAttendance) : t('notAttendedYet')}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="mj-btn mj-btn--ghost mj-btn--sm"
                          onClick={() => removeStudent(s.id)}
                          aria-label={t('unsubscribeStudent')}
                        >
                          <Trash2 className="h-4 w-4 text-[color:var(--mj-danger)]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAddStudents && formData && (
        <AddStudentsModal
          groupId={group.id}
          existing={new Set(group.students.map((s) => s.id))}
          allStudents={formData.students}
          onClose={() => setShowAddStudents(false)}
          onSuccess={() => { setShowAddStudents(false); reload(); }}
        />
      )}
    </div>
  );
}

function AddStudentsModal({
  groupId, existing, allStudents, onClose, onSuccess,
}: {
  groupId: string;
  existing: Set<string>;
  allStudents: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const available = allStudents.filter((s) => !existing.has(s.id));

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.length === 0) return;
    setSaving(true);
    try {
      await api.post(`/center/groups/${groupId}/students`, { studentIds: selected });
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
      title={t('groupAddStudents')}
      size="md"
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={submit} disabled={saving || selected.length === 0}>{t('save')}</button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <p className="flex items-center gap-1.5 text-sm text-[color:var(--mj-muted)]">
          <Plus className="h-4 w-4" />
          {t('groupStudents')}: {selected.length}
        </p>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-[color:var(--mj-border)] p-2">
          {available.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[color:var(--mj-wash)]">
              <input
                type="checkbox"
                className="accent-[color:var(--mj-accent)]"
                checked={selected.includes(s.id)}
                onChange={() => toggle(s.id)}
              />
              {s.name}
            </label>
          ))}
        </div>
      </form>
    </CenterModal>
  );
}

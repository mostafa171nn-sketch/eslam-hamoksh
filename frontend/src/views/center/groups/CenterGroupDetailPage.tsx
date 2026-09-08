'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Users, CreditCard, UserPlus, Trash2, Pause, Play, ArrowUpRight, DoorOpen,
} from 'lucide-react';
import { PageBackButton } from '../../../components/layout/PageBackButton';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill } from '../ui/CenterPill';
import { CenterModal } from '../ui/CenterModal';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey, type TranslateParams } from '../../../i18n';
import { dayName, formatTime, formatCurrency } from '../../../lib/format';

type T = (key: DictKey, params?: TranslateParams) => string;

interface Agreement {
  type: 'session' | 'monthly';
  amount: number;
}

interface GroupStudent {
  id: string;
  name: string;
  enrolledAt: string;
  status: string;
  totalPaid: number;
  financialStatus: string;
  lastAttendance: string | null;
}

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
  teacherId: string | null;
  teacher: string | null;
  room: string | null;
  roomId: string | null;
  branch: string | null;
  subject: string | null;
  agreement: Agreement;
  students: GroupStudent[];
}

interface FormData {
  students: { id: string; name: string }[];
  rooms?: { id: string; name: string }[];
}

type GroupTab = 'overview' | 'students' | 'financial';

export default function CenterGroupDetailPage() {
  const { t, lang } = useT();
  const params = useParams<{ slug: string }>();
  const toast = useToast();

  const { data: group, loading, error, reload } = useApi<GroupDetail>(
    () => api.get<GroupDetail>(`/center/groups/${params.slug}`),
    [params.slug]
  );
  const { data: formData } = useApi<FormData>(() => api.get<FormData>('/center/groups/form-data'), []);

  const [tab, setTab] = useState<GroupTab>('overview');
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [showEditSchedule, setShowEditSchedule] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>;
  if (!group) return null;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const description = [group.teacher, group.subject, group.stage].filter(Boolean).join(' · ');

  const days = Array.from({ length: 7 }, (_, i) => ({ value: String(i), label: dayName(i, lang) }));

  const dayLabel = group.dayOfWeek === null || group.dayOfWeek === undefined ? '—' : dayName(group.dayOfWeek, lang);
  const timeRange = `${formatTime(group.startTime)} – ${formatTime(group.endTime)}`;

  const agreementLine = () => {
    const amount = formatCurrency(group.agreement.amount, lang);
    return group.agreement.type === 'monthly'
      ? `${t('agreementMonthly')} · ${amount}`
      : `${t('agreementSession')} · ${amount}`;
  };

  const statusPill = () => {
    if (group.status === 'ACTIVE') return <CenterPill tone="green">{t('groupActive')}</CenterPill>;
    if (group.status === 'NEEDS_ROOM') return <CenterPill tone="amber">{t('groupNeedsRoom')}</CenterPill>;
    return <CenterPill tone="slate">{t('groupPaused')}</CenterPill>;
  };

  const isPaused = group.status === 'INACTIVE';

  const toggleStatus = async () => {
    setTogglingStatus(true);
    try {
      await api.put(`/center/groups/${group.id}`, { status: isPaused ? 'ACTIVE' : 'INACTIVE' });
      toast.success(isPaused ? t('groupResumedToast') : t('groupPausedToast'));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setTogglingStatus(false);
    }
  };

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

  return (
    <div className="space-y-5">
      <PageBackButton label={t('backToGroups')} fallback="/center/groups" />

      <CenterPageHeader
        eyebrow={t('groupFileEyebrow')}
        title={group.name}
        description={description || undefined}
      >
        {statusPill()}
        <button type="button" className="mj-btn mj-btn--ghost" onClick={() => setShowEditSchedule(true)}>
          {t('editGroupSchedule')}
        </button>
      </CenterPageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CenterStatCard
          label={t('groupEnrolledStudents')}
          value={`${group.students.length} / ${group.capacity ?? '∞'}`}
        />
        <CenterStatCard label={t('groupRoom')} value={group.room || t('groupNeedsRoom')} />
        <CenterStatCard label={t('groupDaysMeeting')} value={dayLabel} />
        <CenterStatCard label={t('groupMeetingTime')} value={timeRange} />
      </div>

      <div className="mj-detail-grid">
        <div className="mj-detail-main">
          <div className="mj-tabs">
            <button type="button" className={`mj-tab ${tab === 'overview' ? 'mj-tab--active' : ''}`} onClick={() => setTab('overview')}>
              {t('groupOverviewTab')}
            </button>
            <button type="button" className={`mj-tab ${tab === 'students' ? 'mj-tab--active' : ''}`} onClick={() => setTab('students')}>
              {t('groupStudentsOperationalTab')}
              <span className="mj-tab-count">{group.students.length}</span>
            </button>
            <button type="button" className={`mj-tab ${tab === 'financial' ? 'mj-tab--active' : ''}`} onClick={() => setTab('financial')}>
              {t('groupFinancialMatchingTab')}
            </button>
          </div>

          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="mj-card overflow-hidden">
                <div className="border-b border-[color:var(--mj-border-soft)] px-5 py-4">
                  <h3 className="font-bold text-[color:var(--mj-ink-strong)]">{t('groupOperationsTitle')}</h3>
                  <p className="mt-0.5 text-sm text-[color:var(--mj-muted)]">{t('groupOperationsSub')}</p>
                </div>
                <div className="grid gap-3 p-5 sm:grid-cols-3">
                  <div className="mj-card mj-card--padding">
                    <p className="text-sm font-semibold text-[color:var(--mj-muted)]">{t('groupRecurringBooking')}</p>
                    <p className="mt-2 text-lg font-bold text-[color:var(--mj-ink-strong)]">
                      {group.room ? `${group.room} · ${dayLabel}` : `${t('groupNeedsRoom')} · ${dayLabel}`}
                    </p>
                    <p className="mt-0.5 text-sm text-[color:var(--mj-muted)]">
                      {`${formatTime(group.startTime)} ${t('to')} ${formatTime(group.endTime)}`}
                    </p>
                    <Link href="/center/rooms" className="mj-link mt-3 inline-flex items-center gap-1 text-sm font-semibold">
                      <DoorOpen className="h-4 w-4" />
                      {t('openRoomsSchedule')}
                      <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
                    </Link>
                  </div>
                  <div className="mj-card mj-card--padding">
                    <p className="text-sm font-semibold text-[color:var(--mj-muted)]">{t('groupOccupancy')}</p>
                    <p className="mt-2 text-lg font-bold text-[color:var(--mj-ink-strong)]">
                      {t('groupOccupancyLine', { count: group.students.length, capacity: group.capacity ?? '—' })}
                    </p>
                    <button type="button" className="mj-btn mj-btn--ghost mt-3" onClick={() => setTab('students')}>
                      <Users className="h-4 w-4" />
                      {t('openStudentsRegister')}
                    </button>
                  </div>
                  <div className="mj-card mj-card--padding">
                    <p className="text-sm font-semibold text-[color:var(--mj-muted)]">{t('groupFinancialAgreement')}</p>
                    <p className="mt-2 text-lg font-bold text-[color:var(--mj-ink-strong)]">{agreementLine()}</p>
                    <p className="mt-0.5 text-sm text-[color:var(--mj-muted)]">{t('groupFinancialReviewNote')}</p>
                    <button type="button" className="mj-btn mj-btn--ghost mt-3" onClick={() => setTab('financial')}>
                      <CreditCard className="h-4 w-4" />
                      {t('openFinancialMatching')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mj-card mj-card--padding">
                <p className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{t('centerResponsibilityTitle')}</p>
                <p className="mt-1 text-sm leading-relaxed text-[color:var(--mj-muted)]">{t('centerResponsibilityNote')}</p>
              </div>
            </div>
          )}

          {tab === 'students' && (
            <div className="mj-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-5 py-3">
                <p className="text-sm text-[color:var(--mj-muted)]">{t('groupStudentsOperationalTab')}</p>
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
                                {s.totalPaid > 0 ? formatCurrency(s.totalPaid / 100, lang) : t('financialNotPaid')}
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

          {tab === 'financial' && (
            <div className="mj-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-5 py-3">
                <p className="text-sm text-[color:var(--mj-muted)]">{t('groupFinancialMatchingTab')}</p>
                <Link href="/center/finance" className="mj-link inline-flex items-center gap-1 text-sm font-semibold">
                  {t('openAccounts')}
                  <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
                </Link>
              </div>
              {group.students.length === 0 ? (
                <div className="mj-empty">
                  <CreditCard className="mj-empty-icon" />
                  <p className="text-sm">{t('noClassrooms')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="mj-table">
                    <thead>
                      <tr>
                        <th>{t('fullName')}</th>
                        <th>{t('collectedAmount')}</th>
                        <th>{t('financialStatus')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.students.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <Link href={`/center/students/${s.id}`} className="font-medium text-[color:var(--mj-link)] hover:underline">
                              {s.name}
                            </Link>
                          </td>
                          <td>
                            <span className="font-semibold text-[color:var(--mj-ink-strong)]">
                              {s.totalPaid > 0 ? formatCurrency(s.totalPaid / 100, lang) : '—'}
                            </span>
                          </td>
                          <td>
                            {s.totalPaid > 0 ? (
                              <CenterPill tone="green">{t('financialPaid')}</CenterPill>
                            ) : (
                              <CenterPill tone="amber">{t('financialNotPaid')}</CenterPill>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mj-detail-side">
          <div className="mj-side-card">
            <h2 className="mb-3 text-sm font-bold text-[color:var(--mj-ink-strong)]">{t('operationalRelationship')}</h2>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('responsibleTeacher')}</span>
              <span className="mj-side-row-value">{group.teacher || '—'}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('groupStageSide')}</span>
              <span className="mj-side-row-value">{group.stage || '—'}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('groupRoom')}</span>
              <span className="mj-side-row-value">{group.room || t('groupNeedsRoom')}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('agreement')}</span>
              <span className="mj-side-row-value">{agreementLine()}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('status')}</span>
              <span>{statusPill()}</span>
            </div>
            <div className="mt-2 pt-3">
              {group.teacherId && (
                <Link href={`/center/teachers/${group.teacherId}`} className="mj-link inline-flex items-center gap-1 text-sm font-semibold">
                  {t('openTeacherFile')}
                  <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
                </Link>
              )}
            </div>
          </div>

          <div className="mj-side-card">
            <button type="button" className="mj-btn mj-btn--ghost w-full" onClick={toggleStatus} disabled={togglingStatus}>
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {isPaused ? t('resumeGroup') : t('pauseGroup')}
            </button>
            <p className="mt-3 text-xs leading-relaxed text-[color:var(--mj-muted)]">{t('pauseGroupNote')}</p>
          </div>
        </div>
      </div>

      {showAddStudents && formData && (
        <AddStudentsModal
          groupId={group.id}
          existing={new Set(group.students.map((s) => s.id))}
          allStudents={formData.students}
          onClose={() => setShowAddStudents(false)}
          onSuccess={() => { setShowAddStudents(false); reload(); }}
        />
      )}

      {showEditSchedule && (
        <EditScheduleModal
          group={group}
          days={days}
          onClose={() => setShowEditSchedule(false)}
          onSuccess={() => { setShowEditSchedule(false); reload(); }}
        />
      )}
    </div>
  );
}

function ScheduleFormFields({
  roomId, dayOfWeek, startTime, endTime, days, rooms, t, onChange,
}: {
  roomId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  days: { value: string; label: string }[];
  rooms: { id: string; name: string }[];
  t: T;
  onChange: (patch: { roomId?: string; dayOfWeek?: string; startTime?: string; endTime?: string }) => void;
}) {
  return (
    <>
      <div className="mj-field">
        <label className="mj-label">{t('groupRoom')}</label>
        <select className="mj-select" value={roomId} onChange={(e) => onChange({ roomId: e.target.value })}>
          <option value="">{t('groupNeedsRoom')}</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>
      <div className="mj-field">
        <label className="mj-label">{t('groupDaysMeeting')}</label>
        <select className="mj-select" value={dayOfWeek} onChange={(e) => onChange({ dayOfWeek: e.target.value })}>
          <option value="">{t('selectBranch')}</option>
          {days.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="mj-field">
          <label className="mj-label">{t('groupStartTime')}</label>
          <input type="time" className="mj-input" value={startTime} onChange={(e) => onChange({ startTime: e.target.value })} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('groupEndTime')}</label>
          <input type="time" className="mj-input" value={endTime} onChange={(e) => onChange({ endTime: e.target.value })} />
        </div>
      </div>
    </>
  );
}

function EditScheduleModal({
  group, days, onClose, onSuccess,
}: {
  group: GroupDetail;
  days: { value: string; label: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    roomId: group.roomId ?? '',
    dayOfWeek: group.dayOfWeek === null || group.dayOfWeek === undefined ? '' : String(group.dayOfWeek),
    startTime: group.startTime ?? '',
    endTime: group.endTime ?? '',
  });
  const { data: formData } = useApi<FormData>(() => api.get<FormData>('/center/groups/form-data'), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/center/groups/${group.id}`, {
        roomId: form.roomId || null,
        dayOfWeek: form.dayOfWeek !== '' ? Number(form.dayOfWeek) : null,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        status: form.roomId ? 'ACTIVE' : 'NEEDS_ROOM',
      });
      toast.success(t('groupScheduleUpdatedToast'));
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
      title={t('editScheduleTitle')}
      description={t('editScheduleDesc')}
      size="md"
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={handleSubmit} disabled={saving}>
            {t('save')}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formData && formData.rooms && (
          <ScheduleFormFields
            roomId={form.roomId}
            dayOfWeek={form.dayOfWeek}
            startTime={form.startTime}
            endTime={form.endTime}
            days={days}
            rooms={formData.rooms}
            t={t}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          />
        )}
      </form>
    </CenterModal>
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
          <Users className="h-4 w-4" />
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
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  UserRound, DoorOpen, Clock, CalendarDays,
  Users, Plus, Trash2, CreditCard, UserPlus,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageBackButton } from '../../../components/layout/PageBackButton';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge, statusTone } from '../../../components/ui/Badge';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Modal } from '../../../components/ui/Modal';
import { Tabs } from '../../../components/ui/Tabs';
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
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PageBackButton />
        <PageHeader
          title={group.name}
          subtitle={group.subject || group.stage || t('groupGeneric')}
          action={
            <Badge tone={group.status === 'ACTIVE' ? 'green' : group.status === 'NEEDS_ROOM' ? 'amber' : 'red'}>
              {group.status === 'ACTIVE' ? t('groupActive') : group.status === 'NEEDS_ROOM' ? t('groupNeedsRoom') : t('groupInactive')}
            </Badge>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{t('groupTeacher')}</p>
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{group.teacher || '—'}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              <DoorOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{t('groupRoom')}</p>
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{group.room || t('groupNeedsRoom')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{DAY_NAMES[group.dayOfWeek ?? -1] ?? t('selectBranch')}</p>
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {group.startTime ?? ''} — {group.endTime ?? ''}
              </p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{t('groupStudents')}</p>
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {group.students.length} / {group.capacity ?? '∞'}
                <span className="ms-2 text-xs font-normal text-slate-400">({occupancy}%)</span>
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs
        tabs={[
          { key: 'students', label: t('groupTypeStudent'), count: group.students.length },
          { key: 'bookings', label: t('groupTypeBookings'), count: group.bookings.length },
        ]}
        activeKey={tab}
        onChange={setTab}
      >
        <>
            {tab === 'bookings' ? (
              <Card bodyClassName="p-0">
                {group.bookings.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <CalendarDays className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm text-slate-500">{t('noClassrooms')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {group.bookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {b.room || t('groupNeedsRoom')}
                          </p>
                          <p className="text-xs text-slate-500">
                            {DAY_NAMES[b.dayOfWeek ?? -1] ?? t('selectBranch')} {b.startTime} — {b.endTime}
                          </p>
                        </div>
                        <Badge tone={statusTone(b.status)}>{b.status ?? '—'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ) : (
              <Card bodyClassName="p-0">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-700">
                  <p className="text-sm text-slate-500">{t('groupStudents')}</p>
                  <Button size="sm" onClick={() => setShowAddStudents(true)}>
                    <UserPlus className="h-4 w-4" />
                    {t('groupAddStudents')}
                  </Button>
                </div>
                {group.students.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <Users className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm text-slate-500">{t('noClassrooms')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-start text-xs text-slate-500 dark:border-slate-700">
                          <th className="px-5 py-2.5 text-start font-medium">{t('fullName')}</th>
                          <th className="px-5 py-2.5 text-start font-medium">{t('enrolledAt')}</th>
                          <th className="px-5 py-2.5 text-start font-medium">{t('financialStatus')}</th>
                          <th className="px-5 py-2.5 text-start font-medium">{t('lastAttendance')}</th>
                          <th className="px-5 py-2.5 text-end font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {group.students.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                  {s.name.charAt(0)}
                                </span>
                                <Link href={`/center/students/${s.id}`} className="font-medium text-slate-900 hover:text-brand-600 dark:text-white">
                                  {s.name}
                                </Link>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{fmtDate(s.enrolledAt)}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15">
                                  <CreditCard className="h-3.5 w-3.5" />
                                </span>
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                  {s.totalPaid > 0 ? `${(s.totalPaid / 100).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} EGP` : t('financialNotPaid')}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                              {s.lastAttendance ? fmtDate(s.lastAttendance) : t('notAttendedYet')}
                            </td>
                            <td className="px-5 py-3 text-end">
                              <Button variant="ghost" size="sm" onClick={() => removeStudent(s.id)} aria-label={t('unsubscribeStudent')}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}
          </>
      </Tabs>

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
    <Modal open onClose={onClose} title={t('groupAddStudents')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={submit} loading={saving} disabled={selected.length === 0}>{t('save')}</Button></>}>
      <form onSubmit={submit} className="space-y-3">
        <p className="flex items-center gap-1.5 text-sm text-slate-500">
          <Plus className="h-4 w-4" />
          {t('groupStudents')}: {selected.length}
        </p>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-600">
          {available.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">
              <input type="checkbox" className="accent-teal-600" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
              {s.name}
            </label>
          ))}
        </div>
      </form>
    </Modal>
  );
}
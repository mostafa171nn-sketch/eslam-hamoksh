'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Group, DoorOpen, UserRound, MapPin, Clock, Users, CalendarDays, Search } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge, statusTone } from '../../../components/ui/Badge';
import { StatCard } from '../../../components/ui/StatCard';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Progress } from '../../../components/ui/Progress';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('groupsTitle')}
        subtitle={t('groupsSub')}
        action={
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />
            {t('addGroup')}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('groupStatus') + ' — ' + t('groupActive')} value={summary?.total ?? '—'} icon={Group} tone="teal" />
        <StatCard label={t('groupActive')} value={summary?.active ?? '—'} icon={CalendarDays} tone="emerald" />
        <StatCard label={t('groupNeedsRoom')} value={summary?.needsRoom ?? '—'} icon={DoorOpen} tone="amber" />
        <StatCard label={t('groupStudents')} value={summary?.students ?? '—'} icon={Users} tone="violet" />
      </div>

      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="ps-9"
              placeholder={t('search') + '...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="sm:w-52">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: t('allBranches') },
                { value: 'ACTIVE', label: t('groupActive') },
                { value: 'NEEDS_ROOM', label: t('groupNeedsRoom') },
                { value: 'INACTIVE', label: t('groupInactive') },
              ]}
            />
          </div>
        </div>
      </Card>

      {loading && <PencilLoader label={t('loading')} />}
      {error && <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>}

      {!loading && groups && groups.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const pct = g.capacity && g.capacity > 0 ? Math.min(Math.round((g.studentCount / g.capacity) * 100), 100) : 0;
            return (
              <Link key={g.id} href={`/center/groups/${g.slug ?? g.id}`}>
                <Card bodyClassName="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/10 dark:bg-teal-500/15 dark:text-teal-300">
                        <Group className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900 dark:text-white">{g.name}</h3>
                        <p className="truncate text-xs text-slate-500">{g.subject || g.stage || '—'}</p>
                      </div>
                    </div>
                    <Badge tone={g.status === 'ACTIVE' ? statusTone('COMPLETED') : g.status === 'NEEDS_ROOM' ? 'amber' : 'slate'}>
                      {g.status === 'ACTIVE' ? t('groupActive') : g.status === 'NEEDS_ROOM' ? t('groupNeedsRoom') : t('groupInactive')}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <UserRound className="h-3.5 w-3.5 text-slate-400" />
                      {g.teacher || '—'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                      {g.room || t('groupNeedsRoom')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                      {dayLabel(g.dayOfWeek)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {g.startTime ?? ''} — {g.endTime ?? ''}
                    </span>
                    {g.branch && (
                      <span className="col-span-2 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {g.branch}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-700">
                    <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-500">{t('groupStudents')}</span>
                      <span className={pct >= 90 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-200'}>
                        {g.studentCount} / {g.capacity ?? '∞'}
                      </span>
                    </div>
                    <Progress value={pct} variant={pct >= 90 ? 'red' : 'green'} size="sm" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && groups?.length === 0 && (
        <Card bodyClassName="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Group className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500">{t('noClassrooms')}</p>
          </div>
        </Card>
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
    <Modal open onClose={onClose} title={t('addGroup')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSubmit} loading={saving}>{t('save')}</Button></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={t('groupName')} required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Select label={t('groupStage')} value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))} options={STAGES} placeholder={t('selectBranch')} />
          <Select label={t('groupTeacher')} value={form.teacherId} onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))} options={formData.teachers.map((x) => ({ value: x.id, label: x.name }))} placeholder={t('selectBranch')} />
          <Select label={t('groupRoom')} value={form.roomId} onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))} options={formData.rooms.map((x) => ({ value: x.id, label: x.name }))} placeholder={t('selectBranch')} />
          <Select label={t('groupBranch')} value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))} options={formData.branches.map((x) => ({ value: x.id, label: x.name }))} placeholder={t('selectBranch')} />
          <Input label={t('groupCapacity')} type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
          <Select label={t('groupDay')} value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))} options={WEEKDAYS} placeholder={t('selectBranch')} />
          <div className="grid grid-cols-2 gap-2">
            <Input label={t('groupStartTime')} type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            <Input label={t('groupEndTime')} type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">{t('groupStudents')}</p>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-600">
            {formData.students.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <input
                  type="checkbox"
                  className="accent-teal-600"
                  checked={form.studentIds.includes(s.id)}
                  onChange={() => toggleStudent(s.id)}
                />
                {s.name}
              </label>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default CenterGroupsPage;
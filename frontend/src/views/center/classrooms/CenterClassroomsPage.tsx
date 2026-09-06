'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Users,
  CalendarDays,
  Clock,
  Check,
  X,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge, statusTone } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Modal } from '../../../components/ui/Modal';
import { Tabs } from '../../../components/ui/Tabs';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey } from '../../../i18n';

interface Classroom {
  id: string;
  name: string;
  capacity: number;
  branch: string | null;
  status: string;
}

interface Booking {
  id: string;
  room: string | null;
  roomId: string;
  roomCapacity: number | null;
  teacher: string | null;
  teacherId: string;
  group: string | null;
  groupId: string | null;
  date: string | null;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  recurrence: string;
  status: string;
  note: string | null;
  createdAt: string;
}

interface BookingStats {
  pending: number;
  approved: number;
  cancelled: number;
  roomsInUse: number;
}

interface FormData {
  teachers: { id: string; name: string }[];
}

const DAY_NAMES: Record<number, string> = {
  0: 'الأحد', 1: 'الاثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت',
};

export default function CenterClassroomsPage() {
  const { t } = useT();
  const [tab, setTab] = useState('rooms');

  return (
    <div className="space-y-6">
      <PageHeader title={t('classrooms')} subtitle={t('classroomsSub')} />
      <Tabs
        tabs={[
          { key: 'rooms', label: t('roomsTab') },
          { key: 'bookings', label: t('bookingsTitle') },
        ]}
        activeKey={tab}
        onChange={setTab}
      >
        <div className="pt-1">
          {tab === 'rooms' ? <RoomsGrid t={t} /> : <BookingsTab t={t} />}
        </div>
      </Tabs>
    </div>
  );
}

function RoomsGrid({ t }: { t: (k: DictKey) => string }) {
  const toast = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Classroom | null>(null);

  const { data: rooms, loading, error, reload } = useApi<Classroom[]>(
    () => api.get<Classroom[]>('/center/account/classrooms'),
    []
  );

  const deleteRoom = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api.delete(`/center/account/classrooms/${id}`);
      toast.success(t('roomDeleted'));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          {t('addClassroom')}
        </Button>
      </div>

      {loading && <PencilLoader label={t('loading')} />}
      {error && <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>}

      {!loading && rooms && rooms.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Card key={room.id} bodyClassName="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{room.name}</h3>
                    <p className="text-xs text-slate-500">{room.branch || t('noBranch')}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedRoom(room); setShowEditModal(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteRoom(room.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 dark:border-slate-700">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Users className="h-4 w-4" />
                  {room.capacity} {t('capacity')}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  room.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {t(room.status.toLowerCase() as DictKey)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && rooms?.length === 0 && (
        <Card bodyClassName="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <BookOpen className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500">{t('noClassrooms')}</p>
            <Button className="mt-4" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
              {t('addClassroom')}
            </Button>
          </div>
        </Card>
      )}

      <AddRoomModal open={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); reload(); }} />
      {selectedRoom && (
        <EditRoomModal room={selectedRoom} open={showEditModal} onClose={() => { setShowEditModal(false); setSelectedRoom(null); }} onSuccess={() => { setShowEditModal(false); setSelectedRoom(null); reload(); }} />
      )}
    </div>
  );
}

function BookingsTab({ t }: { t: (k: DictKey) => string }) {
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const { data: stats, reload: reloadStats } = useApi<BookingStats>(() => api.get<BookingStats>('/center/bookings/stats'), []);
  const { data: bookings, loading, error, reload } = useApi<Booking[]>(() => api.get<Booking[]>('/center/bookings'), []);
  const { data: formData } = useApi<FormData>(() => api.get<FormData>('/center/groups/form-data'), []);

  const changeStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/center/bookings/${id}/status`, { status });
      toast.success(status === 'APPROVED' ? t('bookingApprovedToast') : t('bookingRejectedToast'));
      reload();
      reloadStats();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatChip label={t('bookingQueue')} value={stats.pending} tone="amber" />
          <StatChip label={t('bookingApproved')} value={stats.approved} tone="green" />
          <StatChip label={t('bookingRejected')} value={stats.cancelled} tone="red" />
        </div>
      )}

      <Card bodyClassName="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-700">
          <p className="text-sm text-slate-500">{t('bookingsTitle')}</p>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" />
            {t('addBooking')}
          </Button>
        </div>

        {loading && <PencilLoader label={t('loading')} />}
        {error && <div className="m-4 rounded-lg bg-red-50 p-4 text-red-600">{error}</div>}

        {!loading && bookings && bookings.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-start text-xs text-slate-500 dark:border-slate-700">
                  <th className="px-5 py-2.5 text-start font-medium">{t('groupRoom')}</th>
                  <th className="px-5 py-2.5 text-start font-medium">{t('groupTeacher')}</th>
                  <th className="px-5 py-2.5 text-start font-medium">{t('groupDay')}</th>
                  <th className="px-5 py-2.5 text-start font-medium">{t('time')}</th>
                  <th className="px-5 py-2.5 text-start font-medium">{t('bookingRecurrence')}</th>
                  <th className="px-5 py-2.5 text-start font-medium">{t('bookingStatus')}</th>
                  <th className="px-5 py-2.5 text-end font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{b.room || '—'}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{b.teacher || '—'}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        {b.dayOfWeek == null ? (b.date ? new Date(b.date).toLocaleDateString() : '—') : DAY_NAMES[b.dayOfWeek]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {b.startTime} — {b.endTime}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone="slate">{t(b.recurrence === 'WEEKLY' ? 'weeklyRecurring' : 'oneTime')}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(b.status)}>{b.status?.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-5 py-3 text-end">
                      {b.status === 'PENDING' && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => changeStatus(b.id, 'APPROVED')} aria-label={t('approveBooking')}>
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => changeStatus(b.id, 'CANCELLED')} aria-label={t('rejectBooking')}>
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && bookings?.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">{t('noClassrooms')}</div>
        )}
      </Card>

      {showNew && formData && (
        <NewBookingModal t={t} formData={formData} onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); reload(); reloadStats(); }} />
      )}
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number | undefined; tone: 'amber' | 'green' | 'red' }) {
  const tones: Record<string, string> = { amber: 'text-amber-600 dark:text-amber-400', green: 'text-emerald-600 dark:text-emerald-400', red: 'text-red-600 dark:text-red-400' };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className={`text-xl font-bold ${tones[tone]}`}>{value ?? '—'}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

function NewBookingModal({ t, formData, onClose, onDone }: { t: (k: DictKey) => string; formData: FormData; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [form, setForm] = useState({ roomId: '', teacherId: '', dayOfWeek: '', startTime: '', endTime: '', recurrence: 'ONE_TIME', note: '' });

  const loadRooms = async () => {
    try {
      const r = await api.get<Classroom[]>('/center/account/classrooms');
      setRooms(r.data);
    } catch {
      setRooms([]);
    }
  };
  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roomId || !form.teacherId || !form.startTime || !form.endTime) { toast.error(t('requiredFields')); return; }
    setSaving(true);
    try {
      await api.post('/center/bookings', form);
      toast.success(t('bookingCreatedToast'));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={t('addBooking')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={submit} loading={saving}>{t('save')}</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label={t('groupRoom')} required value={form.roomId} onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))} options={rooms.map((x) => ({ value: x.id, label: x.name }))} placeholder={t('selectBranch')} />
          <Select label={t('groupTeacher')} required value={form.teacherId} onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))} options={formData.teachers.map((x) => ({ value: x.id, label: x.name }))} placeholder={t('selectBranch')} />
          <Select label={t('groupDay')} value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))} options={Object.entries(DAY_NAMES).map(([value, label]) => ({ value, label }))} placeholder={t('selectBranch')} />
          <Select label={t('bookingRecurrence')} value={form.recurrence} onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))} options={[{ value: 'ONE_TIME', label: t('oneTime') }, { value: 'WEEKLY', label: t('weeklyRecurring') }]} />
          <Input label={t('groupStartTime')} type="time" required value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
          <Input label={t('groupEndTime')} type="time" required value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
        </div>
        <Input label={t('note')} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
      </form>
    </Modal>
  );
}

function AddRoomModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', capacity: 20, branchId: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/center/account/classrooms', form);
      toast.success(t('roomCreated'));
      setForm({ name: '', capacity: 20, branchId: '' });
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('addClassroom')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSubmit} loading={saving}>{t('save')}</Button></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('classroomName')} required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
        <Input label={t('capacity')} type="number" value={form.capacity} onChange={(e) => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 20 }))} />
      </form>
    </Modal>
  );
}

function EditRoomModal({ room, open, onClose, onSuccess }: { room: Classroom; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: room.name, capacity: room.capacity });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/center/account/classrooms/${room.id}`, form);
      toast.success(t('roomUpdated'));
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('editClassroom')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSubmit} loading={saving}>{t('save')}</Button></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('classroomName')} required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
        <Input label={t('capacity')} type="number" value={form.capacity} onChange={(e) => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 20 }))} />
      </form>
    </Modal>
  );
}
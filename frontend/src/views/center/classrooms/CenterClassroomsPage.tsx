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
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill } from '../ui/CenterPill';
import { CenterModal } from '../ui/CenterModal';
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
    <div className="space-y-5">
      <CenterPageHeader title={t('classrooms')} description={t('classroomsSub')} />
      <nav className="mj-tabs">
        <button
          type="button"
          className={`mj-tab ${tab === 'rooms' ? 'mj-tab--active' : ''}`}
          onClick={() => setTab('rooms')}
        >
          {t('roomsTab')}
        </button>
        <button
          type="button"
          className={`mj-tab ${tab === 'bookings' ? 'mj-tab--active' : ''}`}
          onClick={() => setTab('bookings')}
        >
          {t('bookingsTitle')}
        </button>
      </nav>
      <div className="pt-1">
        {tab === 'rooms' ? <RoomsGrid t={t} /> : <BookingsTab t={t} />}
      </div>
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
        <button type="button" className="mj-btn mj-btn--primary" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          {t('addClassroom')}
        </button>
      </div>

      {loading && <PencilLoader label={t('loading')} />}
      {error && <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

      {!loading && rooms && rooms.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <CenterStatCard value={rooms.length} label={t('rooms')} />
            <CenterStatCard value={rooms.reduce((sum, r) => sum + r.capacity, 0)} label={t('capacity')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <div key={room.id} className="mj-card mj-card--padding">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--mj-accent-soft)] text-[color:var(--mj-accent)]">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[color:var(--mj-ink-strong)]">{room.name}</h3>
                      <p className="text-xs text-[color:var(--mj-muted)]">{room.branch || t('noBranch')}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm" aria-label={t('editClassroom')} onClick={() => { setSelectedRoom(room); setShowEditModal(true); }}>
                      <Edit className="h-4 w-4" />
                    </button>
                    <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm" aria-label={t('delete')} onClick={() => deleteRoom(room.id)}>
                      <Trash2 className="h-4 w-4 text-[color:var(--mj-danger)]" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4 border-t border-[color:var(--mj-border-soft)] pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-[color:var(--mj-muted)]">
                    <Users className="h-4 w-4" />
                    {room.capacity} {t('capacity')}
                  </div>
                  <CenterPill tone={room.status === 'ACTIVE' ? 'green' : 'slate'}>
                    {t(room.status.toLowerCase() as DictKey)}
                  </CenterPill>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && rooms?.length === 0 && (
        <div className="mj-card mj-card--padding">
          <div className="mj-empty">
            <BookOpen className="mj-empty-icon" />
            <p className="text-sm">{t('noClassrooms')}</p>
            <button type="button" className="mj-btn mj-btn--soft" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
              {t('addClassroom')}
            </button>
          </div>
        </div>
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

  const statusPill = (s: string) =>
    s === 'PENDING' ? 'amber' : s === 'APPROVED' ? 'green' : s === 'CANCELLED' ? 'red' : ('slate' as const);

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CenterStatCard value={stats.pending} label={t('bookingQueue')} />
          <CenterStatCard value={stats.approved} label={t('bookingApproved')} />
          <CenterStatCard value={stats.cancelled} label={t('bookingRejected')} />
        </div>
      )}

      <div className="mj-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-5 py-3">
          <p className="text-sm font-semibold text-[color:var(--mj-ink-strong)]">{t('bookingsTitle')}</p>
          <button type="button" className="mj-btn mj-btn--primary mj-btn--sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" />
            {t('addBooking')}
          </button>
        </div>

        {loading && <PencilLoader label={t('loading')} />}
        {error && <div className="m-4 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

        {!loading && bookings && bookings.length > 0 && (
          <div className="overflow-x-auto">
            <table className="mj-table">
              <thead>
                <tr>
                  <th>{t('groupRoom')}</th>
                  <th>{t('groupTeacher')}</th>
                  <th>{t('groupDay')}</th>
                  <th>{t('time')}</th>
                  <th>{t('bookingRecurrence')}</th>
                  <th>{t('bookingStatus')}</th>
                  <th className="text-end">{t('action')}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span className="font-semibold text-[color:var(--mj-ink-strong)]">{b.room || '—'}</span>
                    </td>
                    <td>
                      <span className="font-medium text-[color:var(--mj-ink)]">{b.teacher || '—'}</span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 text-[color:var(--mj-muted-2)]" />
                        {b.dayOfWeek == null ? (b.date ? new Date(b.date).toLocaleDateString() : '—') : DAY_NAMES[b.dayOfWeek]}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-[color:var(--mj-muted-2)]" />
                        {b.startTime} — {b.endTime}
                      </span>
                    </td>
                    <td>
                      <CenterPill tone="slate">{t(b.recurrence === 'WEEKLY' ? 'weeklyRecurring' : 'oneTime')}</CenterPill>
                    </td>
                    <td>
                      <CenterPill tone={statusPill(b.status)}>{b.status?.replace(/_/g, ' ')}</CenterPill>
                    </td>
                    <td className="text-end">
                      {b.status === 'PENDING' && (
                        <div className="flex justify-end gap-1">
                          <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm" aria-label={t('approveBooking')} onClick={() => changeStatus(b.id, 'APPROVED')}>
                            <Check className="h-4 w-4 text-[color:var(--mj-success)]" />
                          </button>
                          <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm" aria-label={t('rejectBooking')} onClick={() => changeStatus(b.id, 'CANCELLED')}>
                            <X className="h-4 w-4 text-[color:var(--mj-danger)]" />
                          </button>
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
          <div className="mj-empty">
            <p className="text-sm">{t('noClassrooms')}</p>
          </div>
        )}
      </div>

      {showNew && formData && (
        <NewBookingModal t={t} formData={formData} onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); reload(); reloadStats(); }} />
      )}
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
    <CenterModal
      open
      onClose={onClose}
      title={t('addBooking')}
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={submit} disabled={saving}>{t('save')}</button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-0" noValidate>
        <div className="grid grid-cols-1 gap-x-4 gap-y-0 sm:grid-cols-2">
          <div className="mj-field">
            <label className="mj-label">{t('groupRoom')}</label>
            <select className="mj-select" required value={form.roomId} onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}>
              <option value="">{t('selectBranch')}</option>
              {rooms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('groupTeacher')}</label>
            <select className="mj-select" required value={form.teacherId} onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}>
              <option value="">{t('selectBranch')}</option>
              {formData.teachers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('groupDay')}</label>
            <select className="mj-select" value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))}>
              <option value="">{t('selectBranch')}</option>
              {Object.entries(DAY_NAMES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('bookingRecurrence')}</label>
            <select className="mj-select" value={form.recurrence} onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))}>
              <option value="ONE_TIME">{t('oneTime')}</option>
              <option value="WEEKLY">{t('weeklyRecurring')}</option>
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('groupStartTime')}</label>
            <input type="time" className="mj-input" required value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('groupEndTime')}</label>
            <input type="time" className="mj-input" required value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
          </div>
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('note')}</label>
          <input type="text" className="mj-input" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
        </div>
      </form>
    </CenterModal>
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
    <CenterModal
      open={open}
      onClose={onClose}
      title={t('addClassroom')}
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={handleSubmit} disabled={saving}>{t('save')}</button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-0">
        <div className="mj-field">
          <label className="mj-label">{t('classroomName')}</label>
          <input type="text" className="mj-input" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('capacity')}</label>
          <input type="number" className="mj-input" value={form.capacity} onChange={(e) => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 20 }))} />
        </div>
      </form>
    </CenterModal>
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
    <CenterModal
      open={open}
      onClose={onClose}
      title={t('editClassroom')}
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={handleSubmit} disabled={saving}>{t('save')}</button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-0">
        <div className="mj-field">
          <label className="mj-label">{t('classroomName')}</label>
          <input type="text" className="mj-input" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('capacity')}</label>
          <input type="number" className="mj-input" value={form.capacity} onChange={(e) => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 20 }))} />
        </div>
      </form>
    </CenterModal>
  );
}

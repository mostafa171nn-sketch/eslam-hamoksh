'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  CheckCircle2,
  Clock,
  DoorOpen,
  Edit,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterModal } from '../ui/CenterModal';
import { CenterPill } from '../ui/CenterPill';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Alert } from '../../../components/ui/ErrorAlert';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey } from '../../../i18n';
import { useCenterBranch } from '../dashboard/CenterBranchContext';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type TimelineStatus = 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING' | 'PENDING';
type RoomStatus = 'IN_PROGRESS' | 'AVAILABLE' | 'PENDING_CONFIRM';

interface ScheduleOccurrence {
  id: string;
  roomId: string;
  teacherId: string;
  teacher: string;
  subject: string;
  grade: string | null;
  note: string | null;
  startTime: string;
  endTime: string;
  recurrence: string;
  status: string;
  timelineStatus: TimelineStatus;
}

interface ScheduleRoom {
  id: string;
  name: string;
  capacity: number | null;
  status: RoomStatus;
  availableUntil: string | null;
  ongoingUntil: string | null;
  bookingsCount: number;
  branch: string | null;
  occurrences: ScheduleOccurrence[];
}

interface QueueItem {
  id: string;
  roomId: string;
  room: string;
  teacherId: string;
  teacher: string;
  subject: string | null;
  note: string | null;
  date: string | null;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  recurrence: string;
  createdAt: string;
}

interface ScheduleData {
  date: string;
  rooms: ScheduleRoom[];
  queue: QueueItem[];
}

interface Classroom {
  id: string;
  name: string;
  capacity: number;
  branch: string | null;
  status: string;
}

interface FormData {
  teachers: { id: string; name: string }[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const OPERATING_START_MIN = 7 * 60; // 07:00
const OPERATING_END_MIN = 22 * 60; // 22:00

const DAY_LABELS: Record<number, string> = {
  0: 'الأحد', 1: 'الاثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت',
};

function toMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + (m || 0);
}

function formatHour(minutes: number): string {
  const hour12 = Math.floor(minutes / 60);
  const suffix = hour12 >= 12 ? 'م' : 'ص';
  const display = hour12 % 12 === 0 ? 12 : hour12 % 12;
  return `${display}:00 ${suffix}`;
}

function formatTime(value: string | undefined | null): string {
  if (!value) return '';
  const [h, m] = value.split(':').map(Number);
  const suffix = h >= 12 ? 'م' : 'ص';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function offsetDays(base: Date, offset: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function nextDays(count: number, from: Date): Date[] {
  return Array.from({ length: count }, (_, i) => offsetDays(from, i));
}

function translateConflict(msg: string, t: (k: DictKey) => string): string {
  if (msg.includes('Room already has a booking')) return t('bookingConflictRoom');
  if (msg.includes('Teacher already has a booking')) return t('bookingConflictTeacher');
  if (msg.includes('scheduled lesson')) return t('bookingConflictLesson');
  return msg;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function CenterClassroomsPage() {
  const { t, lang } = useT();
  const { branches, branchId: branchFilter, setBranches } = useCenterBranch();
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfToday());
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  useEffect(() => {
    if (branches.length > 0) return;
    api
      .get<{ id: string; name: string }[]>('/center/account/branches')
      .then((res) => setBranches(res.data || []))
      .catch(() => {});
  }, [branches.length, setBranches]);

  const { data, loading, error, reload } = useApi<ScheduleData>(
    () =>
      api.get<ScheduleData>('/center/bookings/schedule', {
        date: dateKey(selectedDate),
        branchId: branchFilter || undefined,
      }),
    [selectedDate, branchFilter]
  );

  const rooms = data?.rooms ?? [];
  const queue = data?.queue ?? [];

  const selectedRoom = useMemo(() => {
    if (rooms.length === 0) return null;
    if (selectedRoomId) {
      const found = rooms.find((r) => r.id === selectedRoomId);
      if (found) return found;
    }
    return rooms[0];
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (rooms.length > 0 && !rooms.some((r) => r.id === selectedRoomId)) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  // Close the booking detail when the context changes underneath it.
  useEffect(() => {
    setSelectedBookingId('');
    setSelectedRoomId((cur) => (rooms.some((r) => r.id === cur) ? cur : rooms[0]?.id ?? ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey(selectedDate), branchFilter]);

  const selectedBooking = useMemo(
    () => selectedRoom?.occurrences.find((o) => o.id === selectedBookingId) ?? null,
    [selectedRoom, selectedBookingId]
  );

  const isToday = isSameDay(selectedDate, new Date());
  const dateLabel = selectedDate.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (!data && loading) return <PencilLoader label={t('loadingDashboard')} />;
  if (!data && error) return <Alert message={error} />;

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const currentHourFraction =
    ((nowMinutes - OPERATING_START_MIN) / (OPERATING_END_MIN - OPERATING_START_MIN)) * 100;
  const totalHours = (OPERATING_END_MIN - OPERATING_START_MIN) / 60;

  const roomStatusLabel = (room: ScheduleRoom) => {
    if (room.status === 'IN_PROGRESS') return t('roomLiveUntil', { time: formatTime(room.ongoingUntil) });
    if (room.status === 'AVAILABLE') return room.availableUntil ? t('roomAvailableUntil', { time: formatTime(room.availableUntil) }) : t('roomAvailable');
    return t('roomPendingReview');
  };

  const roomStatusTone: Record<RoomStatus, 'live' | 'available' | 'pending'> = {
    IN_PROGRESS: 'live',
    AVAILABLE: 'available',
    PENDING_CONFIRM: 'pending',
  };

  const detailMeta = (o: ScheduleOccurrence) =>
    `${dateLabel} · ${selectedRoom?.name ?? ''} · ${formatTime(o.startTime)} إلى ${formatTime(o.endTime)} · ${
      o.recurrence === 'WEEKLY' ? t('weeklyRecurring') : t('oneTime')
    }`;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <CenterPageHeader eyebrow={t('portalSubtitle')} title={t('roomsPageTitle')} description={t('roomsPageSub')}>
        <button type="button" className="mj-btn mj-btn--ghost" onClick={() => setShowManageModal(true)}>
          <DoorOpen className="h-4 w-4" />
          {t('manageRooms')}
        </button>
        <button type="button" className="mj-btn mj-btn--primary" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          {t('newRoomBooking')}
        </button>
      </CenterPageHeader>

      {/* Operating schedule */}
      <section className="mj-card overflow-hidden" aria-label={t('roomScheduleTitle')}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-4 py-3">
          <div>
            <h2 className="text-[1.05rem] font-bold text-[color:var(--mj-ink-strong)]">{t('roomScheduleTitle')}</h2>
            <p className="mt-0.5 text-[0.8125rem] text-[color:var(--mj-muted)]">{t('roomScheduleSub')}</p>
          </div>
          <div className="mj-schedule-nav" role="group" aria-label={t('schedule')}>
            <button type="button" className="mj-schedule-btn" disabled={isToday} onClick={() => setSelectedDate((d) => offsetDays(d, -1))}>
              {t('previousDay')}
            </button>
            <button
              type="button"
              className={`mj-schedule-btn ${isToday ? 'mj-schedule-btn--primary' : ''}`}
              onClick={() => setSelectedDate(startOfToday())}
            >
              {t('todayNav')}
            </button>
            <span className="mj-schedule-date" aria-live="polite">{dateLabel}</span>
            <button type="button" className="mj-schedule-btn" onClick={() => setSelectedDate((d) => offsetDays(d, 1))}>
              {t('nextDay')}
            </button>
          </div>
        </div>

        {rooms.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-[color:var(--mj-border-soft)] px-4 py-3">
              <div role="tablist" aria-label={t('chooseRoom')} className="mj-room-tabs">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    role="tab"
                    type="button"
                    aria-selected={selectedRoom?.id === room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`mj-room-tab mj-room-tab--wide ${selectedRoom?.id === room.id ? 'mj-room-tab--active' : ''}`}
                  >
                    <span className="flex min-w-0 flex-col items-start gap-0.5">
                      <strong>{room.name}</strong>
                      <span className={`mj-room-tab-status mj-room-tab-status--${roomStatusTone[room.status]}`}>
                        {roomStatusLabel(room)}
                      </span>
                    </span>
                    <em className="mj-room-tab-seats">{t('roomCapacityLine', { n: room.capacity ?? 0 })}</em>
                  </button>
                ))}
              </div>
            </div>

            {selectedRoom && (
              <div role="tabpanel" aria-label={`${selectedRoom.name} ${t('schedule')}`}>
                {/* Room info bar */}
                <div className="mj-room-info">
                  <div className="mj-room-info-main">
                    <strong className="mj-room-info-name">{selectedRoom.name}</strong>
                    <span className="mj-room-info-caption">{t('roomCapacityLine', { n: selectedRoom.capacity ?? 0 })}</span>
                  </div>
                  <div className="mj-room-info-meta">
                    <span>{t('bookingsCountLine', { n: selectedRoom.bookingsCount })}</span>
                    <span>
                      {t('operatingHoursLine', {
                        start: formatHour(OPERATING_START_MIN),
                        end: formatHour(OPERATING_END_MIN),
                      })}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mj-timeline">
                    {/* Hour ruler */}
                    <div className="mj-timeline-hours" aria-hidden>
                      {Array.from({ length: totalHours }, (_, i) => {
                        const start = OPERATING_START_MIN + i * 60;
                        const left = (i / totalHours) * 100;
                        return (
                          <span key={start} className="mj-timeline-hour" style={{ insetInlineStart: `${left}%` }}>
                            {formatHour(start)}
                          </span>
                        );
                      })}
                      <span className="mj-timeline-hour" style={{ insetInlineStart: '100%' }}>
                        {formatHour(OPERATING_END_MIN)}
                      </span>
                    </div>

                    {/* Timeline track */}
                    <div className="mj-timeline-track">
                      {Array.from({ length: totalHours + 1 }, (_, i) => (
                        <span
                          key={i}
                          aria-hidden
                          className="absolute inset-y-0 w-px bg-[color:var(--mj-border-soft)]"
                          style={{ insetInlineStart: `${(i / totalHours) * 100}%` }}
                        />
                      ))}

                      {selectedRoom.occurrences.map((o) => {
                        const startMin = Math.max(toMinutes(o.startTime), OPERATING_START_MIN);
                        const endMin = Math.min(toMinutes(o.endTime), OPERATING_END_MIN);
                        const left = ((startMin - OPERATING_START_MIN) / (OPERATING_END_MIN - OPERATING_START_MIN)) * 100;
                        const width = ((Math.max(0, endMin - startMin)) / (OPERATING_END_MIN - OPERATING_START_MIN)) * 100;

                        const slotTone =
                          o.timelineStatus === 'COMPLETED' ? 'finished'
                          : o.timelineStatus === 'IN_PROGRESS' ? 'live'
                          : o.timelineStatus === 'PENDING' ? 'pending'
                          : 'upcoming';

                        return (
                          <button
                            key={o.id}
                            type="button"
                            aria-pressed={o.id === selectedBookingId}
                            onClick={() => setSelectedBookingId(o.id)}
                            className={`mj-timeline-slot mj-timeline-slot--${slotTone} ${o.id === selectedBookingId ? 'ring-2 ring-inset ring-[color:var(--mj-accent)]' : ''}`}
                            style={{ insetInlineStart: `${left}%`, width: `${width}%` }}
                          >
                            <strong className="truncate text-[0.75rem] font-bold">{o.teacher}</strong>
                            <span className="truncate text-[0.6875rem] font-medium">
                              {o.subject}{o.grade ? ` · ${o.grade}` : ''}
                            </span>
                            <span className="truncate text-[0.625rem] font-semibold opacity-80">
                              {formatTime(o.startTime)}–{formatTime(o.endTime)}
                            </span>
                          </button>
                        );
                      })}

                      {/* Now indicator */}
                      {nowMinutes >= OPERATING_START_MIN && nowMinutes <= OPERATING_END_MIN && (
                        <div className="mj-now-line" style={{ insetInlineStart: `${currentHourFraction}%` }}>
                          <span className="mj-now-label" style={{ top: '-1.6rem', insetInlineStart: '-1rem' }}>
                            {t('nowIndicator')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Booking detail panel */}
                {selectedBooking && (
                  <div className="mj-booking-detail">
                    <div className="min-w-0">
                      <CenterPill
                        tone={
                          selectedBooking.timelineStatus === 'PENDING' ? 'amber'
                          : selectedBooking.timelineStatus === 'IN_PROGRESS' ? 'red'
                          : selectedBooking.timelineStatus === 'UPCOMING' ? 'blue'
                          : 'slate'
                        }
                        dot
                      >
                        {selectedBooking.timelineStatus === 'PENDING' ? t('timelinePending')
                          : selectedBooking.timelineStatus === 'IN_PROGRESS' ? t('timelineLive')
                          : selectedBooking.timelineStatus === 'UPCOMING' ? t('timelineUpcoming')
                          : t('timelineFinished')}
                      </CenterPill>
                      <p className="mj-booking-detail-title mt-1">
                        {selectedBooking.teacher} · {selectedBooking.subject}
                        {selectedBooking.grade ? ` · ${selectedBooking.grade}` : ''}
                      </p>
                      <p className="mj-booking-detail-meta">{detailMeta(selectedBooking)}</p>
                    </div>
                    <Link href={`/center/teachers/${selectedBooking.teacherId}`} className="mj-link shrink-0 text-sm font-semibold">
                      {t('teacherProfile')}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="mj-empty">
            <Clock className="mj-empty-icon" />
            <p className="text-sm">{t('noClassrooms')}</p>
          </div>
        )}
      </section>

      {/* Booking request queue */}
      <section className="mj-card overflow-hidden" aria-label={t('bookingQueueTitle')}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-5 py-4">
          <div>
            <h2 className="text-[0.95rem] font-bold text-[color:var(--mj-ink-strong)]">{t('bookingQueueTitle')}</h2>
            <p className="mt-0.5 text-[0.75rem] text-[color:var(--mj-muted)]">{t('bookingQueueSub')}</p>
          </div>
          <CenterPill tone="amber" dot>{t('openRequests', { n: queue.length })}</CenterPill>
        </div>

        <div className="space-y-2.5 p-4">
          {queue.length > 0 ? (
            queue.map((item) => (
              <QueueItemRow key={item.id} item={item} onChanged={reload} />
            ))
          ) : (
            <div className="mj-empty">
              <CheckCircle2 className="mj-empty-icon" />
              <p className="text-sm">{t('allRequestsReviewed')}</p>
            </div>
          )}
        </div>
      </section>

      {showAddModal && (
        <AddBookingModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onDone={() => {
            setShowAddModal(false);
            reload();
          }}
        />
      )}

      {showManageModal && <ManageRoomsModal open={showManageModal} onClose={() => setShowManageModal(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Queue item row                                                      */
/* ------------------------------------------------------------------ */

function QueueItemRow({ item, onChanged }: { item: QueueItem; onChanged: () => void }) {
  const { t } = useT();
  const toast = useToast();

  const changeStatus = async (status: string) => {
    try {
      await api.patch(`/center/bookings/${item.id}/status`, { status });
      toast.success(status === 'APPROVED' ? t('bookingApprovedToast') : t('bookingRejectedToast'));
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const dayLabel = item.dayOfWeek != null ? DAY_LABELS[item.dayOfWeek] : item.date ? new Date(item.date).toLocaleDateString() : '—';

  return (
    <div className="mj-queue-item">
      <div className="min-w-0">
        <p className="mj-queue-item-title">
          {item.room} · {item.teacher}
        </p>
        <p className="mj-queue-item-msg">{item.note || item.subject || '—'}</p>
        <p className="mj-queue-item-meta">
          {formatTime(item.startTime)} إلى {formatTime(item.endTime)} · {dayLabel} ·{' '}
          {item.recurrence === 'WEEKLY' ? t('weeklyRecurring') : t('oneTime')}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          className="mj-btn mj-btn--ghost mj-btn--sm"
          aria-label={t('approveBooking')}
          title={t('approveBooking')}
          onClick={() => changeStatus('APPROVED')}
        >
          <Check className="h-4 w-4 text-[color:var(--mj-success)]" />
        </button>
        <button
          type="button"
          className="mj-btn mj-btn--ghost mj-btn--sm"
          aria-label={t('rejectBooking')}
          title={t('rejectBooking')}
          onClick={() => changeStatus('CANCELLED')}
        >
          <X className="h-4 w-4 text-[color:var(--mj-danger)]" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add booking modal                                                   */
/* ------------------------------------------------------------------ */

function AddBookingModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [formData, setFormData] = useState<FormData | null>(null);
  const today = useMemo(() => startOfToday(), []);
  const days = useMemo(() => nextDays(7, today), [today]);
  const [form, setForm] = useState({
    roomId: '',
    teacherId: '',
    date: dateKey(today),
    dayOfWeek: String(today.getDay()),
    startTime: '16:00',
    endTime: '17:30',
    recurrence: 'ONE_TIME',
    note: '',
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<Classroom[]>('/center/account/classrooms'),
      api.get<FormData>('/center/groups/form-data'),
    ])
      .then(([roomsRes, formRes]) => {
        if (cancelled) return;
        setRooms(roomsRes.data);
        setFormData(formRes.data);
      })
      .catch(() => {
        if (cancelled) return;
        setRooms([]);
        setFormData(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roomId || !form.teacherId || !form.startTime || !form.endTime) {
      toast.error(t('requiredFields'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/center/bookings', form);
      toast.success(t('bookingCreatedToast'));
      onDone();
    } catch (err) {
      toast.error(translateConflict(errorMessage(err), t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      title={t('addBookingDialogTitle')}
      description={t('addBookingDialogDesc')}
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={submit} disabled={saving}>
            {t('pinBooking')}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-0" noValidate>
        <div className="grid grid-cols-1 gap-x-4 gap-y-0 sm:grid-cols-2">
          <div className="mj-field">
            <label className="mj-label">{t('teacherField')}</label>
            <select className="mj-select" value={form.teacherId} onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}>
              <option value="">{t('selectBranch')}</option>
              {(formData?.teachers ?? []).map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('groupRoom')}</label>
            <select className="mj-select" value={form.roomId} onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}>
              <option value="">{t('selectBranch')}</option>
              {rooms.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </div>
          <div className="mj-field sm:col-span-2">
            <label className="mj-label">{t('reasonField')}</label>
            <input
              type="text"
              className="mj-input"
              placeholder={t('reasonPlaceholder')}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('dayField')}</label>
            <select
              className="mj-select"
              value={form.date}
              onChange={(e) => {
                const d = new Date(`${e.target.value}T00:00:00`);
                setForm((f) => ({ ...f, date: e.target.value, dayOfWeek: String(d.getDay()) }));
              }}
            >
              {days.map((d) => (
                <option key={dateKey(d)} value={dateKey(d)}>
                  {d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
                </option>
              ))}
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
            <label className="mj-label">{t('fromField')}</label>
            <input type="time" className="mj-input" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('toField')}</label>
            <input type="time" className="mj-input" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
          </div>
        </div>
      </form>
    </CenterModal>
  );
}

/* ------------------------------------------------------------------ */
/* Manage rooms modal (rooms CRUD)                                     */
/* ------------------------------------------------------------------ */

function ManageRoomsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
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
    <CenterModal open={open} onClose={onClose} title={t('manageRooms')} description={t('classroomsSub')} size="lg">
      <div className="flex justify-end">
        <button type="button" className="mj-btn mj-btn--primary mj-btn--sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          {t('addClassroom')}
        </button>
      </div>

      <div className="mt-4">
        {loading && <PencilLoader label={t('loading')} />}
        {error && <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      </div>

      {!loading && rooms?.length === 0 && (
        <div className="mj-empty">
          <DoorOpen className="mj-empty-icon" />
          <p className="text-sm">{t('noClassrooms')}</p>
        </div>
      )}

      {!loading && rooms && rooms.length > 0 && (
        <ul className="mt-4 divide-y divide-[color:var(--mj-border-soft)]">
          {rooms.map((room) => (
            <li key={room.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--mj-accent-soft)] text-[color:var(--mj-accent)]">
                  <DoorOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[color:var(--mj-ink-strong)]">{room.name}</p>
                  <p className="truncate text-xs text-[color:var(--mj-muted)]">
                    {room.branch || t('noBranch')} · {room.capacity} {t('capacity')}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="mj-btn mj-btn--ghost mj-btn--sm"
                  aria-label={t('editClassroom')}
                  onClick={() => setEditing(room)}
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="mj-btn mj-btn--ghost mj-btn--sm"
                  aria-label={t('delete')}
                  onClick={() => deleteRoom(room.id)}
                >
                  <Trash2 className="h-4 w-4 text-[color:var(--mj-danger)]" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showAdd && (
        <AddRoomModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            reload();
          }}
        />
      )}
      {editing && (
        <EditRoomModal
          room={editing}
          open
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </CenterModal>
  );
}

function AddRoomModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', capacity: 20 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t('requiredFields'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/center/account/classrooms', form);
      toast.success(t('roomCreated'));
      setForm({ name: '', capacity: 20 });
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
          <input type="text" className="mj-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('capacity')}</label>
          <input
            type="number"
            className="mj-input"
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: parseInt(e.target.value) || 20 }))}
          />
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
    if (!form.name.trim()) {
      toast.error(t('requiredFields'));
      return;
    }
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
          <input type="text" className="mj-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('capacity')}</label>
          <input
            type="number"
            className="mj-input"
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: parseInt(e.target.value) || 20 }))}
          />
        </div>
      </form>
    </CenterModal>
  );
}
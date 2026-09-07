'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock,
  MessageCircle,
  Settings2,
} from 'lucide-react';
import { useT } from '../../i18n';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useCenterBranch } from './dashboard/CenterBranchContext';
import { CenterModal } from './ui/CenterModal';

/* ------------------------------------------------------------------ */
/* Types (reference dashboard layout)                                  */
/* ------------------------------------------------------------------ */

type RoomTimelineStatus = 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING' | 'PENDING';
type RoomStatus = 'IN_PROGRESS' | 'AVAILABLE' | 'PENDING_CONFIRM';

interface RoomLesson {
  id: string;
  teacher: string;
  subject: string;
  grade: string;
  startTime: string;
  endTime: string;
  status: RoomTimelineStatus;
}

interface RoomInfo {
  id: string;
  name: string;
  status: RoomStatus;
  lessons: RoomLesson[];
}

interface Escalation {
  id: string;
  kind: 'complaint' | 'booking' | 'settlement';
  actionUrl: string;
  room?: string;
  teacher?: string;
  startTime?: string;
  endTime?: string;
  subject?: string;
  severity?: string;
  assignee?: string | null;
  count?: number;
  createdAt?: string;
}

interface RecentMessage {
  id: string;
  sender: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface RecentComplaint {
  id: string;
  severity: string;
  subject: string;
  status: string;
  createdAt: string;
}

interface DashboardMetrics {
  occupancyRate: number;
  todayIncome: number;
  totalCollected: number;
  completedLessonsToday: number;
  todayLessons: number;
  todayBookings: number;
  teachersThisWeek: number;
  activeStudents: number;
  messages: { total: number; unread: number; lastAt: string | null };
  complaints: { total: number; open: number; critical: number; high: number; medium: number; low: number };
  comparison: {
    prevMonthIncome: number;
    prevMonthCollected: number;
    prevMonthAvgDaily: number;
    prevYearAvgDaily: number;
  };
}

interface DashboardData {
  metrics: DashboardMetrics;
  rooms: RoomInfo[];
  escalations: Escalation[];
  recentMessages: RecentMessage[];
  recentComplaints: RecentComplaint[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const OPERATING_START_MIN = 7 * 60;
const OPERATING_END_MIN = 22 * 60;

function toMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + (m || 0);
}

function formatHour(minutes: number): string {
  const h = minutes / 60;
  if (minutes === OPERATING_START_MIN) return '7:00';
  const hour12 = Math.floor(h);
  const suffix = hour12 >= 12 ? 'م' : 'ص';
  const display = hour12 % 12 === 0 ? 12 : hour12 % 12;
  return `${display}:00 ${suffix}`;
}

function formatTime(value: string | undefined): string {
  if (!value) return '';
  const [h, m] = value.split(':').map(Number);
  const suffix = h >= 12 ? 'م' : 'ص';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return 'الآن';
  if (mins < 60) return `${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `${days} يوم`;
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

type CompareTarget = 'lastMonth' | 'sameMonthLastYear' | 'target';

const COMPARE_KEY = 'maarej.compareTarget';

export default function CenterDashboardPage() {
  const { t, lang, dir } = useT();
  const { center } = useAuth();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const { branches, branchId: branchFilter, setBranches } = useCenterBranch();
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareTarget, setCompareTargetState] = useState<CompareTarget>('lastMonth');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  useEffect(() => {
    if (branches.length > 0) return;
    api.get<{ id: string; name: string }[]>('/center/account/branches')
      .then((res) => setBranches(res.data || []))
      .catch(() => {});
  }, [branches.length, setBranches]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COMPARE_KEY) as CompareTarget | null;
      if (stored && ['lastMonth', 'sameMonthLastYear', 'target'].includes(stored)) {
        setCompareTargetState(stored);
      }
    } catch {}
  }, []);

  const setCompareTarget = (next: CompareTarget) => {
    setCompareTargetState(next);
    try {
      window.localStorage.setItem(COMPARE_KEY, next);
    } catch {}
  };

  const { data, loading, error } = useApi<DashboardData>(
    () => api.get<DashboardData>('/center/account/dashboard', branchFilter ? { branchId: branchFilter } : undefined),
    [branchFilter]
  );

  const selectedRoom = useMemo(() => {
    if (!data?.rooms || data.rooms.length === 0) return null;
    if (selectedRoomId) {
      const found = data.rooms.find((r) => r.id === selectedRoomId);
      if (found) return found;
    }
    return data.rooms[0];
  }, [data, selectedRoomId]);

  useEffect(() => {
    if (data?.rooms && data.rooms.length > 0 && !data.rooms.some((r) => r.id === selectedRoomId)) {
      setSelectedRoomId(data.rooms[0].id);
    }
  }, [data, selectedRoomId]);

  if (loading || !data) return <PencilLoader label={t('loadingDashboard')} />;
  if (error) return <Alert message={error} />;

  const m = data.metrics;
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const currentHourFraction = ((nowMinutes - OPERATING_START_MIN) / (OPERATING_END_MIN - OPERATING_START_MIN)) * 100;

  const roomStatusLabel: Record<RoomStatus, string> = {
    IN_PROGRESS: t('roomLive'),
    AVAILABLE: t('roomAvailable'),
    PENDING_CONFIRM: t('roomPendingConfirm'),
  };

  const roomStatusTone: Record<RoomStatus, 'live' | 'available' | 'pending'> = {
    IN_PROGRESS: 'live',
    AVAILABLE: 'available',
    PENDING_CONFIRM: 'pending',
  };

  const metricCards = [
    {
      key: 'occupancy',
      href: '/center/classrooms',
      label: t('metricOccupancy'),
      value: `${m.occupancyRate}%`,
      line: t('metricOccupancyLine'),
      note: t('metricOccupancyNote'),
    },
    {
      key: 'income',
      href: '/center/finance',
      label: t('metricIncomeToday'),
      value: `${m.todayIncome.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} ج.م`,
      line: t('metricIncomeTodayLine'),
      note: compareTarget === 'sameMonthLastYear'
        ? m.comparison.prevYearAvgDaily > 0
          ? `${Math.abs(Math.round(((m.todayIncome - m.comparison.prevYearAvgDaily) / m.comparison.prevYearAvgDaily) * 100))}%`
          : ''
        : `${Math.abs(Math.round(((m.todayIncome - m.comparison.prevMonthAvgDaily) / (m.comparison.prevMonthAvgDaily || 1)) * 100))}%`,
      notePositive: m.todayIncome >= m.comparison.prevMonthAvgDaily,
    },
    {
      key: 'collected',
      href: '/center/finance',
      label: t('metricCollected'),
      value: `${m.totalCollected.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} ج.م`,
      line: t('metricCollectedLine'),
    },
    {
      key: 'completed',
      href: '/center/classrooms',
      label: t('metricCompletedToday'),
      value: String(m.completedLessonsToday),
      line: t('metricCompletedTodayLine'),
      note: t('metricCompletedTodayNote', { total: m.todayBookings }),
    },
    {
      key: 'teachers',
      href: '/center/teachers',
      label: t('metricTeachersWeek'),
      value: String(m.teachersThisWeek),
      line: t('metricTeachersWeekLine'),
      note: t('metricTeachersWeekNote'),
    },
    {
      key: 'students',
      href: '/center/students',
      label: t('metricActiveStudents'),
      value: String(m.activeStudents),
      line: t('metricActiveStudentsLine'),
      note: t('metricActiveStudentsNote'),
    },
    {
      key: 'messages',
      href: '/center/communications?view=messages',
      label: t('metricEmployeeMessages'),
      value: String(m.messages.total),
      line: t('metricEmployeeMessagesLine', { unread: m.messages.unread }),
      note: m.messages.lastAt ? t('metricEmployeeMessagesHint', { time: relativeTime(m.messages.lastAt) }) : '',
    },
    {
      key: 'complaints',
      href: '/center/communications?view=complaints',
      label: t('metricOpenComplaints'),
      value: String(m.complaints.total),
      line: t('metricOpenComplaintsLine'),
      note: t('metricOpenComplaintsHint', {
        critical: m.complaints.critical,
        high: m.complaints.high,
        medium: m.complaints.medium,
        low: m.complaints.low,
      }),
    },
  ];

  const totalHours = 15; // 07:00 - 22:00

  const escalateIcon = (kind: string) =>
    kind === 'complaint' ? AlertTriangle : kind === 'booking' ? CalendarClock : CheckCircle2;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-[0.8125rem] font-bold text-[color:var(--mj-muted-2)]">
            {center?.name || t('centerDashboard')}
          </div>
          <h1 className="text-[1.625rem] font-bold leading-tight text-[color:var(--mj-ink-strong)]">
            {t('followUpDashboardTitle')}
          </h1>
          <p className="mt-1 max-w-[46rem] text-[0.9375rem] text-[color:var(--mj-muted)]">
            {t('followUpDashboardSub')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCompareOpen(true)}
          className="mj-btn mj-btn--ghost"
        >
          <Settings2 className="h-4 w-4" />
          {t('setupComparison')}
        </button>
      </div>

      {/* Primary indicators */}
      <section aria-label={t('primaryIndicators')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metricCards.map((card) => (
            <Link
              key={card.key}
              href={card.href}
              className="mj-metric-link"
              aria-label={`${card.label} ${card.value} ${card.line} ${card.note || ''}`}
            >
              <div className="mj-metric">
                <div className="mj-metric-label">{card.label}</div>
                <div className="mj-metric-value">{card.value}</div>
                <div className="mj-metric-line">{card.line}</div>
                {card.note && (
                  <div className="mj-metric-note">
                    {card.note}
                    {card.key === 'income' && card.note && (
                      <span className={`ms-1 ${card.notePositive ? 'text-[color:var(--mj-success)]' : 'text-[color:var(--mj-danger)]'}`}>
                        {card.notePositive ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Room status timeline */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[1.05rem] font-bold text-[color:var(--mj-ink-strong)]">
              {t('roomsStatusTitle')}
            </h2>
            <p className="mt-0.5 text-[0.8125rem] text-[color:var(--mj-muted)]">{t('roomsStatusSub')}</p>
          </div>
          <Link href="/center/classrooms" className="mj-link text-sm font-semibold">
            {t('manageRooms')} <Arrow className="ms-0.5 inline h-3.5 w-3.5" />
          </Link>
        </div>

        {data.rooms && data.rooms.length > 0 ? (
          <div className="mj-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-4 py-3">
              <div
                role="tablist"
                aria-label={t('chooseRoom')}
                className="mj-room-tabs"
              >
                {data.rooms.map((room) => (
                  <button
                    key={room.id}
                    role="tab"
                    type="button"
                    aria-selected={selectedRoom?.id === room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`mj-room-tab ${selectedRoom?.id === room.id ? 'mj-room-tab--active' : ''}`}
                  >
                    <strong>{room.name}</strong>
                    <span className={`mj-room-tab-status mj-room-tab-status--${roomStatusTone[room.status]}`}>
                      {roomStatusLabel[room.status]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mj-timeline-legend">
                <span className="mj-legend-item"><span className="mj-legend-dot mj-legend-dot--finished" />{t('timelineFinished')}</span>
                <span className="mj-legend-item"><span className="mj-legend-dot mj-legend-dot--live" />{t('timelineLive')}</span>
                <span className="mj-legend-item"><span className="mj-legend-dot mj-legend-dot--upcoming" />{t('timelineUpcoming')}</span>
                <span className="mj-legend-item"><span className="mj-legend-dot mj-legend-dot--pending" />{t('timelinePending')}</span>
              </div>
            </div>

            {selectedRoom && (
              <div role="tabpanel" aria-label={`${selectedRoom.name} ${t('schedule')}`} className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong className="text-sm text-[color:var(--mj-ink-strong)]">{selectedRoom.name}</strong>
                    <span className="ms-2 text-xs text-[color:var(--mj-muted)]">
                      {roomStatusLabel[selectedRoom.status]}
                    </span>
                  </div>
                </div>

                <div className="mj-timeline">
                  {/* Hour ruler */}
                  <div className="mj-timeline-hours" aria-hidden>
                    {Array.from({ length: totalHours }, (_, i) => {
                      const start = OPERATING_START_MIN + i * 60;
                      const left = (i / totalHours) * 100;
                      return (
                        <span
                          key={start}
                          className="mj-timeline-hour"
                          style={{ insetInlineStart: `${left}%` }}
                        >
                          {formatHour(start)}
                        </span>
                      );
                    })}
                    <span className="mj-timeline-hour" style={{ insetInlineStart: '100%' }}>{formatHour(OPERATING_END_MIN)}</span>
                  </div>

                  {/* Timeline track */}
                  <div className="mj-timeline-track">
                    {/* Grid lines at each hour */}
                    {Array.from({ length: totalHours + 1 }, (_, i) => (
                      <span
                        key={i}
                        aria-hidden
                        className="absolute inset-y-0 w-px bg-[color:var(--mj-border-soft)]"
                        style={{ insetInlineStart: `${(i / totalHours) * 100}%` }}
                      />
                    ))}

                    {/* Lesson slots */}
                    {selectedRoom.lessons.map((lesson) => {
                      const startMin = toMinutes(lesson.startTime);
                      const endMin = toMinutes(lesson.endTime);
                      const left = ((Math.max(startMin, OPERATING_START_MIN) - OPERATING_START_MIN) / (OPERATING_END_MIN - OPERATING_START_MIN)) * 100;
                      const width = ((Math.min(endMin, OPERATING_END_MIN) - Math.max(startMin, OPERATING_START_MIN)) / (OPERATING_END_MIN - OPERATING_START_MIN)) * 100;

                      const slotTone =
                        lesson.status === 'COMPLETED' ? 'finished'
                        : lesson.status === 'IN_PROGRESS' ? 'live'
                        : 'upcoming';

                      return (
                        <Link
                          key={lesson.id}
                          href="/center/classrooms"
                          className={`mj-timeline-slot mj-timeline-slot--${slotTone}`}
                          style={{ insetInlineStart: `${left}%`, width: `${width}%` }}
                        >
                          <strong className="truncate text-[0.75rem] font-bold">{lesson.teacher}</strong>
                          <span className="truncate text-[0.6875rem] font-medium">
                            {lesson.subject} · {lesson.grade}
                          </span>
                          <span className="truncate text-[0.625rem] font-semibold opacity-80">
                            {formatTime(lesson.startTime)}–{formatTime(lesson.endTime)}
                          </span>
                        </Link>
                      );
                    })}

                    {/* Pending booking indicator */}
                    {selectedRoom.lessons.length === 0 && selectedRoom.status === 'PENDING_CONFIRM' && (
                      <div
                        className="mj-timeline-slot mj-timeline-slot--pending"
                        style={{ insetInlineStart: '0%', width: '15%' }}
                      >
                        <strong className="truncate text-[0.75rem] font-bold">{t('timelinePending')}</strong>
                        <span className="truncate text-[0.625rem] font-semibold opacity-80">{t('roomPendingConfirm')}</span>
                      </div>
                    )}

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
            )}

            {!selectedRoom && data.rooms.length === 0 && (
              <div className="mj-empty">
                <Clock className="mj-empty-icon" />
                <p className="text-sm">{t('noClassrooms')}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mj-card mj-empty">
            <Clock className="mj-empty-icon" />
            <p className="text-sm">{t('noClassrooms')}</p>
          </div>
        )}
      </section>

      {/* Escalated alerts + Messages + Complaints */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Escalated alerts */}
        <article className="mj-card p-5 lg:col-span-2">
          <div className="mb-1">
            <h2 className="text-[1.05rem] font-bold text-[color:var(--mj-ink-strong)]">
              {t('escalatedTitle')}
            </h2>
            <p className="mt-0.5 text-[0.8125rem] text-[color:var(--mj-muted)]">{t('escalatedSub')}</p>
          </div>
          <div className="mt-4 space-y-2.5">
            {data.escalations.length > 0 ? (
              data.escalations.map((esc) => {
                const Icon = escalateIcon(esc.kind);
                return (
                  <div key={esc.id} className="mj-alert-item">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        esc.kind === 'complaint' ? 'bg-[color:var(--mj-danger-soft)] text-[color:var(--mj-danger)]'
                        : esc.kind === 'booking' ? 'bg-[color:var(--mj-amber-soft)] text-[color:var(--mj-amber)]'
                        : 'bg-[color:var(--mj-link-soft)] text-[color:var(--mj-link)]'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="mj-alert-item-title">
                          {esc.kind === 'complaint' ? esc.subject
                            : esc.kind === 'booking' ? t('escalatedBookingTitle')
                            : t('escalatedSettlementTitle')}
                        </p>
                        <p className="mj-alert-item-msg">
                          {esc.kind === 'complaint' ? `${t('escalatedOwner', { name: esc.assignee || t('complaints') })} · ${esc.severity || ''}`
                            : esc.kind === 'booking' ? t('escalatedBookingMsg', { room: esc.room || '' })
                            : t('escalatedSettlementMsg')}
                        </p>
                        <p className="mj-alert-item-meta">
                          {esc.kind === 'booking'
                            ? `${t('escalatedOwner', { name: esc.teacher || '' })}`
                            : esc.kind === 'complaint'
                              ? `${t('escalatedOwner', { name: esc.assignee || t('complaints') })}`
                              : `${t('escalatedOwner', { name: t('escalatedAccounting') })}`}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={esc.actionUrl}
                      className="shrink-0 text-sm font-bold text-[color:var(--mj-accent)] hover:underline"
                    >
                      {esc.kind === 'booking' ? t('openRequest') : t('escalatedReview')}
                    </Link>
                  </div>
                );
              })
            ) : (
              <div className="mj-empty">
                <CheckCircle2 className="mj-empty-icon" />
                <p className="text-sm">{t('allCaughtUp')}</p>
              </div>
            )}
          </div>
        </article>

        {/* Right column: messages + complaints */}
        <div className="space-y-4">
          <article className="mj-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-5 py-4">
              <div>
                <h2 className="text-[0.95rem] font-bold text-[color:var(--mj-ink-strong)]">
                  {t('messagesCardTitle')}
                </h2>
                <p className="mt-0.5 text-[0.75rem] text-[color:var(--mj-muted)]">{t('messagesCardSub')}</p>
              </div>
              <Link href="/center/communications?view=messages" className="mj-link text-sm font-semibold">
                {t('allMessages')}
              </Link>
            </div>
            <div className="divide-y divide-[color:var(--mj-border-soft)] px-5">
              {data.recentMessages.length > 0 ? (
                data.recentMessages.slice(0, 2).map((msg) => (
                  <div key={msg.id} className="mj-msg-item">
                    <span className="mj-msg-avatar">{msg.sender?.trim().charAt(0) || '؟'}</span>
                    <div className="mj-msg-body">
                      <p className="mj-msg-sender">{msg.sender}</p>
                      <p className="mj-msg-text">{msg.message}</p>
                      <p className="mj-msg-time">{relativeTime(msg.createdAt)}</p>
                    </div>
                    {!msg.read && <span className="mj-msg-badge">{t('newBadge')}</span>}
                  </div>
                ))
              ) : (
                <div className="mj-empty">
                  <MessageCircle className="mj-empty-icon" />
                  <p className="text-sm">{t('noMessages')}</p>
                </div>
              )}
            </div>
          </article>

          <article className="mj-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-5 py-4">
              <div>
                <h2 className="text-[0.95rem] font-bold text-[color:var(--mj-ink-strong)]">
                  {t('complaintsCardTitle')}
                </h2>
                <p className="mt-0.5 text-[0.75rem] text-[color:var(--mj-muted)]">{t('complaintsCardSub')}</p>
              </div>
              <Link href="/center/communications?view=complaints" className="mj-link text-sm font-semibold">
                {t('allComplaints')}
              </Link>
            </div>
            <div className="space-y-3 px-5 py-4">
              {data.recentComplaints.length > 0 ? (
                data.recentComplaints.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-start gap-3">
                    <span className={`mj-pill ${c.severity === 'CRITICAL' ? 'mj-pill--red' : c.severity === 'HIGH' ? 'mj-pill--amber' : c.severity === 'MEDIUM' ? 'mj-pill--blue' : 'mj-pill--slate'}`}>
                      {c.severity === 'CRITICAL' ? t('complaintCritical') : c.severity === 'HIGH' ? t('complaintHigh') : c.severity === 'MEDIUM' ? t('complaintMedium') : t('complaintLow')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[color:var(--mj-ink-strong)]">{c.subject}</p>
                      <p className="mt-0.5 text-xs text-[color:var(--mj-muted-2)]">
                        {c.status === 'OPEN' ? t('complaintsNew') : t('complaintsInReview')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="mj-empty">
                  <BellRing className="mj-empty-icon" />
                  <p className="text-sm">{t('noComplaints')}</p>
                </div>
              )}
            </div>
          </article>
        </div>
      </div>

      {/* Comparison setup modal */}
      <CenterModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        title={t('comparisonDialogTitle')}
        description={t('comparisonDialogDesc')}
      >
        <div className="space-y-3">
          <p className="text-sm font-bold text-[color:var(--mj-muted)]">{t('compareWith')}</p>
          {([
            ['lastMonth', t('compareLastMonth')],
            ['sameMonthLastYear', t('compareSameMonthLastYear')],
            ['target', t('compareTarget')],
          ] as [CompareTarget, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCompareTarget(value)}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-start text-sm font-semibold transition-colors ${
                compareTarget === value
                  ? 'border-[color:var(--mj-accent)] bg-[color:var(--mj-accent-soft)] text-[color:var(--mj-accent)]'
                  : 'border-[color:var(--mj-border)] text-[color:var(--mj-ink)] hover:bg-[color:var(--mj-wash)]'
              }`}
            >
              {label}
              {compareTarget === value && <CheckCircle2 className="h-4 w-4" />}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={() => setCompareOpen(false)} className="mj-btn mj-btn--ghost">
            {t('cancel')}
          </button>
          <button type="button" onClick={() => setCompareOpen(false)} className="mj-btn mj-btn--primary">
            {t('saveChoice')}
          </button>
        </div>
      </CenterModal>
    </div>
  );
}

'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Send, Pause, Play, MessageSquareText } from 'lucide-react';
import { PageBackButton } from '../../../components/layout/PageBackButton';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill, type CenterPillTone } from '../ui/CenterPill';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey, type TranslateParams } from '../../../i18n';
import { formatCurrency, formatDate, formatDateTime, formatTime, dayName, timeAgo, isToday } from '../../../lib/format';

type T = (key: DictKey, params?: TranslateParams) => string;

type AgreementType = 'session' | 'monthly';

interface Agreement {
  type: AgreementType;
  amount: number;
}

interface GroupBrief {
  id: string;
  name: string;
  room: string | null;
  subject: string | null;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  capacity: number;
  studentCount: number;
}

interface BookingBrief {
  id: string;
  room: string;
  group: string | null;
  date: string | null;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  recurrence: string;
  status: string;
  createdAt: string;
}

interface PaymentBrief {
  id: string;
  paymentNumber: string;
  student: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
}

interface SettlementBrief {
  id: string;
  period: string;
  status: string;
  grossAmount: number;
  platformCommission: number;
  teacherShare: number;
  centerShare: number;
  netAmount: number;
  settledAt: string | null;
  createdAt: string;
}

interface ConversationMessage {
  id: string;
  senderRole: string;
  body: string;
  read: boolean;
  createdAt: string;
}

interface ConversationBrief {
  id: string;
  student: string;
  updatedAt: string;
  messages: ConversationMessage[];
}

interface ComplaintBrief {
  id: string;
  code: string;
  subject: string;
  description: string;
  severity: string;
  status: string;
  createdAt: string;
}

interface ActivityBrief {
  id: string;
  action: string;
  details: string | null;
  user: string | null;
  createdAt: string;
}

interface TeacherDetail {
  id: string;
  userId: string;
  bio: string | null;
  yearsExperience: number;
  hourlyRate: number;
  photo: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    username: string;
    phone: string | null;
    email: string | null;
    photo: string | null;
    status: string;
  };
  subjects: { subject: { id: string; name: string } }[];
  grades: { grade: { id: string; name: string } }[];
  location: { id: string; name: string } | null;
  ratings: { stars: number; comment: string | null; createdAt: string }[];
  agreement: Agreement;
  stats: { activeBookings: number; groups: number; students: number; dueSettlement: number };
  groups: GroupBrief[];
  bookings: BookingBrief[];
  payments: PaymentBrief[];
  settlements: SettlementBrief[];
  conversations: ConversationBrief[];
  complaints: ComplaintBrief[];
  activity: ActivityBrief[];
  students: { id: string; fullName: string; grade: string | null }[];
}

type DetailTab =
  | 'overview'
  | 'bookings'
  | 'groups'
  | 'collections'
  | 'settlements'
  | 'communications'
  | 'transactions';

const TAB_LIST: { id: DetailTab; labelKey: DictKey }[] = [
  { id: 'overview', labelKey: 'overview' },
  { id: 'bookings', labelKey: 'bookingsAppointmentsTab' },
  { id: 'groups', labelKey: 'groupsStudentsTab' },
  { id: 'collections', labelKey: 'collectionsTab' },
  { id: 'settlements', labelKey: 'financialSettlementsTab' },
  { id: 'communications', labelKey: 'communicationsTabLabel' },
  { id: 'transactions', labelKey: 'transactionsTabLabel' },
];

function bookingSlot(b: BookingBrief) {
  const time = `${formatTime(b.startTime)} – ${formatTime(b.endTime)}`;
  if (b.date) return `${formatDate(b.date)} · ${time}`;
  if (b.dayOfWeek !== null && b.dayOfWeek !== undefined) return `${dayName(b.dayOfWeek)} · ${time}`;
  return time;
}

function bookingStatusPill(status: string, t: T) {
  if (status === 'APPROVED') return <CenterPill tone="green">{t('timelineUpcoming')}</CenterPill>;
  if (status === 'PENDING') return <CenterPill tone="amber">{t('pendingApproval')}</CenterPill>;
  if (status === 'CANCELLED') return <CenterPill tone="red">{t('cancelledBooking')}</CenterPill>;
  if (status === 'COMPLETED') return <CenterPill tone="slate">{t('finishedBooking')}</CenterPill>;
  return <CenterPill tone="slate">{status}</CenterPill>;
}

function paymentStatusPill(status: string, t: T) {
  const key = status.toLowerCase() as DictKey;
  switch (status) {
    case 'PAID':
    case 'COMPLETED':
      return <CenterPill tone="green">{t(key)}</CenterPill>;
    case 'PENDING':
      return <CenterPill tone="amber">{t(key)}</CenterPill>;
    case 'REJECTED':
      return <CenterPill tone="red">{t(key)}</CenterPill>;
    case 'REFUNDED':
      return <CenterPill tone="slate">{t(key)}</CenterPill>;
    default:
      return <CenterPill tone="slate">{status}</CenterPill>;
  }
}

function severityTone(severity: string): CenterPillTone {
  if (severity === 'HIGH') return 'red';
  if (severity === 'MEDIUM') return 'amber';
  if (severity === 'LOW') return 'blue';
  return 'slate';
}

function complaintStatusTone(status: string): CenterPillTone {
  if (status === 'RESOLVED') return 'green';
  if (status === 'IN_PROGRESS') return 'amber';
  if (status === 'REJECTED') return 'red';
  return 'slate';
}

function actionLabel(action: string, t: T): string {
  switch (action) {
    case 'created_teacher':
      return t('addTeacher');
    case 'updated_teacher':
      return t('editTeacher');
    case 'set_teacher_status_active':
      return t('resumeCollaboration');
    case 'set_teacher_status_inactive':
      return t('pauseCollaboration');
    case 'sent_center_message':
      return t('send');
    default:
      return action.replace(/_/g, ' ');
  }
}

function toInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function monthYear(value: string, lang: 'ar' | 'en') {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const months =
    lang === 'ar'
      ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[d.getMonth()] + ' ' + d.getFullYear();
}

export default function CenterTeacherDetailPage() {
  const { t, lang } = useT();
  const toast = useToast();
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<DetailTab>('overview');
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const composerRef = useRef<HTMLDivElement | null>(null);

  const { data: teacher, loading, error, reload } = useApi<TeacherDetail>(
    () => api.get<TeacherDetail>(`/center/teachers/${params.id}`),
    [params.id]
  );

  if (loading && !teacher) return <PencilLoader label={t('loading')} />;
  if (error && !teacher) return <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>;
  if (!teacher) return null;

  const statusTone = teacher.user.status === 'ACTIVE' ? 'green' : 'slate';
  const currentSettlement = [...teacher.settlements].sort((a, b) => (a.status === 'PENDING' || a.status === 'CALCULATED' ? -1 : 1) - (b.status === 'PENDING' || b.status === 'CALCULATED' ? -1 : 1)).find((s) => s.status === 'PENDING' || s.status === 'CALCULATED');
  const upcomingBookings = teacher.bookings.filter((b) => b.status === 'APPROVED').slice(0, 6);
  const nextBooking = upcomingBookings[0] ?? null;
  const weekPayments = teacher.payments.filter((p) => isToday(p.createdAt) && p.status === 'PAID');
  const weekTotal = weekPayments.reduce((sum, p) => sum + p.amount, 0);

  const openComposer = () => {
    setTab('communications');
    window.setTimeout(() => composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  };

  const goToComms = () => openComposer();
  const goToBookings = () => setTab('bookings');

  const handleSendMessage = async () => {
    const body = message.trim();
    if (!body) return;
    setSendingMessage(true);
    try {
      await api.post('/center/messages', {
        recipientId: teacher.userId,
        subject: t('messagePrepared', { name: teacher.user.fullName }),
        message: body,
      });
      toast.success(t('messageSentToast', { name: teacher.user.fullName }));
      setMessage('');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSendingMessage(false);
    }
  };

  const toggleStatus = async () => {
    setTogglingStatus(true);
    try {
      const next = teacher.user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.patch(`/center/teachers/${teacher.id}/status`, { status: next });
      toast.success(t('teacherStatusUpdated'));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setTogglingStatus(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageBackButton />

      <CenterPageHeader eyebrow={t('teacherFileEyebrow')} title={teacher.user.fullName} description={teacher.user.username}>
        <button type="button" className="mj-btn mj-btn--primary" onClick={goToComms}>
          <Send className="h-4 w-4" />
          {t('sendMessage')}
        </button>
      </CenterPageHeader>

      {/* Teacher brief */}
      <div className="mj-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[color:var(--mj-border-soft)] p-5 sm:flex-row sm:items-center">
          <span className="mj-avatar mj-avatar--md shrink-0">
            {teacher.photo ? <img src={teacher.photo} alt="" className="h-10 w-10 rounded-full object-cover" /> : toInitials(teacher.user.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-[color:var(--mj-ink-strong)]">{teacher.user.fullName}</h2>
              <CenterPill tone={statusTone}>
                {teacher.user.status === 'ACTIVE' ? t('active') : t('inactive')}
              </CenterPill>
            </div>
            <p className="mt-1 text-sm text-[color:var(--mj-muted)]">{teacher.bio || t('noBio')}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[color:var(--mj-muted-2)]">
              <span>{t('teacherFileEyebrow')} · {t('collaborationSince', { month: monthYear(teacher.createdAt, lang).split(' ')[0], year: monthYear(teacher.createdAt, lang).split(' ')[1] })}</span>
              {teacher.user.phone && <span dir="ltr">{teacher.user.phone}</span>}
              {teacher.location?.name && <span>{teacher.location.name}</span>}
            </div>
          </div>
          {teacher.subjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {teacher.subjects.map((s) => <CenterPill key={s.subject.id} tone="blue">{s.subject.name}</CenterPill>)}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CenterStatCard value={teacher.stats.activeBookings} label={t('activeBookings')} />
        <CenterStatCard value={teacher.stats.groups} label={t('groups')} />
        <CenterStatCard value={teacher.stats.students} label={t('students')} />
        <CenterStatCard value={formatCurrency(teacher.stats.dueSettlement, lang)} label={t('settlementDueAmount')} />
      </div>

      <div className="mj-detail-grid">
        {/* Main column */}
        <div className="mj-detail-main">
          <div className="mj-tabs">
            {TAB_LIST.map((tb) => (
              <button key={tb.id} type="button" className={`mj-tab ${tab === tb.id ? 'mj-tab--active' : ''}`} onClick={() => setTab(tb.id)}>
                {t(tb.labelKey)}
              </button>
            ))}
          </div>

          {tab === 'overview' && <OverviewTab teacher={teacher} nextBooking={nextBooking} current={currentSettlement ?? null} onViewBookings={goToBookings} lang={lang} t={t} />}

          {tab === 'bookings' && <BookingsTab teacher={teacher} t={t} />}

          {tab === 'groups' && <GroupsTab teacher={teacher} t={t} />}

          {tab === 'collections' && <CollectionsTab teacher={teacher} weekTotal={weekTotal} lang={lang} t={t} />}

          {tab === 'settlements' && <SettlementsTab teacher={teacher} current={currentSettlement ?? null} lang={lang} t={t} />}

          {tab === 'communications' && (
            <div ref={composerRef}>
              <CommunicationsTab teacher={teacher} message={message} setMessage={setMessage} sending={sendingMessage} onSend={handleSendMessage} lang={lang} t={t} />
            </div>
          )}

          {tab === 'transactions' && <TransactionsTab teacher={teacher} lang={lang} t={t} />}
        </div>

        {/* Side column */}
        <div className="mj-detail-side">
          <div className="mj-agreement">
            <div className="mj-agreement-type">{t('agreementWithCenter')}</div>
            <div className="mj-agreement-amount">
              {formatCurrency(teacher.agreement.amount, lang)}
              <span className="ms-2 text-sm font-bold text-[color:var(--mj-accent-strong)]">
                {teacher.agreement.type === 'monthly' ? t('agreementMonthly') : t('agreementSession')}
              </span>
            </div>
            <div className="mj-agreement-note">{t('agreementSince', { month: monthYear(teacher.createdAt, lang).split(' ')[0], year: monthYear(teacher.createdAt, lang).split(' ')[1] })}</div>
          </div>

          <div className="mj-side-card">
            <div className="mb-1 text-sm font-bold text-[color:var(--mj-ink-strong)]">{t('agreementTypeField')}</div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('agreementTypeField')}</span>
              <span className="mj-side-row-value">{teacher.agreement.type === 'monthly' ? t('agreementMonthly') : t('agreementSession')}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('currentValueField')}</span>
              <span className="mj-side-row-value">{formatCurrency(teacher.agreement.amount, lang)}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('settlementCadenceField')}</span>
              <span className="mj-side-row-value">{t('weeklyCadence')}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('collaborationStatusField')}</span>
              <span>
                <CenterPill tone={statusTone}>{teacher.user.status === 'ACTIVE' ? t('collaborationActive') : t('collaborationPaused')}</CenterPill>
              </span>
            </div>
            {currentSettlement && (
              <div className="mj-side-row">
                <span className="mj-side-row-label">{t('nextSettlementField')}</span>
                <span className="mj-side-row-value">{currentSettlement.period}</span>
              </div>
            )}
          </div>

<div className="mj-side-card">
            <button type="button" className="mj-btn mj-btn--ghost w-full" onClick={goToComms}>
              <MessageSquareText className="h-4 w-4" />
              {t('openCommLog')}
            </button>
            <button type="button" className="mj-btn mj-btn--ghost mt-2 w-full" onClick={toggleStatus} disabled={togglingStatus}>
              {teacher.user.status === 'ACTIVE' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {teacher.user.status === 'ACTIVE' ? t('pauseCollaboration') : t('resumeCollaboration')}
            </button>
            <p className="mt-3 text-xs leading-relaxed text-[color:var(--mj-muted)]">{t('pauseCollaborationNote')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupHeader({ title, action }: { title: string; action?: import('react').ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-5 py-4">
      <h3 className="font-bold text-[color:var(--mj-ink-strong)]">{title}</h3>
      {action}
    </div>
  );
}

function OverviewTab({ teacher, nextBooking, current, onViewBookings, lang, t }: {
  teacher: TeacherDetail;
  nextBooking: BookingBrief | null;
  current: SettlementBrief | null;
  onViewBookings: () => void;
  lang: 'ar' | 'en';
  t: T;
}) {
  return (
    <div className="space-y-4">
      <div className="mj-card overflow-hidden">
        <SetupHeader
          title={t('nextAppointment')}
          action={
            <button type="button" className="mj-btn mj-btn--ghost" onClick={onViewBookings}>
              {t('allBookings')}
            </button>
          }
        />
        {nextBooking ? (
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <CenterPill tone="green">{t('upcomingBooking')}</CenterPill>
              <span className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{bookingSlot(nextBooking)}</span>
              <span className="text-sm text-[color:var(--mj-muted)]">{t('room')} {nextBooking.room}</span>
              {nextBooking.group && <span className="text-sm text-[color:var(--mj-muted)]">{nextBooking.group}</span>}
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 text-sm text-[color:var(--mj-muted)]">{t('noAppointments')}</div>
        )}
      </div>

      <div className="mj-card overflow-hidden">
        <SetupHeader title={t('centerGroups')} />
        {teacher.groups.length > 0 ? (
          <div className="p-5">
            <div className="mj-sublist">
              {teacher.groups.slice(0, 3).map((g) => (
                <Link key={g.id} href={`/center/groups/${g.id}`} className="mj-sublist-item hover:border-[color:var(--mj-accent)]">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{g.name}</div>
                    <div className="mt-0.5 text-xs text-[color:var(--mj-muted)]">
                      {g.subject ?? ''}
                      {g.room ? (g.subject ? ' · ' : '') + t('room') + ' ' + g.room : ''}
                      {g.dayOfWeek !== null && g.dayOfWeek !== undefined ? ' · ' + dayName(g.dayOfWeek) : ''}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <CenterPill tone="blue">{t('groupCapacityLine', { count: g.studentCount, capacity: g.capacity })}</CenterPill>
                    <ArrowLink />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 text-sm text-[color:var(--mj-muted)]">{t('noAppointments')}</div>
        )}
      </div>

      <div className="mj-card overflow-hidden">
        <SetupHeader title={t('lastFinancialMovement')} />
        <div className="p-5">
          {teacher.payments.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{formatCurrency(teacher.payments[0].amount, lang)}</div>
                  <div className="text-xs text-[color:var(--mj-muted)]">{teacher.payments[0].student} · {formatDateTime(teacher.payments[0].createdAt, lang)}</div>
                </div>
                {paymentStatusPill(teacher.payments[0].status, t)}
              </div>
              {current && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--mj-border-soft)] pt-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{t('currentSettlement')}</div>
                    <div className="text-xs text-[color:var(--mj-muted)]">{current.period}</div>
                  </div>
                  <div className="text-end">
                    <div className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{formatCurrency(current.teacherShare, lang)}</div>
                    <span className="text-xs font-semibold text-[color:var(--mj-accent-strong)]">
                      {current.status === 'CALCULATED' || current.status === 'PENDING' ? t('settlementPendingApproval') : t('approvedForPayment')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-[color:var(--mj-muted)]">{t('noFinancialMovements')}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingsTab({ teacher, t }: { teacher: TeacherDetail; t: T }) {
  const items = teacher.bookings.length > 0 ? teacher.bookings : [];
  if (items.length === 0) {
    return (
      <div className="mj-card mj-card--padding">
        <p className="text-sm text-[color:var(--mj-muted)]">{t('noAppointments')}</p>
      </div>
    );
  }
  return (
    <div className="mj-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="mj-table">
          <thead>
            <tr>
              <th>{t('dayColumn')}</th>
              <th>{t('roomColumn')}</th>
              <th>{t('groupColumn')}</th>
              <th>{t('timeColumn')}</th>
              <th>{t('status')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id}>
                <td>
                  <span className="text-sm font-semibold text-[color:var(--mj-ink-strong)]">
                    {b.date ? formatDate(b.date) : b.dayOfWeek !== null && b.dayOfWeek !== undefined ? dayName(b.dayOfWeek) : '—'}
                  </span>
                  {b.dayOfWeek !== null && b.dayOfWeek !== undefined && b.recurrence === 'WEEKLY' && b.date && (
                    <div className="text-xs text-[color:var(--mj-muted)]">{dayName(b.dayOfWeek)}</div>
                  )}
                </td>
                <td className="text-sm text-[color:var(--mj-ink)]">{b.room}</td>
                <td className="text-sm text-[color:var(--mj-ink)]">{b.group ?? '—'}</td>
                <td className="text-sm text-[color:var(--mj-ink)]" dir="ltr">{formatTime(b.startTime)} – {formatTime(b.endTime)}</td>
                <td>{bookingStatusPill(b.status, t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupsTab({ teacher, t }: { teacher: TeacherDetail; t: T }) {
  return (
    <div className="space-y-4">
      <div className="mj-card mj-card--padding">
        <h3 className="mb-3 font-bold text-[color:var(--mj-ink-strong)]">{t('centerGroups')}</h3>
        {teacher.groups.length > 0 ? (
          <div className="mj-sublist">
            {teacher.groups.map((g) => (
              <Link key={g.id} href={`/center/groups/${g.id}`} className="mj-sublist-item hover:border-[color:var(--mj-accent)]">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{g.name}</div>
                  <div className="mt-0.5 text-xs text-[color:var(--mj-muted)]">
                    {g.subject ?? ''}
                    {g.room ? (g.subject ? ' · ' : '') + t('room') + ' ' + g.room : ''}
                    {g.dayOfWeek !== null && g.dayOfWeek !== undefined ? ' · ' + dayName(g.dayOfWeek) + ' ' + formatTime(g.startTime) : ''}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <CenterPill tone="blue">{t('groupCapacityLine', { count: g.studentCount, capacity: g.capacity })}</CenterPill>
                  <ArrowLink />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[color:var(--mj-muted)]">{t('noAppointments')}</p>
        )}
      </div>

      <div className="mj-side-card">
        <h3 className="mb-3 font-bold text-[color:var(--mj-ink-strong)]">{t('students')}</h3>
        {teacher.students && teacher.students.length > 0 ? (
          <div className="space-y-2">
            {teacher.students.map((s) => (
              <Link key={s.id} href={`/center/students/${s.id}`} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[color:var(--mj-surface-2)]">
                <span className="mj-teacher-avatar">{toInitials(s.fullName)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[color:var(--mj-ink-strong)]">{s.fullName}</span>
                  {s.grade && <span className="block text-xs text-[color:var(--mj-muted)]">{s.grade}</span>}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[color:var(--mj-muted)]">{t('noStudents')}</p>
        )}
      </div>
    </div>
  );
}

function CollectionsTab({ teacher, weekTotal, lang, t }: { teacher: TeacherDetail; weekTotal: number; lang: 'ar' | 'en'; t: T }) {
  if (teacher.payments.length === 0) {
    return (
      <div className="mj-card mj-card--padding">
        <p className="text-sm text-[color:var(--mj-muted)]">{t('noPayments')}</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <CenterStatCard value={formatCurrency(weekTotal, lang)} label={t('collectedThisWeek')} />
        <CenterStatCard value={formatCurrency(teacher.payments.reduce((s, p) => s + p.amount, 0), lang)} label={t('lastFinancialMovement')} />
      </div>
      <div className="mj-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="mj-table">
            <thead>
              <tr>
                <th>{t('operationColumn')}</th>
                <th>{t('studentColumn')}</th>
                <th>{t('valueColumn')}</th>
                <th>{t('status')}</th>
                <th>{t('dayColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {teacher.payments.slice(0, 30).map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="text-sm font-semibold text-[color:var(--mj-ink-strong)]">{p.paymentNumber}</span>
                    <div className="text-xs text-[color:var(--mj-muted)]">{p.type}</div>
                  </td>
                  <td className="text-sm text-[color:var(--mj-ink)]">{p.student}</td>
                  <td className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{formatCurrency(p.amount, lang)}</td>
                  <td>{paymentStatusPill(p.status, t)}</td>
                  <td className="text-sm text-[color:var(--mj-muted)]">{formatDate(p.createdAt, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SettlementsTab({ teacher, current, lang, t }: { teacher: TeacherDetail; current: SettlementBrief | null; lang: 'ar' | 'en'; t: T }) {
  if (teacher.settlements.length === 0) {
    return (
      <div className="mj-card mj-card--padding">
        <p className="text-sm text-[color:var(--mj-muted)]">{t('noSettlementsRecorded')}</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {current && (
        <div className="mj-agreement">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="mj-agreement-type">{t('currentSettlement')}</span>
            {current.status === 'CALCULATED' ? (
              <CenterPill tone="blue">{t('pendingApproval')}</CenterPill>
            ) : (
              <CenterPill tone="amber">{t('pendingApproval')}</CenterPill>
            )}
          </div>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs text-[color:var(--mj-muted)]">{t('collectedAmount')}</div>
              <div className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{formatCurrency(current.grossAmount, lang)}</div>
            </div>
            <div>
              <div className="text-xs text-[color:var(--mj-muted)]">{t('teacherDueAmount')}</div>
              <div className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{formatCurrency(current.teacherShare, lang)}</div>
            </div>
            <div>
              <div className="text-xs text-[color:var(--mj-muted)]">{t('centerIncomeAmount')}</div>
              <div className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{formatCurrency(current.centerShare, lang)}</div>
            </div>
            <div>
              <div className="text-xs text-[color:var(--mj-muted)]">{t('studentCount')}</div>
              <div className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{current.period}</div>
            </div>
          </div>
        </div>
      )}
      <div className="mj-card mj-card--padding">
        <p className="text-xs leading-relaxed text-[color:var(--mj-muted)]">{t('settlementAuditNote')}</p>
      </div>
      {teacher.settlements.length > 0 && (
        <div className="mj-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="mj-table">
              <thead>
                <tr>
                  <th>{t('periodColumn')}</th>
                  <th>{t('collectedAmount')}</th>
                  <th>{t('teacherDueAmount')}</th>
                  <th>{t('centerIncomeAmount')}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {teacher.settlements.slice(0, 20).map((s) => (
                  <tr key={s.id}>
                    <td className="text-sm font-semibold text-[color:var(--mj-ink-strong)]">{s.period || s.createdAt.slice(0, 10)}</td>
                    <td className="text-sm text-[color:var(--mj-ink)]">{formatCurrency(s.grossAmount, lang)}</td>
                    <td className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{formatCurrency(s.teacherShare, lang)}</td>
                    <td className="text-sm text-[color:var(--mj-ink)]">{formatCurrency(s.centerShare, lang)}</td>
                    <td>
                      {s.status === 'SETTLED' ? (
                        <CenterPill tone="green">{t('timelineFinished')}</CenterPill>
                      ) : s.status === 'CALCULATED' ? (
                        <CenterPill tone="blue">{t('pendingApproval')}</CenterPill>
                      ) : s.status === 'PENDING' ? (
                        <CenterPill tone="amber">{t('pendingApproval')}</CenterPill>
                      ) : (
                        <CenterPill tone="slate">{s.status}</CenterPill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CommunicationsTab({ teacher, message, setMessage, sending, onSend, lang, t }: {
  teacher: TeacherDetail;
  message: string;
  setMessage: (v: string) => void;
  sending: boolean;
  onSend: () => void;
  lang: 'ar' | 'en';
  t: T;
}) {
  return (
    <div className="space-y-4">
      <div className="mj-card overflow-hidden">
        <SetupHeader title={t('teacherComplaintsTitle')} />
        {teacher.complaints.length > 0 ? (
          <div className="divide-y divide-[color:var(--mj-border-soft)]">
            {teacher.complaints.slice(0, 10).map((c) => (
              <div key={c.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{c.subject}</span>
                  <CenterPill tone={severityTone(c.severity)}>{c.severity}</CenterPill>
                  <CenterPill tone={complaintStatusTone(c.status)}>{c.status}</CenterPill>
                  <span className="text-xs text-[color:var(--mj-muted-2)]">{c.code} · {formatDate(c.createdAt, lang)}</span>
                </div>
                {c.description && <p className="mt-2 text-sm leading-relaxed text-[color:var(--mj-ink)]">{c.description}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-[color:var(--mj-muted)]">{t('noComplaints')}</p>
        )}
      </div>

      <div className="mj-card overflow-hidden">
        <SetupHeader title={t('communicationLogTitle')} />
        {teacher.conversations.length > 0 ? (
          <div className="divide-y divide-[color:var(--mj-border-soft)]">
            {teacher.conversations.map((c) => (
              <div key={c.id} className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-[color:var(--mj-muted)]" />
                  <span className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{c.student}</span>
                  <span className="text-xs text-[color:var(--mj-muted-2)]">{timeAgo(c.updatedAt, lang)}</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {c.messages.map((m) => (
                    <div key={m.id} className="rounded-lg bg-[color:var(--mj-surface-2)] px-3 py-2">
                      <div className="text-[11px] font-bold text-[color:var(--mj-accent-strong)]">
                        {m.senderRole === 'TEACHER' ? t('fromTeacher') : t('toTeacher')} · {formatDateTime(m.createdAt, lang)}
                      </div>
                      <p className="mt-0.5 text-sm leading-relaxed text-[color:var(--mj-ink)]">{m.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-[color:var(--mj-muted)]">{t('noMessages')}</p>
        )}
      </div>

      <div className="mj-card mj-card--padding">
        <h3 className="mb-3 font-bold text-[color:var(--mj-ink-strong)]">{t('messagePrepared', { name: teacher.user.fullName })}</h3>
        <div className="mj-composer">
          <input
            className="mj-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={t('writeMessagePlaceholder')}
            aria-label={t('writeMessagePlaceholder')}
          />
          <button type="button" className="mj-btn mj-btn--primary shrink-0" onClick={onSend} disabled={sending || !message.trim()}>
            <Send className="h-4 w-4" />
            {t('send')}
          </button>
        </div>
      </div>
    </div>
  );
}

function TransactionsTab({ teacher, lang, t }: { teacher: TeacherDetail; lang: 'ar' | 'en'; t: T }) {
  if (teacher.activity.length === 0) {
    return (
      <div className="mj-card mj-card--padding">
        <p className="text-sm text-[color:var(--mj-muted)]">{t('noTransactions')}</p>
      </div>
    );
  }
  return (
    <div className="mj-card mj-card--padding">
      <div className="mj-comm-log">
        {teacher.activity.slice(0, 30).map((a) => (
          <div key={a.id} className="mj-log-item">
            <span className="mj-log-dot" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="mj-log-title">{actionLabel(a.action, t)}</span>
                <span className="mj-log-time">{formatDateTime(a.createdAt, lang)}</span>
              </div>
              <div className="mj-log-body">
                {a.user ? `${t('toTeacher')}: ${a.user}` : ''}
                {a.details ? (a.user ? ' · ' : '') + safeDetails(a.details) : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function safeDetails(details: string): string {
  try {
    const parsed = JSON.parse(details);
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed)
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(' · ');
    }
    return String(parsed);
  } catch {
    return details;
  }
}

function ArrowLink() {
  return <ArrowIcon />;
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4 text-[color:var(--mj-muted)] rtl:-scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

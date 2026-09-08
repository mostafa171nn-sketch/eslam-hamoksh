'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Phone, MessageSquare, Send, Calendar, AlertCircle, Snowflake, RefreshCcw, ArrowUpRight,
} from 'lucide-react';
import { PageBackButton } from '../../../components/layout/PageBackButton';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';
import { formatCurrency, timeAgo, formatTime } from '../../../lib/format';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill } from '../ui/CenterPill';

interface StudentGroup {
  enrollmentId: string;
  groupId: string;
  slug: string;
  name: string;
  subject: string | null;
  stage: string | null;
  teacher: string | null;
  room: string | null;
  branch: string | null;
  dayOfWeek: number | null;
}

interface AttendanceRow {
  id: string;
  lessonId: string;
  date: string;
  time: string;
  subject: string | null;
  status: string;
  method: string;
  markedAt: string;
}

interface PaymentRow {
  id: string;
  paymentNumber: string;
  amount: number;
  status: string;
  type: string;
  method: string;
  createdAt: string;
  paidAt: string | null;
  linkedToLesson: boolean;
  lessonDate: string | null;
  lessonSubject: string | null;
}

interface StudentDetail {
  id: string;
  code: string | null;
  fullName: string;
  username: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
  status: string;
  enrollmentStatus: string;
  grade: string | null;
  joinedAt: string;
  parent: { id: string; fullName: string; phone: string | null } | null;
  teachers: { id: string; fullName: string }[];
  subjects: string[];
  groups: StudentGroup[];
  attendance: AttendanceRow[];
  attendanceRate: number | null;
  attendanceCount: number;
  financial: { status: string; amountDue: number; totalCollected: number };
  payments: PaymentRow[];
  lastAttendance: { status: string; markedAt: string; source: string } | null;
}

interface Communication {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

type Tab = 'overview' | 'attendance' | 'financial' | 'communication';

const enrollmentTone = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'green' as const;
    case 'FROZEN': return 'slate' as const;
    case 'PENDING': return 'amber' as const;
    default: return 'slate' as const;
  }
};

export default function CenterStudentDetailPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string }>();
  const toast = useToast();

  const { data: student, loading, error, reload } = useApi<StudentDetail>(
    () => api.get<StudentDetail>(`/center/students/${params.id}`),
    [params.id]
  );
  const { data: communications, reload: reloadComm } = useApi<Communication[]>(
    () => api.get<Communication[]>(`/center/students/${params.id}/communications`),
    [params.id]
  );

  const [tab, setTab] = useState<Tab>('overview');
  const [toggling, setToggling] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>;
  if (!student) return null;

  const isFrozen = student.enrollmentStatus === 'FROZEN';
  const enrollmentLabel =
    student.enrollmentStatus === 'ACTIVE' ? t('enrollmentActive')
    : student.enrollmentStatus === 'FROZEN' ? t('enrollmentFrozen')
    : t('enrollmentPending');

  const financialLabel =
    student.financial.status === 'PAID' ? t('financialPaid')
    : student.financial.status === 'DUE' ? formatCurrency(student.financial.amountDue * 100, lang)
    : student.financial.status === 'NEEDS_MATCHING' ? t('financeNeedsMatching')
    : t('financialNotPaid');

  const description = [student.code, student.grade, `${student.groups.length} ${t('groupGeneric')}`].filter(Boolean).join(' · ');

  const fmtDateParts = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const statusText = (status: string) => {
    switch (status) {
      case 'PRESENT': return t('attendancePresentShort');
      case 'LATE': return t('attendanceLateShort');
      case 'ABSENT': return t('attendanceAbsentShort');
      case 'EXCUSED': return t('attendanceExcusedShort');
      default: return '—';
    }
  };
  const statusTone = (status: string) =>
    status === 'PRESENT' ? 'green' as const : status === 'LATE' ? 'amber' as const : status === 'ABSENT' ? 'red' as const : 'slate' as const;

  const sourceLabel = (method: string) => {
    switch (method) {
      case 'qr': return t('sourceQr');
      case 'lesson_collection': return t('sourceLessonCollection');
      default: return t('sourceManual');
    }
  };

  const toggleEnrollment = async () => {
    setToggling(true);
    try {
      await api.patch(`/center/students/${student.id}/enrollment`, { status: isFrozen ? 'ACTIVE' : 'INACTIVE' });
      toast.success(isFrozen ? t('studentReactivatedToast') : t('studentFrozenToast'));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setToggling(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post(`/center/students/${student.id}/messages`, { message });
      setMessage('');
      toast.success(t('studentMessageSentToast'));
      reloadComm();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageBackButton label={t('backToStudents')} fallback="/center/students" />

      <CenterPageHeader
        eyebrow={t('studentFileEyebrow')}
        title={student.fullName}
        description={description}
      >
        <CenterPill tone={enrollmentTone(student.enrollmentStatus)}>{enrollmentLabel}</CenterPill>
        {student.parent?.phone && (
          <a href={`tel:${student.parent.phone.replace(/\s/g, '')}`} className="mj-btn mj-btn--ghost">
            <Phone className="h-4 w-4" />
            {t('contactParent')}
          </a>
        )}
        <button type="button" className="mj-btn mj-btn--ghost" onClick={() => setTab('communication')}>
          <MessageSquare className="h-4 w-4" />
          {t('sendMessage')}
        </button>
      </CenterPageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CenterStatCard
          value={student.attendanceRate !== null ? `${student.attendanceRate}%` : '—'}
          label={t('referenceAttendanceRate')}
        />
        <CenterStatCard value={financialLabel} label={t('financialStatus')} />
        <CenterStatCard value={student.groups.length} label={t('columnGroups')} />
        <CenterStatCard value={student.parent?.fullName || '—'} label={t('parent')} />
      </div>

      <div className="mj-detail-grid">
        <div className="mj-detail-main">
          <div className="mj-tabs">
            <button type="button" className={`mj-tab ${tab === 'overview' ? 'mj-tab--active' : ''}`} onClick={() => setTab('overview')}>
              {t('overviewTab')}
            </button>
            <button type="button" className={`mj-tab ${tab === 'attendance' ? 'mj-tab--active' : ''}`} onClick={() => setTab('attendance')}>
              {t('referenceAttendanceTab')}
              <span className="mj-tab-count">{student.attendanceCount}</span>
            </button>
            <button type="button" className={`mj-tab ${tab === 'financial' ? 'mj-tab--active' : ''}`} onClick={() => setTab('financial')}>
              {t('financialRecordTab')}
            </button>
            <button type="button" className={`mj-tab ${tab === 'communication' ? 'mj-tab--active' : ''}`} onClick={() => setTab('communication')}>
              {t('parentCommunicationTab')}
            </button>
          </div>

          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="mj-card overflow-hidden">
                <div className="border-b border-[color:var(--mj-border-soft)] px-5 py-4">
                  <h3 className="font-bold text-[color:var(--mj-ink-strong)]">{t('operationalSummaryTitle')}</h3>
                  <p className="mt-0.5 text-sm text-[color:var(--mj-muted)]">{t('operationalSummarySub')}</p>
                </div>
                <div className="grid gap-3 p-5 sm:grid-cols-2">
                  <div className="mj-card mj-card--padding">
                    <p className="text-sm font-semibold text-[color:var(--mj-muted)]">{t('centerGroups')}</p>
                    <ul className="mt-2 space-y-2">
                      {student.groups.map((g) => (
                        <li key={g.enrollmentId}>
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm text-[color:var(--mj-ink-strong)]">{g.name}</strong>
                            <span className="text-xs text-[color:var(--mj-muted)]">{g.subject || ''}</span>
                          </div>
                          <p className="text-xs text-[color:var(--mj-muted)]">
                            {[g.teacher, g.room].filter(Boolean).join(' · ') || '—'}
                          </p>
                          <Link href={`/center/groups/${g.slug}`} className="mj-link mt-1 inline-flex items-center gap-1 text-xs font-semibold">
                            {t('openGroupRecord')}
                            <ArrowUpRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
                          </Link>
                        </li>
                      ))}
                      {student.groups.length === 0 && (
                        <li className="text-sm text-[color:var(--mj-muted)]">{t('noGroups')}</li>
                      )}
                    </ul>
                  </div>
                  <div className="mj-card mj-card--padding">
                    <p className="text-sm font-semibold text-[color:var(--mj-muted)]">{t('lastStatusesTitle')}</p>
                    <div className="mt-2 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[color:var(--mj-ink-strong)]">{t('lastAttendance')}</p>
                          <p className="text-xs text-[color:var(--mj-muted)]">
                            {student.lastAttendance ? fmtDateParts(student.lastAttendance.markedAt) : t('notAttendedYet')}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-[color:var(--mj-ink-strong)]">
                          {student.attendanceRate !== null ? `${student.attendanceRate}%` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[color:var(--mj-ink-strong)]">{t('financialStatus')}</p>
                          <p className="text-xs text-[color:var(--mj-muted)]">
                            {student.financial.status === 'DUE' ? t('financeDue') : t('financeUpToDate')}
                          </p>
                        </div>
                        <span className={`text-sm font-bold ${student.financial.amountDue > 0 ? 'text-[color:var(--mj-danger)]' : 'text-[color:var(--mj-success)]'}`}>
                          {formatCurrency(student.financial.amountDue * 100, lang)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mj-card mj-card--padding">
                <p className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{t('whatCenterSeesTitle')}</p>
                <p className="mt-1 text-sm leading-relaxed text-[color:var(--mj-muted)]">{t('whatCenterSeesNote')}</p>
              </div>
            </div>
          )}

          {tab === 'attendance' && (
            <div className="mj-card overflow-hidden">
              <div className="border-b border-[color:var(--mj-border-soft)] px-5 py-4">
                <h3 className="font-bold text-[color:var(--mj-ink-strong)]">{t('referenceAttendanceTitle')}</h3>
                <p className="mt-0.5 text-sm text-[color:var(--mj-muted)]">{t('referenceAttendanceSub')}</p>
              </div>
              {student.attendance.length === 0 ? (
                <div className="mj-empty">
                  <Calendar className="mj-empty-icon" />
                  <p className="text-sm">{t('noAttendance')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="mj-table">
                    <thead>
                      <tr>
                        <th>{t('lessonColumn')}</th>
                        <th>{t('groupColumn')}</th>
                        <th>{t('status')}</th>
                        <th>{t('sourceColumn')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {student.attendance.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <span className="block font-medium text-[color:var(--mj-ink-strong)]">
                              {fmtDateParts(a.date)}{a.time ? `، ${formatTime(a.time)}` : ''}
                            </span>
                          </td>
                          <td>{a.subject || t('subject')}</td>
                          <td><CenterPill tone={statusTone(a.status)}>{statusText(a.status)}</CenterPill></td>
                          <td className="text-xs text-[color:var(--mj-muted)]">{sourceLabel(a.method)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'financial' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <CenterStatCard value={formatCurrency(student.financial.totalCollected * 100, lang)} label={t('totalCollected')} />
                <CenterStatCard value={formatCurrency(student.financial.amountDue * 100, lang)} label={t('amountDueLabel')} />
                <CenterStatCard value={student.payments.length ? timeAgo(student.payments[0].createdAt, lang) : '—'} label={t('lastCollectionLabel')} />
              </div>
              <div className="mj-card overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-5 py-3">
                  <p className="text-sm text-[color:var(--mj-muted)]">{t('financialRecordTab')}</p>
                  <Link href="/center/finance" className="mj-link inline-flex items-center gap-1 text-sm font-semibold">
                    {t('openAccounts')}
                    <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
                  </Link>
                </div>
                {student.payments.length === 0 ? (
                  <div className="mj-empty">
                    <AlertCircle className="mj-empty-icon" />
                    <p className="text-sm">{t('noCollections')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="mj-table">
                      <thead>
                        <tr>
                          <th>{t('operationColumn')}</th>
                          <th>{t('groupColumn')} / {t('lessonColumn')}</th>
                          <th>{t('valueColumn')}</th>
                          <th>{t('status')}</th>
                          <th>{t('attendanceLinkColumn')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {student.payments.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <span className="block font-medium text-[color:var(--mj-ink-strong)]">
                                {p.type === 'MONTHLY' ? t('monthlyCollection') : t('sessionCollection')}
                              </span>
                              <span className="text-xs text-[color:var(--mj-muted-2)]">
                                {fmtDateParts(p.createdAt)} · {p.paymentNumber}
                              </span>
                            </td>
                            <td>{p.lessonSubject || '—'}</td>
                            <td><span className="font-semibold text-[color:var(--mj-ink-strong)]">{formatCurrency(p.amount, lang)}</span></td>
                            <td>
                              <CenterPill tone={p.status === 'PAID' || p.status === 'COMPLETED' ? 'green' : 'amber'}>
                                {p.status === 'PAID' || p.status === 'COMPLETED' ? t('financialPaid') : p.status === 'PENDING' ? t('financePending') : t('financeRejected')}
                              </CenterPill>
                            </td>
                            <td className="text-xs text-[color:var(--mj-muted)]">
                              {p.linkedToLesson ? t('linkedToLesson') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'communication' && (
            <div className="mj-card overflow-hidden">
              <div className="border-b border-[color:var(--mj-border-soft)] px-5 py-4">
                <h3 className="font-bold text-[color:var(--mj-ink-strong)]">{t('parentCommunicationTitle')}</h3>
                <p className="mt-0.5 text-sm text-[color:var(--mj-muted)]">{t('parentCommunicationSub')}</p>
              </div>
              <div className="border-b border-[color:var(--mj-border-soft)] p-5">
                <form onSubmit={sendMessage} className="space-y-3">
                  <div className="mj-field">
                    <label className="mj-label">{t('messageToParent', { name: student.parent?.fullName || student.fullName })}</label>
                    <textarea
                      className="mj-input min-h-[90px]"
                      placeholder={t('writeMessagePlaceholder')}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="mj-btn mj-btn--primary" disabled={sending || !message.trim()}>
                      <Send className="h-4 w-4" />
                      {sending ? t('sending') : t('sendAndRecord')}
                    </button>
                  </div>
                </form>
              </div>
              <div className="divide-y divide-[color:var(--mj-border-soft)]">
                {(communications ?? []).length === 0 ? (
                  <div className="p-5 text-sm text-[color:var(--mj-muted)]">{t('noCommunications')}</div>
                ) : (
                  (communications ?? []).map((c) => (
                    <div key={c.id} className="flex items-start gap-3 px-5 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--mj-accent-soft)] text-xs font-semibold text-[color:var(--mj-accent)]">
                        {c.authorName.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[color:var(--mj-muted)]">{c.authorName}</p>
                        <p className="text-sm text-[color:var(--mj-ink-strong)]">{c.body}</p>
                        <p className="text-xs text-[color:var(--mj-muted-2)]">{timeAgo(c.createdAt, lang)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mj-detail-side">
          <div className="mj-side-card">
            <h2 className="mb-3 text-sm font-bold text-[color:var(--mj-ink-strong)]">{t('registrationData')}</h2>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('student')}</span>
              <span className="mj-side-row-value">{student.fullName}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('code')}</span>
              <span className="mj-side-row-value">{student.code || '—'}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('studentPhoneLabel')}</span>
              <span className="mj-side-row-value" dir="ltr">{student.phone || '—'}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('parent')}</span>
              <span className="mj-side-row-value">{student.parent?.fullName || '—'}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('parentPhoneLabel')}</span>
              <span className="mj-side-row-value" dir="ltr">{student.parent?.phone || '—'}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('enrollmentStatusFilter')}</span>
              <span><CenterPill tone={enrollmentTone(student.enrollmentStatus)}>{enrollmentLabel}</CenterPill></span>
            </div>
            {student.parent?.phone && (
              <a href={`tel:${student.parent.phone.replace(/\s/g, '')}`} className="mj-btn mj-btn--ghost mt-3 w-full">
                <Phone className="h-4 w-4" />
                {t('contactParent')}
              </a>
            )}
          </div>

          <div className="mj-side-card">
            <button type="button" className="mj-btn mj-btn--ghost w-full" onClick={toggleEnrollment} disabled={toggling}>
              {isFrozen ? <RefreshCcw className="h-4 w-4" /> : <Snowflake className="h-4 w-4" />}
              {isFrozen ? t('reactivateEnrollment') : t('freezeEnrollment')}
            </button>
            <p className="mt-3 text-xs leading-relaxed text-[color:var(--mj-muted)]">{t('freezeNote')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

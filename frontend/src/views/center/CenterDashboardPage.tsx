'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CreditCard,
  ScanLine,
  Activity,
  Settings,
  ClipboardList,
  BookMarked,
  GraduationCap,
  UserCog,
} from 'lucide-react';
import { useT } from '../../i18n';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { CenterPageHeader } from './ui/CenterPageHeader';
import { CenterStatCard } from './ui/CenterStatCard';
import { CenterPill } from './ui/CenterPill';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useCenterBranch } from './dashboard/CenterBranchContext';

interface CenterStats {
  totalStudents: number;
  totalTeachers: number;
  totalEmployees: number;
  totalBranches: number;
  totalRooms: number;
  todayLessons: number;
  completedLessons: number;
  upcomingLessons: number;
  cancelledLessons: number;
  todayAttendance: { present: number; absent: number; late: number; total: number };
  todayRevenue: number;
  pendingPayments: number;
  paidPayments: number;
  activeEnrollments: number;
  pendingEnrollments: number;
}

interface TodayLesson {
  id: string;
  subject: string;
  teacher: string;
  grade: string;
  room: string;
  branch: string;
  startTime: string;
  endTime: string;
  studentCount: number;
  enrolledCount: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  actionUrl?: string;
}

export default function CenterDashboardPage() {
  const { t, dir } = useT();
  const { user, center } = useAuth();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const { branches, branchId: branchFilter, setBranches } = useCenterBranch();

  useEffect(() => {
    if (branches.length > 0) return;
    api.get<{ id: string; name: string }[]>('/center/account/branches')
      .then((res) => setBranches(res.data || []))
      .catch(() => {});
  }, [branches.length, setBranches]);

  const { data: stats, loading: statsLoading, error: statsError } = useApi<CenterStats>(
    () => api.get<CenterStats>('/center/account/stats', branchFilter ? { branchId: branchFilter } : undefined),
    [branchFilter]
  );

  const { data: todayLessons, loading: lessonsLoading } = useApi<TodayLesson[]>(
    () => api.get<TodayLesson[]>('/center/account/lessons/today', branchFilter ? { branchId: branchFilter } : undefined),
    [branchFilter]
  );

  const { data: alerts } = useApi<Alert[]>(
    () => api.get<Alert[]>('/center/account/alerts'),
    []
  );

  if (statsLoading) return <PencilLoader label={t('loadingDashboard')} />;
  if (statsError) return <Alert message={statsError} />;

  const attendancePercentage = stats?.todayAttendance
    ? Math.round((stats.todayAttendance.present / stats.todayAttendance.total) * 100) || 0
    : 0;

  const statusText = (status: TodayLesson['status']) => {
    const map: Record<TodayLesson['status'], string> = {
      SCHEDULED: t('scheduled'),
      IN_PROGRESS: t('inProgress'),
      COMPLETED: t('completed'),
      CANCELLED: t('cancelled'),
    };
    return map[status];
  };
  const statusTone = (status: TodayLesson['status']): 'green' | 'amber' | 'red' | 'blue' | 'slate' => {
    const map: Record<TodayLesson['status'], 'green' | 'amber' | 'red' | 'blue' | 'slate'> = {
      SCHEDULED: 'blue',
      IN_PROGRESS: 'amber',
      COMPLETED: 'green',
      CANCELLED: 'red',
    };
    return map[status];
  };

  const quickActions = [
    { label: t('addTeacher'), icon: GraduationCap, href: '/center/teachers' },
    { label: t('addStudent'), icon: UserCog, href: '/center/students' },
    { label: t('createLesson'), icon: BookMarked, href: '/center/schedule' },
    { label: t('recordPayment'), icon: CreditCard, href: '/center/payments' },
    { label: t('viewAttendance'), icon: ScanLine, href: '/center/attendance' },
    { label: t('generateReport'), icon: ClipboardList, href: '/center/reports' },
  ];

  return (
    <div className="space-y-6">
      <CenterPageHeader
        eyebrow={t('centerDashboard')}
        title={t('welcomeBack', { name: user?.fullName?.trim().split(/\s+/)[0] || t('centerAdmin') })}
        description={center?.name || t('centerDashboardSubGeneric')}
      >
        <Link href="/center/profile">
          <button type="button" className="mj-btn mj-btn--ghost">
            <Settings className="h-4 w-4" /> {t('centerSettings')}
          </button>
        </Link>
        <Link href="/center/analytics">
          <button type="button" className="mj-btn mj-btn--primary">
            {t('viewAnalytics')} <Arrow className="h-4 w-4" />
          </button>
        </Link>
      </CenterPageHeader>

      {/* Top counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <CenterStatCard value={stats?.totalStudents || 0} label={t('students')} sub={t('activeStudents')} />
        <CenterStatCard value={stats?.totalTeachers || 0} label={t('teachers')} />
        <CenterStatCard value={stats?.totalEmployees || 0} label={t('employees')} />
        <CenterStatCard value={stats?.totalRooms || 0} label={t('classrooms')} />
        <CenterStatCard value={stats?.todayLessons || 0} label={t('todayLessons')} sub={t('lessonsTodayCount', { count: stats?.todayLessons || 0 })} />
      </div>

      {/* Operational queues */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/center/schedule" className="mj-card mj-stat transition-colors hover:border-[color:var(--mj-accent)]">
          <div className="mj-stat-value">{stats?.todayLessons || 0}</div>
          <div className="mj-stat-label">{t('todayLessons')}</div>
          <div className="mj-stat-sub">
            {t('completedToday')} {stats?.completedLessons || 0} · {t('upcomingToday')} {stats?.upcomingLessons || 0}
          </div>
        </Link>
        <Link href="/center/attendance" className="mj-card mj-stat transition-colors hover:border-[color:var(--mj-accent)]">
          <div className="mj-stat-value">{attendancePercentage}%</div>
          <div className="mj-stat-label">{t('attendance')}</div>
          <div className="mj-stat-sub">
            {t('present')} {stats?.todayAttendance?.present || 0} · {t('late')} {stats?.todayAttendance?.late || 0} · {t('absent')}{' '}
            {stats?.todayAttendance?.absent || 0}
          </div>
        </Link>
        <Link href="/center/payments" className="mj-card mj-stat transition-colors hover:border-[color:var(--mj-accent)]">
          <div className="mj-stat-value">{((stats?.todayRevenue || 0) / 100).toLocaleString()} EGP</div>
          <div className="mj-stat-label">{t('revenueToday')}</div>
          <div className="mj-stat-sub">
            {t('pendingPayments')} {stats?.pendingPayments || 0} · {t('paid')} {stats?.paidPayments || 0}
          </div>
        </Link>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Today's lessons */}
        <div className="lg:col-span-2">
          <div className="mj-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <h2 className="mj-title">{t('todaysLessons')}</h2>
              <Link href="/center/schedule" className="mj-link text-sm font-semibold">
                {t('viewAll')} <Arrow className="ms-0.5 inline h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mj-divider" />
            {lessonsLoading ? (
              <div className="p-8">
                <PencilLoader label={t('loading')} />
              </div>
            ) : todayLessons && todayLessons.length > 0 ? (
              <div className="divide-y divide-[color:var(--mj-border-soft)]">
                {todayLessons.slice(0, 6).map((lesson) => (
                  <div key={lesson.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--mj-accent-soft)] text-[color:var(--mj-accent)]">
                        <BookOpen className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[color:var(--mj-ink-strong)]">{lesson.subject}</p>
                        <p className="truncate text-xs text-[color:var(--mj-muted)]">
                          {lesson.startTime} - {lesson.endTime} · {lesson.teacher} · {lesson.room}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-[color:var(--mj-muted)]">{lesson.enrolledCount}/{lesson.studentCount}</span>
                      <CenterPill tone={statusTone(lesson.status)}>{statusText(lesson.status)}</CenterPill>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mj-empty">
                <Calendar className="mj-empty-icon" />
                <p className="text-sm">{t('noLessonsToday')}</p>
                <Link href="/center/schedule">
                  <button type="button" className="mj-btn mj-btn--soft mj-btn--sm mt-1">{t('createLesson')}</button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          {/* Alerts */}
          {alerts && alerts.length > 0 && (
            <div className="mj-card p-5">
              <h2 className="mb-3 mj-title">{t('alerts')}</h2>
              <div className="space-y-2.5">
                {alerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 rounded-lg p-3 ${
                      alert.type === 'warning'
                        ? 'bg-[color:var(--mj-amber-soft)] text-[color:var(--mj-amber)]'
                        : alert.type === 'error'
                          ? 'bg-[color:var(--mj-danger-soft)] text-[color:var(--mj-danger)]'
                          : 'bg-[color:var(--mj-link-soft)] text-[color:var(--mj-link)]'
                    }`}
                  >
                    <Activity className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">{alert.title}</p>
                      <p className="mt-0.5 text-xs opacity-80">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendance */}
          <div className="mj-card p-5">
            <h2 className="mb-4 mj-title">{t('attendanceToday')}</h2>
            <div className="flex items-center justify-center">
              <div className="relative inline-flex h-24 w-24 items-center justify-center">
                <svg className="h-24 w-24 -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="var(--mj-line-bg)" strokeWidth="8" fill="none" />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="var(--mj-success)"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${attendancePercentage * 2.51} 251`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-2xl font-bold text-[color:var(--mj-ink-strong)]">{attendancePercentage}%</span>
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-4 text-xs text-[color:var(--mj-muted)]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[color:var(--mj-success)]" />{t('present')} {stats?.todayAttendance?.present || 0}</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[color:var(--mj-amber)]" />{t('late')} {stats?.todayAttendance?.late || 0}</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[color:var(--mj-danger)]" />{t('absent')} {stats?.todayAttendance?.absent || 0}</span>
            </div>
          </div>

          {/* Payments */}
          <div className="mj-card p-5">
            <h2 className="mb-3 mj-title">{t('paymentsSummary')}</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--mj-muted)]">{t('todayRevenue')}</span>
                <span className="font-bold text-[color:var(--mj-success)]">{((stats?.todayRevenue || 0) / 100).toLocaleString()} EGP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--mj-muted)]">{t('paid')}</span>
                <span className="font-bold text-[color:var(--mj-success)]">{stats?.paidPayments || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--mj-muted)]">{t('pending')}</span>
                <span className="font-bold text-[color:var(--mj-amber)]">{stats?.pendingPayments || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-[1.05rem] font-bold text-[color:var(--mj-ink-strong)]">
          <Activity className="h-5 w-5 text-[color:var(--mj-accent)]" />
          {t('quickActions')}
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="mj-card flex flex-col items-center justify-center gap-2 px-3 py-4 text-center transition-colors hover:border-[color:var(--mj-accent)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--mj-accent-soft)] text-[color:var(--mj-accent)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold text-[color:var(--mj-ink)]">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  GraduationCap,
  Group,
  MapPin,
  Users,
  AlertTriangle,
  UserPlus,
  UserCog,
  BookMarked,
  Settings,
  ClipboardList,
  ScanLine,
  Activity,
  Eye,
} from 'lucide-react';
import { useT } from '../../i18n';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { StatCard } from '../../components/ui/StatCard';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';

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

  const [branchFilter, setBranchFilter] = useState<string>('');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.get<{ id: string; name: string }[]>('/center/account/branches')
      .then((res) => setBranches(res.data || []))
      .catch(() => {});
  }, []);

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

  const quickActions = [
    { label: t('addEmployee'), icon: UserPlus, href: '/center/employees/new', color: 'bg-brand-500' },
    { label: t('addTeacher'), icon: GraduationCap, href: '/center/teachers', color: 'bg-violet-500' },
    { label: t('addStudent'), icon: UserCog, href: '/center/students', color: 'bg-teal-500' },
    { label: t('createLesson'), icon: BookMarked, href: '/center/schedule', color: 'bg-amber-500' },
    { label: t('recordPayment'), icon: CreditCard, href: '/center/payments', color: 'bg-emerald-500' },
    { label: t('viewAttendance'), icon: ScanLine, href: '/center/attendance', color: 'bg-sky-500' },
    { label: t('generateReport'), icon: ClipboardList, href: '/center/reports', color: 'bg-rose-500' },
    { label: t('centerSettings'), icon: Settings, href: '/center/profile', color: 'bg-slate-500' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge tone="blue">{t('scheduled')}</Badge>;
      case 'IN_PROGRESS':
        return <Badge tone="amber">{t('inProgress')}</Badge>;
      case 'COMPLETED':
        return <Badge tone="green">{t('completed')}</Badge>;
      case 'CANCELLED':
        return <Badge tone="red">{t('cancelled')}</Badge>;
      default:
        return <Badge tone="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -start-28 -top-32 h-72 w-72 rounded-full bg-brand-500 opacity-[0.07] blur-3xl dark:opacity-[0.12]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent dark:via-slate-600/40" />
        </div>
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 ring-1 ring-inset ring-brand-600/20 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/20">
              <Activity className="h-3.5 w-3.5" />
              {t('centerDashboard')}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[2rem]">
              {t('welcomeBack', { name: user?.fullName?.trim().split(/\s+/)[0] || t('centerAdmin') })}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {center?.name || t('centerDashboardSubGeneric')}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {branches.length > 0 && (
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  <option value="">{t('allBranches')}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-700">
                <Calendar className="h-3.5 w-3.5" />
                {t('lessonsTodayCount', { count: stats?.todayLessons || 0 })}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                <CheckCircle className="h-3.5 w-3.5" />
                {t('attendanceRate', { rate: attendancePercentage })}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/center/profile">
              <Button variant="outline" size="lg">
                <Settings className="h-4 w-4" />
                {t('centerSettings')}
              </Button>
            </Link>
            <Link href="/center/analytics">
              <Button size="lg">
                {t('viewAnalytics')} <Arrow className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Top Statistics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label={t('students')} value={stats?.totalStudents || 0} icon={Users} tone="brand" badge={t('activeStudents')} />
        <StatCard label={t('teachers')} value={stats?.totalTeachers || 0} icon={GraduationCap} tone="violet" />
        <StatCard label={t('employees')} value={stats?.totalEmployees || 0} icon={Group} tone="teal" />
        <StatCard label={t('branches')} value={stats?.totalBranches || 0} icon={MapPin} tone="gold" />
        <StatCard label={t('rooms')} value={stats?.totalRooms || 0} icon={BookOpen} tone="coral" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t('todayLessons')} value={stats?.todayLessons || 0} icon={Calendar} tone="brand" />
        <StatCard label={t('completedToday')} value={stats?.completedLessons || 0} icon={CheckCircle} tone="green" />
        <StatCard label={t('upcomingToday')} value={stats?.upcomingLessons || 0} icon={Clock} tone="amber" />
        <StatCard label={t('revenueToday')} value={`${((stats?.todayRevenue || 0) / 100).toLocaleString()} EGP`} icon={DollarSign} tone="emerald" />
        <StatCard label={t('pendingPayments')} value={stats?.pendingPayments || 0} icon={Clock} tone="amber" />
        <StatCard label={t('attendance')} value={`${attendancePercentage}%`} icon={ScanLine} tone="sky" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today's Lessons */}
        <div className="lg:col-span-2">
          <Card 
            title={t('todaysLessons')}
            action={
              <Link href="/center/schedule">
                <Button variant="ghost" size="sm">{t('viewAll')} <Arrow className="h-3 w-3" /></Button>
              </Link>
            }
          >
            {lessonsLoading ? (
              <PencilLoader label={t('loading')} />
            ) : todayLessons && todayLessons.length > 0 ? (
              <div className="space-y-3">
                {todayLessons.slice(0, 5).map((lesson) => (
                  <div key={lesson.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-700">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{lesson.subject}</p>
                        <p className="text-xs text-slate-500">{lesson.startTime} - {lesson.endTime} • {lesson.teacher}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500">{lesson.enrolledCount}/{lesson.studentCount}</span>
                      {getStatusBadge(lesson.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500">{t('noLessonsToday')}</p>
                <Link href="/center/schedule" className="mt-3">
                  <Button variant="secondary" size="sm">{t('createLesson')}</Button>
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Alerts */}
          {alerts && alerts.length > 0 && (
            <Card title={t('alerts')}>
              <div className="space-y-3">
                {alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className={`flex items-start gap-3 rounded-lg p-3 ${
                    alert.type === 'warning' ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300' :
                    alert.type === 'error' ? 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300' :
                    'bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300'
                  }`}>
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="mt-0.5 text-xs opacity-80">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Attendance */}
          <Card title={t('attendanceToday')}>
            <div className="text-center">
              <div className="relative mx-auto inline-flex h-24 w-24 items-center justify-center">
                <svg className="h-24 w-24 -rotate-90 transform">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-200 dark:text-slate-700" />
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${attendancePercentage * 2.51} 251`} strokeLinecap="round" className="text-emerald-500" />
                </svg>
                <span className="absolute text-2xl font-bold text-slate-900 dark:text-white">{attendancePercentage}%</span>
              </div>
              <div className="mt-4 flex justify-center gap-4 text-xs">
                <div className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{t('present')} ({stats?.todayAttendance?.present || 0})</div>
                <div className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />{t('late')} ({stats?.todayAttendance?.late || 0})</div>
                <div className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />{t('absent')} ({stats?.todayAttendance?.absent || 0})</div>
              </div>
            </div>
          </Card>

          {/* Payments */}
          <Card title={t('paymentsSummary')}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">{t('todayRevenue')}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{((stats?.todayRevenue || 0) / 100).toLocaleString()} EGP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">{t('paid')}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats?.paidPayments || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">{t('pending')}</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{stats?.pendingPayments || 0}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Activity className="h-5 w-5" />
          {t('quickActions')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 text-center transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-elevated dark:border-slate-700 dark:bg-slate-800">
                <span className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-white transition-transform group-hover:scale-110 ${action.color}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Lessons Table */}
      {todayLessons && todayLessons.length > 0 && (
        <Card title={t('todaysLessonsTable')} action={
          <Link href="/center/schedule"><Button variant="ghost" size="sm">{t('viewAll')} <Arrow className="h-3 w-3" /></Button></Link>
        }>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-start text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
                  <th className="pb-3 pe-4 font-medium">#</th>
                  <th className="pb-3 pe-4 font-medium">{t('time')}</th>
                  <th className="pb-3 pe-4 font-medium">{t('subject')}</th>
                  <th className="pb-3 pe-4 font-medium">{t('teacher')}</th>
                  <th className="pb-3 pe-4 font-medium">{t('students')}</th>
                  <th className="pb-3 pe-4 font-medium">{t('status')}</th>
                  <th className="pb-3 font-medium">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {todayLessons.slice(0, 8).map((lesson, i) => (
                  <tr key={lesson.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 pe-4 text-slate-500">{i + 1}</td>
                    <td className="py-3 pe-4 font-medium">{lesson.startTime} - {lesson.endTime}</td>
                    <td className="py-3 pe-4 font-medium text-slate-900 dark:text-white">{lesson.subject}</td>
                    <td className="py-3 pe-4 text-slate-600 dark:text-slate-300">{lesson.teacher}</td>
                    <td className="py-3 pe-4 text-slate-600 dark:text-slate-300">{lesson.enrolledCount}/{lesson.studentCount}</td>
                    <td className="py-3 pe-4">{getStatusBadge(lesson.status)}</td>
                    <td className="py-3">
                      <Link href={`/center/schedule/${lesson.id}`}><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  GraduationCap,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useT } from '../../i18n';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { AdminStats } from '../../lib/types';

import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { DashboardHero } from '../../components/dashboard/DashboardHero';
import { SectionTitle } from '../../components/dashboard/SectionTitle';
import { AchievementTile } from '../../components/dashboard/AchievementTile';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardPage() {
  const { t, dir } = useT();
  const { user } = useAuth();
  const { data, initialLoading, error } = useApi(() => api.get<AdminStats>('/admin/stats'), []);
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  if (initialLoading) return <PencilLoader label={t('loadingDashboard')} />;
  if (error || !data) return <Alert message={error || t('failedLoadDashboard')} />;

  const totalUsers = data.totalStudents + data.totalTeachers + data.totalParents;
  const mix = [
    { label: t('usersMixStudents'), value: data.totalStudents, tone: 'brand', pct: totalUsers ? Math.round((data.totalStudents / totalUsers) * 100) : 0 },
    { label: t('usersMixTeachers'), value: data.totalTeachers, tone: 'gold', pct: totalUsers ? Math.round((data.totalTeachers / totalUsers) * 100) : 0 },
    { label: t('usersMixParents'), value: data.totalParents, tone: 'violet', pct: totalUsers ? Math.max(0, 100 - Math.round((data.totalStudents / totalUsers) * 100) - Math.round((data.totalTeachers / totalUsers) * 100)) : 0 },
  ];

  const quickLinks = [
    { to: '/admin/users', label: t('manageUsers'), icon: Users },
    { to: '/admin/teachers', label: t('manageTeachers'), icon: GraduationCap },
    { to: '/admin/subjects', label: t('manageSubjects'), icon: BookOpen },
    { to: '/admin/analytics', label: t('viewAnalytics'), icon: TrendingUp },
    { to: '/admin/reports', label: t('reports'), icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('adminDashTitle')} subtitle={t('adminDashSub')} />

      <DashboardHero
        tone="brand"
        eyebrow={
          <>
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            {t('adminOpsTitle')}
          </>
        }
        title={t('dashGreeting', { name: user?.fullName?.trim().split(/\s+/)[0] || t('adminRole') })}
        sub={t('adminHeroSub')}
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-700">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {t('focusLessonsToday', { count: data.todayLessons })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-700">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {t('newUsersMonth')} · +{data.newUsersThisMonth}
            </span>
          </>
        }
        cta={
          <Link href="/admin/analytics">
            <Button size="lg">
              {t('viewAnalytics')} <Arrow className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <AchievementTile
          icon={Calendar}
          value={data.totalLessons}
          label={t('lessons')}
          tone="brand"
          hint={t('focusLessonsToday', { count: data.todayLessons })}
        />
        <AchievementTile
          icon={FileText}
          value={data.totalExams}
          label={t('exams')}
          tone="violet"
          hint={t('upcomingExams')}
        />
        <AchievementTile
          icon={ClipboardList}
          value={data.totalAssignments}
          label={t('assignments')}
          tone="gold"
          hint={t('pendingHomework')}
        />
        <AchievementTile
          icon={Star}
          value={`${data.averageTeacherRating.toFixed(1)} ★`}
          label={t('avgTeacherRating')}
          tone="green"
          hint={t('teacherRatingsSub')}
        />
      </div>

      {/* User mix + status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title={t('adminUsersMix')}>
          <div>
            <div className="flex h-4 w-full items-stretch gap-0.5 overflow-hidden rounded-full" aria-hidden>
              {mix.map((s) => (
                <span
                  key={s.label}
                  style={{ width: `${s.pct}%` }}
                  className={
                    s.tone === 'brand'
                      ? 'bg-brand-500'
                      : s.tone === 'gold'
                        ? 'bg-amber-500'
                        : 'bg-violet-500'
                  }
                />
              ))}
            </div>
            <ul className="mt-4 space-y-2.5">
              {mix.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span
                      aria-hidden
                      className={`h-2.5 w-2.5 rounded-full ${s.tone === 'brand' ? 'bg-brand-500' : s.tone === 'gold' ? 'bg-amber-500' : 'bg-violet-500'}`}
                    />
                    {s.label}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {s.value} <span className="font-normal text-slate-400">({s.pct}%)</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title={t('adminStatusTitle')}>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label={t('completedLessonsStat')} value={data.completedLessons} icon={Calendar} tone="teal" />
            <StatCard label={t('upcomingLessons')} value={data.upcomingLessons} icon={Calendar} tone="slate" />
            <StatCard label={t('newUsersMonth')} value={data.newUsersThisMonth} icon={TrendingUp} tone="brand" />
            <StatCard label={t('totalUsersLabel')} value={totalUsers} icon={Users} tone="violet" />
          </div>
        </Panel>

        <Panel title={t('adminOpsTitle')}>
          <ul className="space-y-2">
            {quickLinks.map((q) => {
              const Icon = q.icon;
              return (
                <li key={q.to}>
                  <Link
                    href={q.to}
                    className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-elevated dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-brand-500/50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-transform duration-200 group-hover:scale-110 dark:bg-brand-500/15 dark:text-brand-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{q.label}</span>
                    <Arrow className="h-3.5 w-3.5 -translate-x-1 text-slate-300 transition-all duration-200 group-hover:translate-x-0 group-hover:text-brand-500 rtl:translate-x-1 rtl:group-hover:translate-x-0 dark:text-slate-600" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      {/* Secondary numbers */}
      <div>
        <SectionTitle icon={BarChart3} title={t('analytics')} sub={t('adminDashSub')} />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label={t('totalStudents')} value={data.totalStudents} icon={Users} tone="brand" />
          <StatCard label={t('teachersNav')} value={data.totalTeachers} icon={GraduationCap} tone="gold" />
          <StatCard label={t('parents')} value={data.totalParents} icon={Users} tone="violet" />
          <StatCard label={t('lessonsToday')} value={data.todayLessons} icon={Calendar} tone="teal" />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      {children}
    </div>
  );
}

import Link from 'next/link';
import {
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  GraduationCap,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { useT } from '../../i18n';
import { StatCard } from '../../components/ui/StatCard';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { AdminStats } from '../../lib/types';

export default function AdminDashboardPage() {
  const { t } = useT();
  const { data, initialLoading, error } = useApi(() => api.get<AdminStats>('/admin/stats'), []);

  if (initialLoading) return <PencilLoader label={t('loadingDashboard')} />;
  if (error || !data) return <Alert message={error || 'Failed to load dashboard.'} />;

  const quickLinks = [
    { to: '/admin/users', label: t('manageUsers'), icon: Users },
    { to: '/admin/teachers', label: t('manageTeachers'), icon: GraduationCap },
    { to: '/admin/subjects', label: t('manageSubjects'), icon: BookOpen },
    { to: '/admin/analytics', label: t('viewAnalytics'), icon: TrendingUp },
    { to: '/admin/reports', label: t('reports'), icon: ClipboardList },
  ];

  return (
    <div>
      <PageHeader title={t('adminDashTitle')} subtitle={t('adminDashSub')} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label={t('totalStudents')} value={data.totalStudents} icon={Users} />
        <StatCard label={t('teachersNav')} value={data.totalTeachers} icon={GraduationCap} />
        <StatCard label={t('parents')} value={data.totalParents} icon={Users} />
        <StatCard label={t('lessons')} value={data.totalLessons} icon={Calendar} sub={`${data.todayLessons} today`} />
        <StatCard label={t('upcomingLessons')} value={data.upcomingLessons} icon={Calendar} />
        <StatCard label={t('completedLessonsStat')} value={data.completedLessons} icon={Calendar} />
        <StatCard label={t('exams')} value={data.totalExams} icon={FileText} />
        <StatCard label={t('assignments')} value={data.totalAssignments} icon={ClipboardList} />
        <StatCard label={t('avgTeacherRating')} value={data.averageTeacherRating.toFixed(1)} icon={Star} />
        <StatCard label={t('newUsersMonth')} value={data.newUsersThisMonth} icon={TrendingUp} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((q) => {
          const Icon = q.icon;
          return (
            <Link
              key={q.to}
              href={q.to}
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                <Icon className="h-5 w-5 text-brand-600" />
              </div>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{q.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Bell, GraduationCap, Users } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';

interface ParentDashboardData {
  children: { id: string; userId: string; fullName: string; photo: string | null; grade: string | null }[];
  unreadNotifications: number;
}

export default function ParentDashboardPage() {
  const { data, initialLoading, error } = useApi(() => api.get<ParentDashboardData>('/parents/dashboard'), []);

  if (initialLoading) return <PencilLoader label="Loading dashboard…" />;
  if (error || !data) return <Alert message={error || 'Failed to load dashboard.'} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Parent dashboard" subtitle="Keep up with your children's learning." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Children" value={data.children.length} icon={Users} />
        <StatCard label="Unread notifications" value={data.unreadNotifications} icon={Bell} />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">My children</h2>
          <Link href="/parent/children">
            <Button variant="ghost" size="sm">View all</Button>
          </Link>
        </div>
        {data.children.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No children linked yet"
            description="Link your children to follow their lessons, exams and attendance."
            action={
              <Link href="/profile">
                <Button size="sm">Link a child</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.children.map((c) => (
              <Link key={c.id} href={`/parent/children/${c.id}`} className="group">
                <Card bodyClassName="p-5 transition group-hover:border-brand-300 group-hover:shadow">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.fullName} src={c.photo} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-700">
                        {c.fullName}
                      </p>
                      <p className="text-xs text-slate-500">{c.grade ?? 'No grade'}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

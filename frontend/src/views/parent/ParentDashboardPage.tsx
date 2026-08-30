'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Bell, GraduationCap, HeartHandshake, Receipt, ScanLine, ShieldCheck, Users } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useT } from '../../i18n';
import { DashboardHero } from '../../components/dashboard/DashboardHero';
import { SectionTitle } from '../../components/dashboard/SectionTitle';
import { AchievementTile } from '../../components/dashboard/AchievementTile';
import { type Tone } from '../../components/dashboard/tones';

interface ParentDashboardData {
  children: { id: string; userId: string; fullName: string; photo: string | null; grade: string | null }[];
  unreadNotifications: number;
}

const CHILD_ACCENTS: Tone[] = ['violet', 'teal', 'brand', 'gold', 'green', 'coral'];

export default function ParentDashboardPage() {
  const { t, dir } = useT();
  const { data, initialLoading, error } = useApi(() => api.get<ParentDashboardData>('/parents/dashboard'), []);
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  if (initialLoading) return <PencilLoader label={t('loadingDashboard')} />;
  if (error || !data) return <Alert message={error || t('failedLoadDashboard')} />;

  return (
    <div className="space-y-6">
      <PageHeader title={t('parentDashTitle')} subtitle={t('parentDashSub')} />

      <DashboardHero
        tone="violet"
        eyebrow={
          <>
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            {t('parentRole')}
          </>
        }
        title={t('dashGreeting', { name: t('parentDashTitle') })}
        sub={t('parentHeroSub')}
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-700">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {t('children')} · {data.children.length}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-700">
              <Bell className="h-3.5 w-3.5" aria-hidden />
              {t('unreadNotifications')} · {data.unreadNotifications}
            </span>
          </>
        }
        cta={
          data.children.length ? (
            <Link href="/parent/children">
              <Button size="lg">{t('myChildren')} <Arrow className="h-4 w-4" /></Button>
            </Link>
          ) : undefined
        }
      />

      {/* Overview */}
      <div>
        <SectionTitle icon={HeartHandshake} title={t('focusNext')} sub={t('parentDashSub')} />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <AchievementTile
            icon={Users}
            value={data.children.length}
            label={t('children')}
            tone="violet"
            hint={t('myChildrenTitle')}
          />
          <AchievementTile
            icon={Bell}
            value={data.unreadNotifications}
            label={t('unreadNotifications')}
            tone="gold"
            hint={t('notifications')}
          />
          <Link href="/parent/attendance" className="group">
            <AchievementTile
              icon={ScanLine}
              value="→"
              label={t('myAttendance')}
              tone="teal"
              hint={t('attendanceHint')}
            />
          </Link>
          <Link href="/parent/payments" className="group">
            <AchievementTile
              icon={Receipt}
              value="→"
              label={t('payments')}
              tone="green"
              hint={t('paymentHistory')}
            />
          </Link>
        </div>
      </div>

      {/* Children */}
      <div>
        <SectionTitle
          icon={GraduationCap}
          title={t('myChildrenTitle')}
          action={
            <Link href="/parent/children">
              <Button variant="ghost" size="sm">{t('viewAll')} <Arrow className="h-3.5 w-3.5" /></Button>
            </Link>
          }
        />
        {data.children.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={t('noChildrenLinkedYet')}
            description={t('linkChildrenDesc')}
            action={
              <Link href="/profile">
                <Button size="sm">{t('linkChild')}</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.children.map((child, index) => {
              const accent = CHILD_ACCENTS[index % CHILD_ACCENTS.length];
              return (
                <Link key={child.id} href={`/parent/children/${child.id}`} className="group">
                  <Card bodyClassName="p-0">
                    <div className={`h-1.5 rounded-t-xl ${accent === 'violet' ? 'from-violet-400 to-violet-600' : accent === 'teal' ? 'from-teal-400 to-teal-600' : accent === 'brand' ? 'from-brand-400 to-brand-600' : accent === 'gold' ? 'from-amber-400 to-amber-600' : accent === 'green' ? 'from-emerald-400 to-emerald-600' : 'from-rose-400 to-rose-600'} bg-gradient-to-r`} aria-hidden />
                    <div className="flex items-center gap-3.5 p-5 transition-colors group-hover:bg-slate-50/60 dark:group-hover:bg-slate-800/40">
                      <Avatar name={child.fullName} src={child.photo} size="lg" className="ring-2 ring-slate-100 dark:ring-slate-700" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
                          {child.fullName}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{child.grade ?? t('noGrade')}</p>
                        <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
                          {t('childCardHint')}
                          <Arrow className="h-3 w-3 transition-transform duration-200 group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" />
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
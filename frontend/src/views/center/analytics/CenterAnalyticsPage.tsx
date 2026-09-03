'use client';

import { useState } from 'react';
import {
  Users,
  BookOpen,
  Calendar,
  CreditCard,
  Download,
  Award,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { StatCard } from '../../../components/ui/StatCard';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { useApi } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useT } from '../../../i18n';

interface AnalyticsData {
  studentsTrend: number;
  teachersTrend: number;
  revenueTrend: number;
  lessonsTrend: number;
  topSubjects: { name: string; count: number }[];
}

export default function CenterAnalyticsPage() {
  const { t } = useT();
  const [period, setPeriod] = useState('month');

  const { data: analytics, loading } = useApi<AnalyticsData>(
    () => api.get<AnalyticsData>('/center/account/analytics', { period }),
    [period]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('analytics')}
        subtitle={t('analyticsSub')}
        action={
          <div className="flex gap-2">
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              options={[
                { value: 'week', label: t('thisWeek') },
                { value: 'month', label: t('thisMonth') },
                { value: 'year', label: t('thisYear') },
              ]}
            />
            <Button variant="outline">
              <Download className="h-4 w-4" />
              {t('export')}
            </Button>
          </div>
        }
      />

      {loading ? (
        <PencilLoader label={t('loading')} />
      ) : (
        <>
          {/* Trends */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label={t('students')}
              value={`${analytics?.studentsTrend ?? 0}%`}
              icon={Users}
              tone="brand"
            />
            <StatCard
              label={t('teachers')}
              value={`${analytics?.teachersTrend ?? 0}%`}
              icon={BookOpen}
              tone="violet"
            />
            <StatCard
              label={t('revenue')}
              value={`${analytics?.revenueTrend ?? 0}%`}
              icon={CreditCard}
              tone="emerald"
            />
            <StatCard
              label={t('lessons')}
              value={`${analytics?.lessonsTrend ?? 0}%`}
              icon={Calendar}
              tone="amber"
            />
          </div>

          {/* Top Subjects Chart */}
          <Card title={t('topSubjects')}>
            {analytics?.topSubjects && analytics.topSubjects.length > 0 ? (
              <div className="space-y-4 p-4">
                {analytics.topSubjects.map((subject, i) => {
                  const maxCount = Math.max(...analytics.topSubjects.map((s) => s.count));
                  const percentage = maxCount > 0 ? (subject.count / maxCount) * 100 : 0;
                  return (
                    <div key={subject.name} className="flex items-center gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                            {subject.name}
                          </p>
                          <span className="ms-2 text-xs text-slate-500">{subject.count}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center">
                <div className="text-center">
                  <Award className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-500">{t('noData')}</p>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

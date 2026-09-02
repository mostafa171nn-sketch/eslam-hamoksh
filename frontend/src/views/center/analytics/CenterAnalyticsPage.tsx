'use client';

import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Calendar,
  CreditCard,
  Download,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { StatCard } from '../../../components/ui/StatCard';
import { useApi } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useT } from '../../../i18n';

interface AnalyticsData {
  studentsTrend: number;
  teachersTrend: number;
  revenueTrend: number;
  lessonsTrend: number;
  topSubjects: { name: string; count: number }[];
  monthlyRevenue: { month: string; amount: number }[];
}

export default function CenterAnalyticsPage() {
  const { t } = useT();
  const [period, setPeriod] = useState('month');

  const { data: analytics } = useApi<AnalyticsData>(
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

      {/* Trends */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={t('students')}
          value={0}
          icon={Users}
          trend={analytics?.studentsTrend || 0}
          tone="brand"
        />
        <StatCard
          label={t('teachers')}
          value={0}
          icon={BookOpen}
          trend={analytics?.teachersTrend || 0}
          tone="violet"
        />
        <StatCard
          label={t('revenue')}
          value={0}
          icon={CreditCard}
          trend={analytics?.revenueTrend || 0}
          tone="emerald"
        />
        <StatCard
          label={t('lessons')}
          value={0}
          icon={Calendar}
          trend={analytics?.lessonsTrend || 0}
          tone="amber"
        />
      </div>

      {/* Charts Placeholder */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t('monthlyRevenue')}>
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <BarChart3 className="mx-auto mb-3 h-16 w-16 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500">{t('chartPlaceholder')}</p>
            </div>
          </div>
        </Card>
        <Card title={t('topSubjects')}>
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <TrendingUp className="mx-auto mb-3 h-16 w-16 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500">{t('chartPlaceholder')}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

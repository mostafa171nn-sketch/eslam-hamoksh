'use client';

import { useState } from 'react';
import {
  Download,
  Award,
} from 'lucide-react';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
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
      <CenterPageHeader
        title={t('analytics')}
        description={t('analyticsSub')}
      >
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="mj-select"
        >
          <option value="week">{t('thisWeek')}</option>
          <option value="month">{t('thisMonth')}</option>
          <option value="year">{t('thisYear')}</option>
        </select>
        <button className="mj-btn mj-btn--ghost">
          <Download className="h-4 w-4" />
          {t('export')}
        </button>
      </CenterPageHeader>

      {loading ? (
        <PencilLoader label={t('loading')} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CenterStatCard
              value={`${analytics?.studentsTrend ?? 0}%`}
              label={t('students')}
            />
            <CenterStatCard
              value={`${analytics?.teachersTrend ?? 0}%`}
              label={t('teachers')}
            />
            <CenterStatCard
              value={`${analytics?.revenueTrend ?? 0}%`}
              label={t('revenue')}
            />
            <CenterStatCard
              value={`${analytics?.lessonsTrend ?? 0}%`}
              label={t('lessons')}
            />
          </div>

          <div className="mj-card">
            <div style={{ padding: '0.875rem 1.125rem', borderBottom: '1px solid var(--mj-border-soft)' }}>
              <span className="mj-title">{t('topSubjects')}</span>
            </div>
            {analytics?.topSubjects && analytics.topSubjects.length > 0 ? (
              <div className="space-y-4 p-4">
                {analytics.topSubjects.map((subject, i) => {
                  const maxCount = Math.max(...analytics.topSubjects.map((s) => s.count));
                  const percentage = maxCount > 0 ? (subject.count / maxCount) * 100 : 0;
                  return (
                    <div key={subject.name} className="flex items-center gap-4">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                        style={{ background: 'var(--mj-accent-soft)', color: 'var(--mj-accent)' }}
                      >
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="truncate text-sm font-medium" style={{ color: 'var(--mj-ink-strong)' }}>
                            {subject.name}
                          </p>
                          <span className="ms-2 text-xs" style={{ color: 'var(--mj-muted-2)' }}>{subject.count}</span>
                        </div>
                        <div
                          className="h-2 w-full overflow-hidden rounded-full"
                          style={{ background: 'var(--mj-line-bg)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%`, background: 'var(--mj-accent)' }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mj-empty">
                <Award className="mj-empty-icon" />
                <p>{t('noData')}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

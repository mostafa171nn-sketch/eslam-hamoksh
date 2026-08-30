import { useState } from 'react';
import { useT } from '../../i18n';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { AnalyticsData } from '../../lib/types';
import { dayName } from '../../lib/format';

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-xs text-slate-500">{label}</span>
      <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
        <div className="h-full rounded bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-end text-xs font-medium text-slate-700">{value}</span>
    </div>
  );
}

function BarChart({ title, data, labelKey }: { title: string; data: { [key: string]: string | number }[]; labelKey: string }) {
  const { t } = useT();
  const max = Math.max(1, ...data.map((d) => Number(d.count) || 0));
  return (
    <Card title={title}>
      <div className="space-y-2">
        {data.length === 0 && <p className="text-sm text-slate-400">{t('noData')}</p>}
        {data.map((d) => (
          <BarRow key={String(d[labelKey])} label={String(d[labelKey])} value={Number(d.count) || 0} max={max} />
        ))}
      </div>
    </Card>
  );
}

export default function AdminAnalyticsPage() {
  const { t } = useT();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');

  const { data, loading, initialLoading, error } = useApi(
    () => api.get<AnalyticsData>('/admin/analytics', { from: appliedFrom || undefined, to: appliedTo || undefined }),
    [appliedFrom, appliedTo],
  );

  return (
    <div>
      <PageHeader
        title={t('analytics')}
        subtitle={t('analyticsSub')}
        action={
          <div className="flex items-end gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} label={t('from')} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} label={t('to')} />
            <Button variant="secondary" onClick={() => { setAppliedFrom(from); setAppliedTo(to); }}>
              {t('apply')}
            </Button>
          </div>
        }
      />

      {error && <Alert message={error} className="mb-4" />}
      {loading && (initialLoading ? <PencilLoader label={t('loadingAnalytics')} /> : <PencilLoader size="sm" label={t('loadingAnalytics')} />)}

      {!loading && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label={t('totalStudents')} value={data.totalStudents} />
            <StatCard label={t('activeStudents')} value={data.activeStudents} />
            <StatCard label={t('completedLessonsStat')} value={data.completedLessons} sub={`${data.cancelledLessons} ${t('cancelled')}`} />
            <StatCard label={t('examPassRate')} value={`${data.exams.passRate}%`} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <BarChart title={t('signupsPerMonth')} data={data.studentGrowth} labelKey="month" />
            <BarChart title={t('lessonsPerMonth')} data={data.lessonsPerMonth} labelKey="month" />
            <BarChart title={t('studentsPerGrade')} data={data.studentsPerGrade} labelKey="grade" />
            <BarChart title={t('teachersPerSubject')} data={data.teachersPerSubject} labelKey="subject" />
            <BarChart title={t('subjectPopularityChart')} data={data.subjectPopularity} labelKey="subject" />
            <BarChart
              title={t('busiestDays')}
              data={data.busyDays.map((b) => ({ day: dayName(b.day), count: b.count }))}
              labelKey="day"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title={t('exams')}>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-slate-500">{t('totalExams')}</dt><dd className="font-semibold text-slate-900 dark:text-white">{data.exams.total}</dd></div>
                <div><dt className="text-slate-500">{t('attempts')}</dt><dd className="font-semibold text-slate-900 dark:text-white">{data.exams.attempts}</dd></div>
                <div><dt className="text-slate-500">{t('averageScore')}</dt><dd className="font-semibold text-slate-900 dark:text-white">{data.exams.average}%</dd></div>
                <div><dt className="text-slate-500">{t('highestLowest')}</dt><dd className="font-semibold text-slate-900 dark:text-white">{data.exams.highest}% / {data.exams.lowest}%</dd></div>
              </dl>
            </Card>
            <Card title={t('assignments')}>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-slate-500">{t('total')}</dt><dd className="font-semibold text-slate-900 dark:text-white">{data.assignments.total}</dd></div>
                <div><dt className="text-slate-500">{t('submittedStat')}</dt><dd className="font-semibold text-slate-900 dark:text-white">{data.assignments.submitted}</dd></div>
                <div><dt className="text-slate-500">{t('late')}</dt><dd className="font-semibold text-slate-900 dark:text-white">{data.assignments.late}</dd></div>
                <div><dt className="text-slate-500">{t('averageGrade')}</dt><dd className="font-semibold text-slate-900 dark:text-white">{data.assignments.averageGrade}/100</dd></div>
              </dl>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

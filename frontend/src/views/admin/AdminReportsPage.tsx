import { useState, type ReactNode } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge, statusTone } from '../../components/ui/Badge';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useT, type Dict } from '../../i18n';

type ReportType =
  | 'monthly-students'
  | 'teacher-performance'
  | 'subject-popularity'
  | 'lesson-activity'
  | 'exam-performance'
  | 'assignments';

function reportTypeLabel(type: ReportType): keyof Dict {
  switch (type) {
    case 'monthly-students':
      return 'reportMonthlyStudents';
    case 'teacher-performance':
      return 'reportTeacherPerformance';
    case 'subject-popularity':
      return 'reportSubjectPopularity';
    case 'lesson-activity':
      return 'reportLessonActivity';
    case 'exam-performance':
      return 'reportExamPerformance';
    case 'assignments':
      return 'assignments';
  }
}

function lessonStatusKey(status: string): keyof Dict {
  switch (status) {
    case 'SCHEDULED':
      return 'scheduled';
    case 'RESCHEDULED':
      return 'rescheduled';
    case 'COMPLETED':
      return 'completedStatus';
    case 'CANCELLED':
      return 'cancelled';
    case 'NO_SHOW':
      return 'noShowAction';
    default:
      return 'status';
  }
}

const TYPES: { value: ReportType }[] = [
  { value: 'monthly-students' },
  { value: 'teacher-performance' },
  { value: 'subject-popularity' },
  { value: 'lesson-activity' },
  { value: 'exam-performance' },
  { value: 'assignments' },
];

type ReportData = unknown;

export default function AdminReportsPage() {
  const { t } = useT();
  const [type, setType] = useState<ReportType>('monthly-students');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');

  const { data, loading, initialLoading, error } = useApi(
    () => api.get<ReportData>(`/admin/reports/${type}`, { from: appliedFrom || undefined, to: appliedTo || undefined }),
    [type, appliedFrom, appliedTo],
  );

  const th = 'pb-2 pe-4 text-start text-xs font-medium uppercase tracking-wide text-slate-400';
  const td = 'py-2.5 pe-4 text-slate-700';

  const renderData = (): ReactNode => {
    if (!data) return null;

    if (type === 'monthly-students' || type === 'subject-popularity') {
      const rows = data as { [k: string]: string | number }[];
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 dark:border-slate-700">{Object.keys(rows[0] ?? {}).map((k) => <th key={k} className={th}>{k.replace(/_/g, ' ')}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((r, i) => (
                <tr key={i}>{Object.entries(r).map(([k, v]) => <td key={k} className={td}>{String(v)}</td>)}</tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="py-6 text-center text-sm text-slate-400">{t('noData')}</p>}
        </div>
      );
    }

    if (type === 'teacher-performance' || type === 'exam-performance') {
      const rows = data as Record<string, string | number>[];
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 dark:border-slate-700">{Object.keys(rows[0] ?? {}).map((k) => <th key={k} className={th}>{k.replace(/_/g, ' ')}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((r, i) => (
                <tr key={i}>{Object.entries(r).map(([k, v]) => <td key={k} className={td}>{k.includes('Time') ? formatDate(String(v)) : String(v)}</td>)}</tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="py-6 text-center text-sm text-slate-400">{t('noData')}</p>}
        </div>
      );
    }

    if (type === 'lesson-activity') {
      const d = data as {
        total: number;
        byStatus: { status: string; count: number }[];
        perDay: { date: string; count: number }[];
        recent: { id: string; date: string; startTime: string; endTime: string; status: string }[];
      };
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">{t('total')}: {d.total}</p>
              <div className="flex flex-wrap gap-2">
                {d.byStatus.map((s) => (
                  <Badge key={s.status} tone={statusTone(s.status)}>{t(lessonStatusKey(s.status))}: {s.count}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">{t('perDay')}</p>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {d.perDay.map((p) => (
                  <div key={String(p.date)} className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>{formatDate(p.date)}</span><span className="font-medium">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 dark:border-slate-700"><th className={th}>{t('date')}</th><th className={th}>{t('time')}</th><th className={th}>{t('status')}</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {d.recent.map((r) => (
                  <tr key={r.id}>
                    <td className={td}>{formatDate(r.date)}</td>
                    <td className={td}>{r.startTime} – {r.endTime}</td>
                    <td className={td}><Badge tone={statusTone(r.status)}>{t(lessonStatusKey(r.status))}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // assignments
    const d = data as Record<string, number>;
    return (
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        {Object.entries(d).map(([k, v]) => (
          <div key={k}>
            <dt className="text-slate-500">{k.replace(/_/g, ' ')}</dt>
            <dd className="font-semibold text-slate-900 dark:text-white">{v}</dd>
          </div>
        ))}
      </dl>
    );
  };

  return (
    <div>
      <PageHeader
        title={t('reports')}
        subtitle={t('reportsSub')}
        action={
          <div className="flex flex-wrap items-end gap-2">
            <Input type="date" label={t('from')} value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" label={t('to')} value={to} onChange={(e) => setTo(e.target.value)} />
            <Button variant="secondary" onClick={() => { setAppliedFrom(from); setAppliedTo(to); }}>
              {t('applyRange')}
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TYPES.map((t2) => (
          <button
            key={t2.value}
            onClick={() => setType(t2.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              type === t2.value ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40 dark:bg-slate-800'
            }`}
          >
            {t(reportTypeLabel(t2.value))}
          </button>
        ))}
      </div>

      {error && <Alert message={error} className="mb-4" />}
      {loading && <PencilLoader label={t('generatingReport')} size={initialLoading ? undefined : 'sm'} />}

      {!loading && data != null && <Card>{renderData()}</Card>}
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  BarChart3,
  Download,
  FileText,
  Calendar,
  TrendingUp,
  Users,
  BookOpen,
  CreditCard,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { useApi } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useT, type DictKey } from '../../../i18n';

interface Report {
  id: string;
  name: string;
  type: string;
  generatedAt: string;
  status: string;
}

const REPORT_TYPES = [
  { id: 'attendance', name: 'Attendance Report', icon: Users },
  { id: 'payments', name: 'Payments Report', icon: CreditCard },
  { id: 'teachers', name: 'Teachers Report', icon: BookOpen },
  { id: 'students', name: 'Students Report', icon: Users },
  { id: 'lessons', name: 'Lessons Report', icon: Calendar },
  { id: 'revenue', name: 'Revenue Report', icon: TrendingUp },
];

export default function CenterReportsPage() {
  const { t } = useT();

  const [type, setType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [generating, setGenerating] = useState(false);

  const { data: reports, loading } = useApi<Report[]>(
    () => api.get<Report[]>('/center/account/reports'),
    []
  );

  const generateReport = async () => {
    if (!type) return;
    setGenerating(true);
    try {
      await api.post('/center/account/reports', { type, dateFrom, dateTo });
      alert(t('reportGenerated'));
    } catch (err) {
      alert(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports')}
        subtitle={t('reportsSub')}
        action={
          <Button variant="outline">
            <Download className="h-4 w-4" />
            {t('exportAll')}
          </Button>
        }
      />

      {/* Generate Report */}
      <Card title={t('generateReport')} bodyClassName="p-4">
        <div className="grid gap-4 sm:grid-cols-4">
          <Select
            label={t('reportType')}
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: '', label: t('selectType') },
              ...REPORT_TYPES.map(r => ({ value: r.id, label: t(r.id as DictKey) || r.name })),
            ]}
          />
          <Input
            label={t('from')}
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            label={t('to')}
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <div className="flex items-end">
            <Button onClick={generateReport} loading={generating} className="w-full">
              <BarChart3 className="h-4 w-4" />
              {t('generate')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Reports */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <FileText className="h-5 w-5" />
          {t('quickReports')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_TYPES.map((report) => {
            const Icon = report.icon;
            return (
              <Card key={report.id} bodyClassName="p-4 cursor-pointer hover:border-brand-300 transition-colors"
                onClick={() => { setType(report.id); generateReport(); }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{t(report.id as DictKey) || report.name}</h3>
                    <p className="text-xs text-slate-500">{t((report.id + 'Desc') as DictKey) || t('clickToGenerate')}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Reports */}
      {loading && <PencilLoader label={t('loading')} />}
      {!loading && reports && reports.length > 0 && (
        <Card title={t('recentReports')} bodyClassName="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{report.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(report.generatedAt).toLocaleString('en-GB')}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

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
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { CenterPageHeader } from '../ui/CenterPageHeader';
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
  const { t, lang } = useT();

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
      <CenterPageHeader
        eyebrow={t('centerDashboard')}
        title={t('reports')}
        description={t('reportsSub')}
      >
        <button type="button" className="mj-btn mj-btn--ghost">
          <Download className="h-4 w-4" /> {t('exportAll')}
        </button>
      </CenterPageHeader>

      <div className="mj-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[color:var(--mj-accent)]" />
          <h2 className="mj-title">{t('generateReport')}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="mj-field">
            <label className="mj-label">{t('reportType')}</label>
            <select className="mj-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">{t('selectType')}</option>
              {REPORT_TYPES.map(r => (
                <option key={r.id} value={r.id}>{t(r.id as DictKey) || r.name}</option>
              ))}
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('from')}</label>
            <input className="mj-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('to')}</label>
            <input className="mj-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button type="button" className="mj-btn mj-btn--primary w-full" onClick={generateReport} disabled={generating}>
              <BarChart3 className="h-4 w-4" /> {generating ? t('loading') : t('generate')}
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-[1.05rem] font-bold text-[color:var(--mj-ink-strong)]">
          <FileText className="h-5 w-5 text-[color:var(--mj-accent)]" /> {t('quickReports')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_TYPES.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                type="button"
                onClick={() => { setType(report.id); generateReport(); }}
                className="mj-card flex items-center gap-3 p-4 text-start transition-colors hover:border-[color:var(--mj-accent)]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[color:var(--mj-accent-soft)] text-[color:var(--mj-accent)]">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-[color:var(--mj-ink-strong)]">{t(report.id as DictKey) || report.name}</span>
                  <span className="block text-xs text-[color:var(--mj-muted)]">{t((report.id + 'Desc') as DictKey) || t('clickToGenerate')}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading && <div className="p-8"><PencilLoader label={t('loading')} /></div>}
      {!loading && reports && reports.length > 0 && (
        <div className="mj-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <h2 className="mj-title">{t('recentReports')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="mj-table">
              <thead>
                <tr>
                  <th>{t('reportType')}</th>
                  <th>{t('date')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--mj-wash)] text-[color:var(--mj-muted)]">
                          <FileText className="h-4 w-4" />
                        </span>
                        <span className="font-medium text-[color:var(--mj-ink-strong)]">{report.name}</span>
                      </div>
                    </td>
                    <td className="text-[color:var(--mj-muted)]">
                      {new Date(report.generatedAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <span className="flex justify-end">
                        <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm">
                          <Download className="h-4 w-4" />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

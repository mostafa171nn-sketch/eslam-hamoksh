'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ScanLine, TrendingDown } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { Pagination } from '../../components/ui/Pagination';
import { api } from '../../lib/api';
import { useApi, errorMessage } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatTime } from '../../lib/format';
import { useT } from '../../i18n';
import type { AttendanceAdminRow, AttendanceAdminSummary, AttendanceStatus, Subject } from '../../lib/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All status' },
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'LATE', label: 'Late' },
  { value: 'EXCUSED', label: 'Excused' },
];

const STATUS_TONE: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'violet'> = {
  PRESENT: 'green',
  LATE: 'amber',
  ABSENT: 'red',
  EXCUSED: 'slate',
};

export default function AdminAttendancePage() {
  const { t } = useT();
  const toast = useToast();
  const [params, setParams] = useState({ search: '', status: '', dateFrom: '', dateTo: '', subjectId: '', teacherId: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AttendanceAdminRow[]>([]);
  const [meta, setMeta] = useState<{ totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const initialRef = useRef(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<AttendanceAdminSummary | null>(null);
  const [editRow, setEditRow] = useState<AttendanceAdminRow | null>(null);
  const [status, setStatus] = useState<AttendanceStatus>('PRESENT');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: subjects } = useApi<Subject[]>(() => api.get<Subject[]>('/subjects'), []);
  const { data: teachers } = useApi<any[]>(() => api.get<any[]>('/teachers'), []);

  const load = useCallback(() => {
    setLoading(true);
    const q: Record<string, string | number> = { page, limit: 25, ...params };
    api
      .get<AttendanceAdminRow[]>('/attendance/admin', q)
      .then((res) => {
        setData(res.data);
        setMeta({ totalPages: res.meta?.totalPages ?? 1 });
        setError('');
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => {
        setLoading(false);
        if (initialRef.current) {
          initialRef.current = false;
          setInitialLoading(false);
        }
      });
  }, [params, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh the dashboard summary whenever filter dimensions change.
  useEffect(() => {
    const q = {
      status: params.status,
      subjectId: params.subjectId,
      teacherId: params.teacherId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    };
    api
      .get<AttendanceAdminSummary>('/attendance/admin/summary', q)
      .then((r) => setSummary(r.data))
      .catch(() => {});
  }, [params.status, params.subjectId, params.teacherId, params.dateFrom, params.dateTo]);

  const updateParam = (key: string, value: string) => {
    setPage(1);
    setParams((p) => ({ ...p, [key]: value }));
  };

  const openEdit = (row: AttendanceAdminRow) => {
    setEditRow(row);
    setStatus(row.status);
    setNote(row.note ?? '');
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setSaving(true);
    try {
      await api.put(`/attendance/${editRow.id}`, { status, note });
      toast.success('Attendance updated.');
      setEditRow(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const subjectOptions = [{ value: '', label: 'All subjects' }, ...(subjects ?? []).map((s) => ({ value: s.id, label: s.name }))];
  const teacherOptions = [
    { value: '', label: 'All teachers' },
    ...(teachers ?? []).map((t) => ({ value: t.id, label: t.fullName ?? t.user?.fullName ?? 'Teacher' })),
  ];

  return (
    <div>
      <PageHeader title={t('attendance')} subtitle={t('attendanceAdminSub')} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t('total')} value={summary?.total ?? '—'} icon={ScanLine} />
        <StatCard label={t('present')} value={summary?.present ?? '—'} />
        <StatCard label={t('late')} value={summary?.late ?? '—'} />
        <StatCard label={t('absent')} value={summary?.absent ?? '—'} />
        <StatCard label={t('excused')} value={summary?.excused ?? '—'} />
        <StatCard label={t('rate')} value={summary ? `${summary.percentage}%` : '—'} />
      </div>

      {summary && summary.lowAttendance.length > 0 && (
        <Card className="mt-4" title={t('lowAttendanceStudents')} subtitle={t('lowAttendanceSub')}>
          <div className="flex flex-wrap gap-2">
            {summary.lowAttendance.map((s) => (
              <span
                key={s.studentId}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20"
              >
                <TrendingDown className="h-3.5 w-3.5" />
                {s.fullName} · {s.percentage}%
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card bodyClassName="p-4" className="mt-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input placeholder={t('searchStudent')} value={params.search} onChange={(e) => updateParam('search', e.target.value)} />
          <Select label={t('status')} options={STATUS_OPTIONS} value={params.status} onChange={(e) => updateParam('status', e.target.value)} />
          <Select label={t('subject')} options={subjectOptions} value={params.subjectId} onChange={(e) => updateParam('subjectId', e.target.value)} />
          <Select label={t('teacherLabel')} options={teacherOptions} value={params.teacherId} onChange={(e) => updateParam('teacherId', e.target.value)} />
          <Input label={t('from')} type="date" value={params.dateFrom} onChange={(e) => updateParam('dateFrom', e.target.value)} />
          <Input label={t('to')} type="date" value={params.dateTo} onChange={(e) => updateParam('dateTo', e.target.value)} />
        </div>
      </Card>

      <Card className="mt-4">
        {error && <Alert message={error} className="m-4" />}
        {loading && (initialLoading ? <PencilLoader label="Loading records…" /> : <PencilLoader size="sm" label="Loading records…" />)}
        {!loading && (
          <div className="overflow-x-auto p-2">
            {data.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">{t('noAttendanceFound')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-start text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-4 font-medium">{t('student')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('lessonCol')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('statusCol')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('methodCol')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('markedCol')}</th>
                    <th className="pb-2 font-medium">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 dark:bg-slate-800/60">
                      <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-100">{row.student.fullName}</td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                        {row.lesson.subject} · {row.lesson.teacher}
                        <span className="block text-xs text-slate-400">
                          {formatDate(row.lesson.date)} {formatTime(row.lesson.startTime)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">{row.method}</td>
                      <td className="py-3 pr-4 text-slate-500">
                        {row.markedAt ? `${formatDate(row.markedAt)} ${formatTime(row.markedAt.slice(11, 16))}` : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <button onClick={() => openEdit(row)} className="text-brand-600 hover:underline">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {meta && (
          <div className="border-t border-slate-100 dark:border-slate-700 p-4">
            <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} />
          </div>
        )}
      </Card>

      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={t('editAttendance')} size="md">
        {editRow && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {editRow.student.fullName} · {editRow.lesson.subject}
            </p>
            <Select
              label={t('status')}
              options={STATUS_OPTIONS.filter((o) => o.value)}
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
            />
            <Textarea label={t('note')} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditRow(null)}>
                Cancel
              </Button>
              <Button onClick={saveEdit} loading={saving}>
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

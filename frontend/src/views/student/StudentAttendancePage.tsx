'use client';

import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { useT, type Dict } from '../../i18n';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { AttendanceRecord, AttendanceSummary } from '../../lib/types';
import { formatDate, formatTime } from '../../lib/format';

function attendanceStatusKey(status: string): keyof Dict {
  switch (status) {
    case 'PRESENT':
      return 'present';
    case 'LATE':
      return 'late';
    case 'ABSENT':
      return 'absent';
    case 'EXCUSED':
      return 'excused';
    default:
      return 'status';
  }
}

export default function StudentAttendancePage() {
  const { t } = useT();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const limit = 20;

  const studentId = user?.role === 'STUDENT' ? user.student.id : '';
  const { data, meta, loading, initialLoading, error } = useApi(
    () => api.get<AttendanceRecord[]>(`/lessons/attendance/student/${studentId}`, { page, limit }),
    [page, studentId],
  );
  const { data: summary } = useApi<AttendanceSummary>(
    () => api.get<AttendanceSummary>(`/attendance/summary/${studentId}`),
    [studentId],
  );

  return (
    <div>
      <PageHeader
        title={t('myAttendance')}
        subtitle={t('myAttendanceSub')}
        action={
          summary ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="green">{summary.present} {t('present')}</Badge>
              <Badge tone="amber">{summary.late} {t('late')}</Badge>
              <Badge tone="red">{summary.absent} {t('absent')}</Badge>
              <Badge tone="slate">{summary.excused} {t('excused')}</Badge>
              <Badge tone="blue">{summary.percentage}% {t('rate')}</Badge>
            </div>
          ) : undefined
        }
      />

      {error && <Alert message={error} className="mb-4" />}
      {loading && (initialLoading ? <PencilLoader label={t('loadingAttendance')} /> : <PencilLoader size="sm" label={t('loadingAttendance')} />)}

      {!loading && data && (
        <>
          {data.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title={t('noAttendanceRecords')}
              description={t('attendanceMarkedNote')}
            />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-start text-xs uppercase tracking-wide text-slate-400">
                      <th className="pb-2 pe-4 font-medium">{t('date')}</th>
                      <th className="hidden pb-2 pe-4 font-medium sm:table-cell">{t('time')}</th>
                      <th className="hidden pb-2 pe-4 font-medium md:table-cell">{t('subject')}</th>
                      <th className="pb-2 pe-4 font-medium">{t('status')}</th>
                      <th className="pb-2 font-medium">{t('note')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {data.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 dark:bg-slate-800/60">
                        <td className="py-3 pe-4 font-medium text-slate-800 dark:text-slate-100">{formatDate(r.lesson.date)}</td>
                        <td className="hidden py-3 pe-4 text-slate-500 sm:table-cell">
                          {formatTime(r.lesson.startTime)} – {formatTime(r.lesson.endTime)}
                        </td>
                        <td className="hidden py-3 pe-4 text-slate-600 dark:text-slate-300 md:table-cell">
                          {r.lesson.subject?.name ?? t('generalSubject')}
                        </td>
                        <td className="py-3 pe-4">
                          <Badge tone={statusTone(r.status)}>{t(attendanceStatusKey(r.status))}</Badge>
                        </td>
                        <td className="py-3 text-slate-500">{r.note ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <Pagination page={page} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

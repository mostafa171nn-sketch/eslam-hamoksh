'use client';

import { Users } from 'lucide-react';
import { useT } from '../../i18n';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { EmptyState } from '../../components/ui/EmptyState';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { formatDate, formatTime } from '../../lib/format';
import type { ParentChildAttendance } from '../../lib/types';

const STATUS_TONE: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'violet'> = {
  PRESENT: 'green',
  LATE: 'amber',
  ABSENT: 'red',
  EXCUSED: 'slate',
  NOT_MARKED: 'slate',
};

function statusLabel(status: string): 'present' | 'late' | 'absent' | 'excused' | 'notMarked' {
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
      return 'notMarked';
  }
}

export default function ParentAttendancePage() {
  const { t } = useT();
  const { data, loading, initialLoading, error } = useApi<ParentChildAttendance[]>(
    () => api.get<ParentChildAttendance[]>('/attendance/parent/overview'),
    [],
  );

  return (
    <div>
      <PageHeader title={t('attendance')} subtitle={t('childAttendanceOverview')} />

      {error && <Alert message={error} className="mb-4" />}
      {loading && (initialLoading ? <PencilLoader label={t('loadingAttendance')} /> : <PencilLoader size="sm" label={t('loadingAttendance')} />)}

      {!loading && data && data.length === 0 && (
        <EmptyState icon={Users} title={t('noChildrenLinked')} description={t('noChildrenLinkedDesc')} />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((child) => (
          <Card key={child.student.id}>
            <div className="flex items-center gap-3">
              <Avatar src={child.student.photo} name={child.student.fullName} size="lg" />
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{child.student.fullName}</h3>
                <p className="text-sm text-slate-500">{t('attendanceRate')}: {child.summary.percentage}%</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="green">{child.summary.present} {t('present')}</Badge>
              <Badge tone="amber">{child.summary.late} {t('late')}</Badge>
              <Badge tone="red">{child.summary.absent} {t('absent')}</Badge>
              <Badge tone="slate">{child.summary.excused} {t('excused')}</Badge>
            </div>

            <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">{t('recent')}</p>
              {child.recent.length === 0 ? (
                <p className="text-sm text-slate-400">{t('noRecentAttendance')}</p>
              ) : (
                <ul className="space-y-2">
                  {child.recent.map((r) => (
                    <li key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">
                        {r.subject}
                        <span className="ms-1 text-xs text-slate-400">
                          {formatDate(r.date)} {r.markedAt ? `· ${formatTime((r.markedAt as string).slice(11, 16))}` : ''}
                        </span>
                      </span>
                      <Badge tone={STATUS_TONE[r.status]}>{t(statusLabel(r.status))}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

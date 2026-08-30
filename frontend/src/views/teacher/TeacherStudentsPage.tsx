import { useState } from 'react';
import Link from 'next/link';
import { CalendarPlus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useT } from '../../i18n';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { TeacherStudent } from '../../lib/types';
import { formatDate } from '../../lib/format';

export default function TeacherStudentsPage() {
  const { t } = useT();
  const [page, setPage] = useState(1);
  const { data, meta, loading, initialLoading, error } = useApi(
    () => api.get<TeacherStudent[]>('/teachers/me/students', { page, limit: 20 }),
    [page],
  );

  return (
    <div>
      <PageHeader
        title={t('myStudents')}
        subtitle={t('myStudentsSub')}
        action={
          <Link href="/teacher/lessons">
            <Button size="sm">
              <CalendarPlus className="h-4 w-4" /> {t('scheduleLesson')}
            </Button>
          </Link>
        }
      />

      {error && <Alert message={error} className="mb-4" />}
      {loading && (initialLoading ? <PencilLoader label={t('loadingStudents')} /> : <PencilLoader size="sm" label={t('loadingStudents')} />)}

      {!loading && data && (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-start text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pe-4 font-medium">{t('studentCol')}</th>
                    <th className="hidden pb-2 pe-4 font-medium sm:table-cell">{t('grade')}</th>
                    <th className="hidden pb-2 pe-4 font-medium md:table-cell">{t('subjects')}</th>
                    <th className="hidden pb-2 pe-4 font-medium lg:table-cell">{t('nextLesson')}</th>
                    <th className="pb-2 font-medium">{t('attendance')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {data.map((s) => {
                    const present = s.attendance.find((a) => a.status === 'PRESENT')?._count._all ?? 0;
                    const absent = s.attendance.find((a) => a.status === 'ABSENT')?._count._all ?? 0;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 dark:bg-slate-800/60">
                        <td className="py-3 pe-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={s.fullName} src={s.photo} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900 dark:text-white">{s.fullName}</p>
                              <p className="text-xs text-slate-400">{t('idLabel')}: {s.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden py-3 pe-4 text-slate-600 dark:text-slate-300 sm:table-cell">{s.grade?.name ?? '—'}</td>
                        <td className="hidden py-3 pe-4 md:table-cell">
                          <div className="flex max-w-48 flex-wrap gap-1">
                            {s.subjects.slice(0, 3).map((sub) => (
                              <Badge key={sub.id} tone="blue">{sub.name}</Badge>
                            ))}
                            {s.subjects.length > 3 && <Badge tone="slate">+{s.subjects.length - 3}</Badge>}
                          </div>
                        </td>
                        <td className="hidden py-3 pe-4 text-slate-500 lg:table-cell">
                          {s.upcomingLesson ? (
                            <span>
                              {formatDate(s.upcomingLesson.date)} · {s.upcomingLesson.startTime}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2 text-xs">
                            <Badge tone="green">{present} {t('present')}</Badge>
                            <Badge tone="red">{absent} {t('absent')}</Badge>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Pagination page={page} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
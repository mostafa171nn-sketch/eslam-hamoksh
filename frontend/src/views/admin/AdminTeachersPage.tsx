import { useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { AdminTeacher } from '../../lib/types';
import { formatCurrency } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { useT, type Dict } from '../../i18n';

function teacherStatusKey(status: string): keyof Dict {
  return status === 'ACTIVE' ? 'statusActive' : 'suspended';
}

export default function AdminTeachersPage() {
  const { t } = useT();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, meta, loading, initialLoading, error, reload } = useApi(
    () => api.get<AdminTeacher[]>('/admin/teachers', { search: search || undefined, page, limit: 20 }),
    [page, search],
  );

  const toggleStatus = async (teacher: AdminTeacher) => {
    setBusyId(teacher.userId);
    try {
      const next = teacher.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await api.put(`/admin/users/${teacher.userId}/status`, { status: next });
      toast.success(next === 'ACTIVE' ? t('userActivated', { name: teacher.fullName }) : t('userSuspended', { name: teacher.fullName }));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader title={t('teachersNav')} subtitle={t('teachersSub')} />

      <Card bodyClassName="p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t('searchTeachers')}
              className="ps-9 pe-3"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), setSearch(searchInput))}
            />
          </div>
          <Button variant="secondary" onClick={() => { setPage(1); setSearch(searchInput); }}>
            {t('search')}
          </Button>
        </div>

        {error && <Alert message={error} />}
        {loading && <PencilLoader label={t('loadingTeachersList')} size={initialLoading ? undefined : 'sm'} />}

        {!loading && data && (
          <>
            <div className="tbl-surface tbl-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-start text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pe-4 font-medium">{t('teacherLabel')}</th>
                    <th className="hidden pb-2 pe-4 font-medium md:table-cell">{t('subjects')}</th>
                    <th className="hidden pb-2 pe-4 font-medium lg:table-cell">{t('grades')}</th>
                    <th className="pb-2 pe-4 font-medium">{t('rateCol')}</th>
                    <th className="hidden pb-2 pe-4 font-medium sm:table-cell">{t('studentsLabel')}</th>
                    <th className="hidden pb-2 pe-4 font-medium sm:table-cell">{t('lessons')}</th>
                    <th className="pb-2 pe-4 font-medium">{t('status')}</th>
                    <th className="pb-2 text-start font-medium">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {data.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 dark:bg-slate-800/60">
                      <td className="py-3 pe-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={teacher.fullName} src={teacher.photo} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900 dark:text-white">{teacher.fullName}</p>
                            <p className="truncate text-xs text-slate-400">
                              @{teacher.username} · {teacher.location?.name ?? t('noBranch')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden py-3 pe-4 md:table-cell">
                        <div className="flex max-w-48 flex-wrap gap-1">
                          {teacher.subjects.slice(0, 3).map((s) => (
                            <Badge key={s} tone="blue">{s}</Badge>
                          ))}
                          {teacher.subjects.length > 3 && <Badge tone="slate">+{teacher.subjects.length - 3}</Badge>}
                        </div>
                      </td>
                      <td className="hidden py-3 pe-4 text-slate-500 lg:table-cell">{teacher.grades.join(', ') || '—'}</td>
                      <td className="py-3 pe-4 font-medium text-slate-700">{formatCurrency(teacher.hourlyRate)}</td>
                      <td className="hidden py-3 pe-4 text-slate-500 sm:table-cell">{teacher.students}</td>
                      <td className="hidden py-3 pe-4 text-slate-500 sm:table-cell">{teacher.lessons}</td>
                      <td className="py-3 pe-4">
                        <Badge tone={teacher.status === 'ACTIVE' ? 'green' : 'red'}>{t(teacherStatusKey(teacher.status))}</Badge>
                      </td>
                      <td className="py-3 text-start">
                        <Button size="sm" variant={teacher.status === 'ACTIVE' ? 'outline' : 'secondary'} loading={busyId === teacher.userId} onClick={() => toggleStatus(teacher)}>
                          {teacher.status === 'ACTIVE' ? t('suspend') : t('activate')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}

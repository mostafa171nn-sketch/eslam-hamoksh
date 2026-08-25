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

export default function AdminTeachersPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, meta, loading, initialLoading, error, reload } = useApi(
    () => api.get<AdminTeacher[]>('/admin/teachers', { search: search || undefined, page, limit: 20 }),
    [page, search],
  );

  const toggleStatus = async (t: AdminTeacher) => {
    setBusyId(t.userId);
    try {
      const next = t.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await api.put(`/admin/users/${t.userId}/status`, { status: next });
      toast.success(`${t.fullName} ${next === 'ACTIVE' ? 'activated' : 'suspended'}.`);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Teachers" subtitle="View and manage teacher accounts." />

      <Card bodyClassName="p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search teachers…"
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), setSearch(searchInput))}
            />
          </div>
          <Button variant="secondary" onClick={() => { setPage(1); setSearch(searchInput); }}>
            Search
          </Button>
        </div>

        {error && <Alert message={error} />}
        {loading && (initialLoading ? <PencilLoader label="Loading teachers…" /> : <PencilLoader size="sm" label="Loading teachers…" />)}

        {!loading && data && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-start text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-4 font-medium">Teacher</th>
                    <th className="hidden pb-2 pr-4 font-medium md:table-cell">Subjects</th>
                    <th className="hidden pb-2 pr-4 font-medium lg:table-cell">Grades</th>
                    <th className="pb-2 pr-4 font-medium">Rate</th>
                    <th className="hidden pb-2 pr-4 font-medium sm:table-cell">Students</th>
                    <th className="hidden pb-2 pr-4 font-medium sm:table-cell">Lessons</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {data.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 dark:bg-slate-800/60">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={t.fullName} src={t.photo} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900 dark:text-white">{t.fullName}</p>
                            <p className="truncate text-xs text-slate-400">
                              @{t.username} · {t.location?.name ?? 'No branch'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden py-3 pr-4 md:table-cell">
                        <div className="flex max-w-48 flex-wrap gap-1">
                          {t.subjects.slice(0, 3).map((s) => (
                            <Badge key={s} tone="blue">{s}</Badge>
                          ))}
                          {t.subjects.length > 3 && <Badge tone="slate">+{t.subjects.length - 3}</Badge>}
                        </div>
                      </td>
                      <td className="hidden py-3 pr-4 text-slate-500 lg:table-cell">{t.grades.join(', ') || '—'}</td>
                      <td className="py-3 pr-4 font-medium text-slate-700">{formatCurrency(t.hourlyRate)}</td>
                      <td className="hidden py-3 pr-4 text-slate-500 sm:table-cell">{t.students}</td>
                      <td className="hidden py-3 pr-4 text-slate-500 sm:table-cell">{t.lessons}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={t.status === 'ACTIVE' ? 'green' : 'red'}>{t.status.toLowerCase()}</Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button size="sm" variant={t.status === 'ACTIVE' ? 'outline' : 'secondary'} loading={busyId === t.userId} onClick={() => toggleStatus(t)}>
                          {t.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
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

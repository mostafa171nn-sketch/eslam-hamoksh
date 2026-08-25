import { useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { AdminUser, UserStatus } from '../../lib/types';
import { formatDate } from '../../lib/format';
import { useToast } from '../../context/ToastContext';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'CENTER_ADMIN', label: 'Center Admin' },
  { value: 'ADMIN', label: 'Admin (legacy)' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

export default function AdminUsersPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, meta, loading, initialLoading, error, reload } = useApi(
    () => api.get<AdminUser[]>('/admin/users', { role: role || undefined, status: status || undefined, search: search || undefined, page, limit: 20 }),
    [page, role, status, search],
  );

  const toggleStatus = async (user: AdminUser) => {
    setBusyId(user.id);
    try {
      const next: UserStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await api.put(`/admin/users/${user.id}/status`, { status: next });
      toast.success(`${user.fullName} ${next === 'ACTIVE' ? 'activated' : 'suspended'}.`);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Users" subtitle="Search, filter and manage all accounts." />

      <Card bodyClassName="p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, username or phone…"
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1);
                  setSearch(searchInput);
                }
              }}
            />
          </div>
          <Select options={ROLE_OPTIONS} value={role} onChange={(e) => { setPage(1); setRole(e.target.value); }} className="sm:w-44" />
          <Select options={STATUS_OPTIONS} value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="sm:w-44" />
          <Button variant="secondary" onClick={() => { setPage(1); setSearch(searchInput); }}>
            Search
          </Button>
        </div>

        {error && <Alert message={error} />}
        {loading && (initialLoading ? <PencilLoader label="Loading users…" /> : <PencilLoader size="sm" label="Loading users…" />)}

        {!loading && data && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-start text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-4 font-medium">User</th>
                    <th className="pb-2 pr-4 font-medium">Role</th>
                    <th className="hidden pb-2 pr-4 font-medium sm:table-cell">Phone</th>
                    <th className="hidden pb-2 pr-4 font-medium md:table-cell">Joined</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {data.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 dark:bg-slate-800/60">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.fullName} src={u.photo} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900 dark:text-white">{u.fullName}</p>
                            <p className="truncate text-xs text-slate-400">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone={u.role === 'ADMIN' || u.role === 'CENTER_ADMIN' ? 'violet' : u.role === 'TEACHER' ? 'blue' : 'slate'}>
                          {u.role.toLowerCase()}
                        </Badge>
                      </td>
                      <td className="hidden py-3 pr-4 text-slate-500 sm:table-cell">{u.phone ?? '—'}</td>
                      <td className="hidden py-3 pr-4 text-slate-500 md:table-cell">{formatDate(u.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={u.status === 'ACTIVE' ? 'green' : 'red'}>{u.status.toLowerCase()}</Badge>
                      </td>
                      <td className="py-3 text-right">
                        {u.role !== 'ADMIN' && u.role !== 'CENTER_ADMIN' ? (
                          <Button
                            size="sm"
                            variant={u.status === 'ACTIVE' ? 'outline' : 'secondary'}
                            loading={busyId === u.id}
                            onClick={() => toggleStatus(u)}
                          >
                            {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-300">Protected</span>
                        )}
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

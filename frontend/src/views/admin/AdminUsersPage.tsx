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
import { useT, type Dict } from '../../i18n';

function roleKey(role: string): keyof Dict {
  switch (role) {
    case 'TEACHER':
      return 'teacherRole';
    case 'STUDENT':
      return 'studentRole';
    case 'PARENT':
      return 'parentRole';
    case 'CENTER_ADMIN':
      return 'centerAdmin';
    case 'ADMIN':
      return 'adminLegacy';
    default:
      return 'role';
  }
}

function userStatusKey(status: string): keyof Dict {
  return status === 'ACTIVE' ? 'statusActive' : 'suspended';
}

export default function AdminUsersPage() {
  const { t } = useT();
  const toast = useToast();
  const ROLE_OPTIONS = [
    { value: '', label: t('allRoles') },
    { value: 'TEACHER', label: t('teacherRole') },
    { value: 'STUDENT', label: t('studentRole') },
    { value: 'PARENT', label: t('parentRole') },
    { value: 'CENTER_ADMIN', label: t('centerAdmin') },
    { value: 'ADMIN', label: t('adminLegacy') },
  ];
  const STATUS_OPTIONS = [
    { value: '', label: t('allStatus') },
    { value: 'ACTIVE', label: t('statusActive') },
    { value: 'SUSPENDED', label: t('suspended') },
  ];
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
      toast.success(next === 'ACTIVE' ? t('userActivated', { name: user.fullName }) : t('userSuspended', { name: user.fullName }));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader title={t('users')} subtitle={t('usersSub')} />

      <Card bodyClassName="p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t('searchNameUsernamePhone')}
              className="ps-9 pe-3"
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
            {t('search')}
          </Button>
        </div>

        {error && <Alert message={error} />}
        {loading && <PencilLoader label={t('loadingUsers')} size={initialLoading ? undefined : 'sm'} />}

        {!loading && data && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-start text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-4 font-medium">{t('userCol')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('role')}</th>
                    <th className="hidden pb-2 pr-4 font-medium sm:table-cell">{t('phone')}</th>
                    <th className="hidden pb-2 pr-4 font-medium md:table-cell">{t('joined')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('status')}</th>
                    <th className="pb-2 font-medium text-start">{t('actions')}</th>
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
                          {t(roleKey(u.role))}
                        </Badge>
                      </td>
                      <td className="hidden py-3 pr-4 text-slate-500 sm:table-cell">{u.phone ?? '—'}</td>
                      <td className="hidden py-3 pr-4 text-slate-500 md:table-cell">{formatDate(u.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={u.status === 'ACTIVE' ? 'green' : 'red'}>{t(userStatusKey(u.status))}</Badge>
                      </td>
                      <td className="py-3 text-start">
                        {u.role !== 'ADMIN' && u.role !== 'CENTER_ADMIN' ? (
                          <Button
                            size="sm"
                            variant={u.status === 'ACTIVE' ? 'outline' : 'secondary'}
                            loading={busyId === u.id}
                            onClick={() => toggleStatus(u)}
                          >
                            {u.status === 'ACTIVE' ? t('suspend') : t('activate')}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-300">{t('protectedLabel')}</span>
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

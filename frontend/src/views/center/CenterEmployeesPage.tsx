'use client';

import { useState } from 'react';
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Shield,
  Activity,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { EmptyState } from '../../components/ui/EmptyState';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useT, type DictKey } from '../../i18n';

interface Employee {
  id: string;
  fullName: string;
  username: string;
  phone: string | null;
  email: string | null;
  role: string;
  status: string;
  photo: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingInvitations: number;
  activeRoles: number;
  changesToday: number;
}

export default function CenterEmployeesPage() {
  const { t } = useT();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [, setBusyId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showActions, setShowActions] = useState<string | null>(null);

  const { data: employees, meta, loading, initialLoading, error, reload } = useApi(
    () => api.get<Employee[]>('/center/staff', {
      page,
      limit: 20,
      ...(role && { role }),
      ...(status && { status }),
      ...(search && { search }),
    }),
    [page, role, status, search]
  );

  const { data: stats } = useApi<EmployeeStats>(
    () => api.get<EmployeeStats>('/center/staff/stats'),
    []
  );

  const toggleStatus = async (employee: Employee) => {
    setBusyId(employee.id);
    try {
      const next = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.patch(`/center/staff/${employee.id}/status`, { status: next });
      toast.success(next === 'ACTIVE' ? t('employeeActivated') : t('employeeDeactivated'));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'CENTER_EMPLOYEE': return t('centerEmployee');
      case 'RECEPTIONIST': return t('receptionist');
      case 'TEACHER_ASSISTANT': return t('teacherAssistant');
      default: return role;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      CENTER_EMPLOYEE: 'violet',
      RECEPTIONIST: 'teal',
      TEACHER_ASSISTANT: 'amber',
    };
    return <Badge tone={colors[role] as any || 'slate'}>{getRoleLabel(role)}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'green',
      INACTIVE: 'slate',
      PENDING: 'amber',
      SUSPENDED: 'red',
    };
    return <Badge tone={colors[status] as any || 'slate'}>{t(status.toLowerCase() as DictKey)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('employeesManagement')}
        subtitle={t('employeesManagementSub')}
        action={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            {t('addEmployee')}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalEmployees || 0}</p>
              <p className="text-xs text-slate-500">{t('employees')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.activeEmployees || 0}</p>
              <p className="text-xs text-slate-500">{t('activeOnJob')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.pendingInvitations || 0}</p>
              <p className="text-xs text-slate-500">{t('pendingInvitations')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.activeRoles || 0}</p>
              <p className="text-xs text-slate-500">{t('activeRoles')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.changesToday || 0}</p>
              <p className="text-xs text-slate-500">{t('changesToday')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t('searchEmployee')}
              className="ps-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setSearch(searchInput); } }}
            />
          </div>
          <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="sm:w-40"
            options={[
              { value: '', label: t('allStatus') },
              { value: 'ACTIVE', label: t('active') },
              { value: 'INACTIVE', label: t('inactive') },
              { value: 'PENDING', label: t('pending') },
            ]}
          />
          <Select value={role} onChange={(e) => { setPage(1); setRole(e.target.value); }} className="sm:w-44"
            options={[
              { value: '', label: t('allRoles') },
              { value: 'CENTER_EMPLOYEE', label: t('centerEmployee') },
              { value: 'RECEPTIONIST', label: t('receptionist') },
              { value: 'TEACHER_ASSISTANT', label: t('teacherAssistant') },
            ]}
          />
          {(status || role || search) && (
            <Button variant="ghost" onClick={() => { setStatus(''); setRole(''); setSearch(''); setSearchInput(''); }}>
              <X className="h-4 w-4" />
              {t('clearFilters')}
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card bodyClassName="p-0">
        {error && <div className="p-4"><Alert message={error} /></div>}
        {loading && <PencilLoader label={t('loading')} size={initialLoading ? undefined : 'sm'} />}

        {!loading && employees && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-start text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
                    <th className="px-4 py-3 font-medium">{t('employee')}</th>
                    <th className="px-4 py-3 font-medium">{t('jobTitle')}</th>
                    <th className="px-4 py-3 font-medium">{t('phone')}</th>
                    <th className="px-4 py-3 font-medium">{t('status')}</th>
                    <th className="px-4 py-3 font-medium text-end">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={emp.fullName} src={emp.photo} size="sm" />
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{emp.fullName}</p>
                            <p className="text-xs text-slate-400">@{emp.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getRoleBadge(emp.role)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{emp.phone || '—'}</td>
                      <td className="px-4 py-3">{getStatusBadge(emp.status)}</td>
                      <td className="px-4 py-3 text-end">
                        <div className="relative inline-block">
                          <Button variant="ghost" size="sm" onClick={() => setShowActions(showActions === emp.id ? null : emp.id)}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          {showActions === emp.id && (
                            <div className="absolute end-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevated-lg dark:border-slate-700 dark:bg-slate-800">
                              <div className="py-1">
                                <button onClick={() => { setSelectedEmployee(emp); setShowEditModal(true); setShowActions(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">
                                  <Edit className="h-4 w-4" />{t('edit')}
                                </button>
                                <button onClick={() => { setSelectedEmployee(emp); setShowActions(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">
                                  <Shield className="h-4 w-4" />{t('managePermissions')}
                                </button>
                                <button onClick={() => { setSelectedEmployee(emp); setShowActions(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">
                                  <Activity className="h-4 w-4" />{t('viewActivity')}
                                </button>
                                <hr className="my-1 border-slate-100 dark:border-slate-700" />
                                {emp.status === 'ACTIVE' ? (
                                  <button onClick={() => { toggleStatus(emp); setShowActions(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                                    <UserX className="h-4 w-4" />{t('deactivate')}
                                  </button>
                                ) : (
                                  <button onClick={() => { toggleStatus(emp); setShowActions(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10">
                                    <UserCheck className="h-4 w-4" />{t('activate')}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
              <Pagination page={page} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
            </div>
          </>
        )}

        {!loading && employees?.length === 0 && (
          <EmptyState icon={UserCheck} title={t('noEmployees')} description={t('noEmployeesDesc')}
            action={<Button onClick={() => setShowAddModal(true)}><Plus className="h-4 w-4" />{t('addEmployee')}</Button>}
          />
        )}
      </Card>

      {/* Add Modal */}
      <AddEmployeeModal open={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); reload(); }} />

      {/* Edit Modal */}
      {selectedEmployee && (
        <EditEmployeeModal employee={selectedEmployee} open={showEditModal} onClose={() => { setShowEditModal(false); setSelectedEmployee(null); }} onSuccess={() => { setShowEditModal(false); setSelectedEmployee(null); reload(); }} />
      )}
    </div>
  );
}

function AddEmployeeModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', username: '', phone: '', email: '', password: '', role: 'CENTER_EMPLOYEE' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/center/staff', form);
      toast.success(t('employeeCreated'));
      setForm({ fullName: '', username: '', phone: '', email: '', password: '', role: 'CENTER_EMPLOYEE' });
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('addEmployee')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSubmit} loading={saving}>{t('save')}</Button></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('fullName')} required value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} />
        <Input label={t('username')} required value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} />
        <Input label={t('phone')} required value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
        <Input label={t('email')} type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
        <Input label={t('password')} type="password" required value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
        <Select label={t('role')} required value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
          options={[
            { value: 'CENTER_EMPLOYEE', label: t('centerEmployee') },
            { value: 'RECEPTIONIST', label: t('receptionist') },
            { value: 'TEACHER_ASSISTANT', label: t('teacherAssistant') },
          ]}
        />
      </form>
    </Modal>
  );
}

function EditEmployeeModal({ employee, open, onClose, onSuccess }: { employee: Employee; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: employee.fullName,
    phone: employee.phone || '',
    email: employee.email || '',
    role: employee.role,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/center/staff/${employee.id}`, form);
      toast.success(t('employeeUpdated'));
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('editEmployee')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSubmit} loading={saving}>{t('save')}</Button></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('fullName')} required value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} />
        <Input label={t('phone')} value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
        <Input label={t('email')} type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
        <Select label={t('role')} required value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
          options={[
            { value: 'CENTER_EMPLOYEE', label: t('centerEmployee') },
            { value: 'RECEPTIONIST', label: t('receptionist') },
            { value: 'TEACHER_ASSISTANT', label: t('teacherAssistant') },
          ]}
        />
      </form>
    </Modal>
  );
}

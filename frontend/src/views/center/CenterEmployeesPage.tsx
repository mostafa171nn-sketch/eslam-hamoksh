'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  UserCheck,
  X,
} from 'lucide-react';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useT, type DictKey } from '../../i18n';
import { CenterPageHeader } from './ui/CenterPageHeader';
import { CenterStatCard } from './ui/CenterStatCard';
import { CenterPill } from './ui/CenterPill';
import { CenterSearchInput } from './ui/CenterSearchInput';
import { CenterModal } from './ui/CenterModal';

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

const STATUS_MAP: Record<string, { label: string; tone: 'green' | 'amber' | 'red' | 'slate' }> = {
  ACTIVE: { label: 'active', tone: 'green' },
  INACTIVE: { label: 'inactive', tone: 'slate' },
  PENDING: { label: 'pending', tone: 'amber' },
  SUSPENDED: { label: 'deactivated', tone: 'red' },
};

const ROLE_MAP: Record<string, { label: string; tone: 'blue' | 'green' | 'amber' | 'slate' }> = {
  CENTER_EMPLOYEE: { label: 'centerEmployee', tone: 'blue' },
  RECEPTIONIST: { label: 'receptionist', tone: 'green' },
  TEACHER_ASSISTANT: { label: 'teacherAssistant', tone: 'amber' },
};

export default function CenterEmployeesPage() {
  const { t } = useT();

  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const { data: employees, meta, loading, error, reload } = useApi(
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

  const getRoleLabel = (r: string) => ROLE_MAP[r]?.label ?? r;

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const activeCount = stats?.activeEmployees || 0;
  const totalCount = stats?.totalEmployees || 0;

  return (
    <div className="space-y-5">
      <CenterPageHeader
        eyebrow="بوابة إدارة السنتر"
        title={t('employeesManagement')}
        description={t('employeesManagementSub')}
      >
        <button onClick={() => setShowAddModal(true)} className="mj-btn mj-btn--primary">
          <Plus className="h-4 w-4" />
          {t('addEmployee')}
        </button>
      </CenterPageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <CenterStatCard value={totalCount} label={t('employees')} />
        <CenterStatCard value={activeCount} label={t('activeOnJob')} />
        <CenterStatCard value={stats?.pendingInvitations || 0} label={t('pendingInvitations')} />
        <CenterStatCard value={stats?.activeRoles || 0} label={t('activeRoles')} />
      </div>

      <nav className="mj-tabs">
        <button
          className={`mj-tab ${!status ? 'mj-tab--active' : ''}`}
          onClick={() => { setStatus(''); setPage(1); }}
        >
          {t('employees')}
          <span className="mj-tab-count">{totalCount}</span>
        </button>
        <button
          className={`mj-tab ${status === 'ACTIVE' ? 'mj-tab--active' : ''}`}
          onClick={() => { setStatus('ACTIVE'); setPage(1); }}
        >
          {t('activeOnJob')}
          <span className="mj-tab-count">{activeCount}</span>
        </button>
        {stats?.pendingInvitations ? (
          <button
            className={`mj-tab ${status === 'PENDING' ? 'mj-tab--active' : ''}`}
            onClick={() => { setStatus('PENDING'); setPage(1); }}
          >
            {t('pendingInvitations')}
            <span className="mj-tab-count">{stats.pendingInvitations}</span>
          </button>
        ) : null}
      </nav>

      <div className="mj-toolbar" style={{ gap: '0.625rem' }}>
        <div className="min-w-0 flex-1" onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setSearch(searchInput); } }}>
          <CenterSearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder={t('searchEmployee')}
            aria-label={t('searchEmployee')}
          />
        </div>
        <select
          className="mj-select"
          style={{ width: 'auto', minWidth: '9rem' }}
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
        >
          <option value="">{t('allStatus')}</option>
          <option value="ACTIVE">{t('active')}</option>
          <option value="INACTIVE">{t('inactive')}</option>
          <option value="PENDING">{t('pending')}</option>
        </select>
        <select
          className="mj-select"
          style={{ width: 'auto', minWidth: '10rem' }}
          value={role}
          onChange={(e) => { setPage(1); setRole(e.target.value); }}
        >
          <option value="">{t('allRoles')}</option>
          <option value="CENTER_EMPLOYEE">{t('centerEmployee')}</option>
          <option value="RECEPTIONIST">{t('receptionist')}</option>
          <option value="TEACHER_ASSISTANT">{t('teacherAssistant')}</option>
        </select>
        {(status || role || search) && (
          <button
            className="mj-btn mj-btn--ghost mj-btn--sm"
            onClick={() => { setStatus(''); setRole(''); setSearch(''); setSearchInput(''); }}
          >
            <X className="h-4 w-4" />
            {t('clearFilters')}
          </button>
        )}
      </div>

      <div className="mj-card">
        {error && (
          <div className="px-4 py-3 text-sm" style={{ color: 'var(--mj-danger)' }}>
            {error}
          </div>
        )}

        {loading && (
          <div className="mj-empty">
            <p>{t('loading')}</p>
          </div>
        )}

        {!loading && employees && employees.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="mj-table">
              <thead>
                <tr>
                  <th>{t('employee')}</th>
                  <th>{t('jobTitle')}</th>
                  <th>{t('phone')}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const statusInfo = STATUS_MAP[emp.status] ?? STATUS_MAP.ACTIVE;
                  const roleInfo = ROLE_MAP[emp.role];
                  return (
                    <tr key={emp.id} className="is-clickable">
                      <td>
                        <Link
                          href={`/center/employees/${emp.id}`}
                          className="flex items-center gap-3 no-underline"
                          style={{ color: 'inherit' }}
                        >
                          {emp.photo ? (
                            <img
                              src={emp.photo}
                              alt=""
                              className="mj-avatar mj-avatar--md"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <span className="mj-avatar mj-avatar--md">
                              {getInitial(emp.fullName)}
                            </span>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--mj-ink-strong)' }}>
                              {emp.fullName}
                            </div>
                            <div className="mj-muted-2" style={{ fontSize: '0.8125rem' }}>
                              @{emp.username}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <CenterPill tone={roleInfo?.tone ?? 'slate'}>
                          {t(getRoleLabel(emp.role) as DictKey)}
                        </CenterPill>
                      </td>
                      <td className="mj-muted">{emp.phone || '—'}</td>
                      <td>
                        <CenterPill tone={statusInfo.tone} dot>
                          {t(statusInfo.label as DictKey)}
                        </CenterPill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && employees && employees.length === 0 && (
          <div className="mj-empty">
            <UserCheck className="mj-empty-icon" />
            <p style={{ fontWeight: 700, color: 'var(--mj-ink-strong)' }}>{t('noEmployees')}</p>
            <p className="mj-muted-2">{t('noEmployeesDesc')}</p>
            <button
              className="mj-btn mj-btn--primary mj-btn--sm"
              style={{ marginTop: '0.5rem' }}
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4" />
              {t('addEmployee')}
            </button>
          </div>
        )}

        {!loading && meta && meta.totalPages > 1 && (
          <div style={{ borderTop: '1px solid var(--mj-border-soft)', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`mj-btn mj-btn--sm ${p === page ? 'mj-btn--primary' : 'mj-btn--ghost'}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      <AddEmployeeModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { setShowAddModal(false); reload(); }}
      />

      {selectedEmployee && (
        <EditEmployeeModal
          employee={selectedEmployee}
          open={showEditModal}
          onClose={() => { setShowEditModal(false); setSelectedEmployee(null); }}
          onSuccess={() => { setShowEditModal(false); setSelectedEmployee(null); reload(); }}
        />
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
    <CenterModal
      open={open}
      onClose={onClose}
      title={t('addEmployee')}
      footer={
        <>
          <button className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button className="mj-btn mj-btn--primary" onClick={handleSubmit} disabled={saving}>{t('save')}</button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="mj-field">
          <label className="mj-label">{t('fullName')}</label>
          <input className="mj-input" required value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('username')}</label>
          <input className="mj-input" required value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('phone')}</label>
          <input className="mj-input" required value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('email')}</label>
          <input className="mj-input" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('password')}</label>
          <input className="mj-input" type="password" required value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('role')}</label>
          <select className="mj-select" required value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="CENTER_EMPLOYEE">{t('centerEmployee')}</option>
            <option value="RECEPTIONIST">{t('receptionist')}</option>
            <option value="TEACHER_ASSISTANT">{t('teacherAssistant')}</option>
          </select>
        </div>
      </form>
    </CenterModal>
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
    <CenterModal
      open={open}
      onClose={onClose}
      title={t('editEmployee')}
      footer={
        <>
          <button className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button className="mj-btn mj-btn--primary" onClick={handleSubmit} disabled={saving}>{t('save')}</button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="mj-field">
          <label className="mj-label">{t('fullName')}</label>
          <input className="mj-input" required value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('phone')}</label>
          <input className="mj-input" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('email')}</label>
          <input className="mj-input" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('role')}</label>
          <select className="mj-select" required value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="CENTER_EMPLOYEE">{t('centerEmployee')}</option>
            <option value="RECEPTIONIST">{t('receptionist')}</option>
            <option value="TEACHER_ASSISTANT">{t('teacherAssistant')}</option>
          </select>
        </div>
      </form>
    </CenterModal>
  );
}

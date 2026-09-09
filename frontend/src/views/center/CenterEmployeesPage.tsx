'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  UserCheck,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useT, type DictKey } from '../../i18n';
import { timeAgo } from '../../lib/format';
import { CenterPageHeader } from './ui/CenterPageHeader';
import { CenterStatCard } from './ui/CenterStatCard';
import { CenterPill, type CenterPillTone } from './ui/CenterPill';
import { CenterSearchInput } from './ui/CenterSearchInput';
import { CenterModal } from './ui/CenterModal';
import {
  accessLevelForOps,
  accessLevelLabel,
  accessLevelTone,
  activityLabelKey,
  moduleLabelKey,
  ROLE_LABEL_KEYS,
} from './employees/permissions';

interface EmployeeActivity {
  action: string;
  createdAt: string;
}

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
  lastActivity: EmployeeActivity | null;
  openTaskCount: number;
  centerName: string | null;
}

interface EmployeeStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingInvitations: number;
  activeRoles: number;
  openTasks: number;
  suspendedCount: number;
  changesToday: number;
}

interface MatrixModule {
  domain: string;
  ops: string[];
}

interface MatrixRole {
  role: string;
  modules: MatrixModule[];
}

const STATUS_MAP: Record<string, { labelKey: DictKey; tone: CenterPillTone }> = {
  ACTIVE: { labelKey: 'active', tone: 'green' },
  INACTIVE: { labelKey: 'inactive', tone: 'slate' },
  PENDING: { labelKey: 'pending', tone: 'amber' },
  SUSPENDED: { labelKey: 'accessBlockedStatus', tone: 'red' },
};

const ROLE_TONE: Record<string, CenterPillTone> = {
  CENTER_ADMIN: 'blue',
  CENTER_EMPLOYEE: 'blue',
  RECEPTIONIST: 'green',
  TEACHER_ASSISTANT: 'amber',
};

export default function CenterEmployeesPage() {
  const { t, lang } = useT();

  const [tab, setTab] = useState<'list' | 'matrix'>('list');
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

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

  const { data: matrix } = useApi<{ roles: MatrixRole[] }>(
    () => api.get<{ roles: MatrixRole[] }>('/center/staff/permission-matrix'),
    []
  );

  const getRoleLabel = (r: string) => ROLE_LABEL_KEYS[r] ?? (r as DictKey);
  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const totalCount = stats?.totalEmployees || 0;
  const openTasks = stats?.openTasks || 0;
  const suspendedCount = stats?.suspendedCount || 0;
  const activeRoles = stats?.activeRoles || 0;

  const matrixRoles = matrix?.roles ?? [];
  const allModules = Array.from(
    new Set(matrixRoles.flatMap((r) => r.modules.map((m) => m.domain))),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-5">
      <CenterPageHeader
        eyebrow={t('employeesEyebrow')}
        title={t('employeesTitle')}
        description={t('employeesManagementSub')}
      >
        <button onClick={() => setShowAddModal(true)} className="mj-btn mj-btn--primary">
          <Plus className="h-4 w-4" />
          {t('createEmployeeAccount')}
        </button>
      </CenterPageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <CenterStatCard value={totalCount} label={t('employeeAccounts')} />
        <CenterStatCard value={activeRoles} label={t('jobTitles')} />
        <CenterStatCard value={openTasks} label={t('openTasks')} />
        <CenterStatCard value={suspendedCount} label={t('accessStopped')} />
      </div>

      <nav className="mj-tabs">
        <button
          type="button"
          className={`mj-tab ${tab === 'list' ? 'mj-tab--active' : ''}`}
          onClick={() => { setTab('list'); setPage(1); }}
        >
          {t('allEmployeesTab')}
          <span className="mj-tab-count">{totalCount}</span>
        </button>
        <button
          type="button"
          className={`mj-tab ${tab === 'matrix' ? 'mj-tab--active' : ''}`}
          onClick={() => setTab('matrix')}
        >
          {t('rolesAndPermissionsTab')}
        </button>
      </nav>

      {tab === 'list' ? (
        <>
          <div className="mj-toolbar" style={{ gap: '0.625rem' }}>
            <div className="min-w-0 flex-1" onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setSearch(searchInput); } }}>
              <CenterSearchInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder={t('searchEmployeeAny')}
                aria-label={t('searchEmployeeAny')}
              />
            </div>
            <select
              className="mj-select"
              style={{ width: 'auto', minWidth: '9rem' }}
              value={status}
              onChange={(e) => { setPage(1); setStatus(e.target.value); }}
              aria-label={t('employeeStatusFilter')}
            >
              <option value="">{t('employeeAllStatuses')}</option>
              <option value="ACTIVE">{t('active')}</option>
              <option value="PENDING">{t('pending')}</option>
              <option value="SUSPENDED">{t('accessBlockedStatus')}</option>
              <option value="INACTIVE">{t('inactive')}</option>
            </select>
            <select
              className="mj-select"
              style={{ width: 'auto', minWidth: '10rem' }}
              value={role}
              onChange={(e) => { setPage(1); setRole(e.target.value); }}
              aria-label={t('jobTitle')}
            >
              <option value="">{t('allRoles')}</option>
              <option value="CENTER_EMPLOYEE">{t('centerEmployee')}</option>
              <option value="RECEPTIONIST">{t('receptionist')}</option>
              <option value="TEACHER_ASSISTANT">{t('teacherAssistant')}</option>
            </select>
            {(status || role || search) && (
              <button
                type="button"
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
                      <th>{t('jobTitleAndBranch')}</th>
                      <th>{t('lastActivityColumn')}</th>
                      <th>{t('tasksColumn')}</th>
                      <th>{t('accountColumn')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const statusInfo = STATUS_MAP[emp.status] ?? STATUS_MAP.ACTIVE;
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
                                  {emp.email || `@${emp.username}`}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td>
                            <CenterPill tone={ROLE_TONE[emp.role] ?? 'slate'}>
                              {t(getRoleLabel(emp.role))}
                            </CenterPill>
                            {emp.centerName && (
                              <div className="mj-muted mt-1" style={{ fontSize: '0.8125rem' }}>
                                {emp.centerName}
                              </div>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {emp.lastActivity ? (
                              <>
                                <div className="mj-muted-2" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                  {t(activityLabelKey(emp.lastActivity.action))}
                                </div>
                                <div className="mj-muted" style={{ fontSize: '0.8125rem' }}>
                                  {timeAgo(emp.lastActivity.createdAt, lang)}
                                </div>
                              </>
                            ) : (
                              <span className="mj-muted-2">—</span>
                            )}
                          </td>
                          <td>
                            {emp.openTaskCount > 0 ? (
                              <span style={{ fontWeight: 700, color: 'var(--mj-ink-strong)' }}>
                                {emp.openTaskCount}
                              </span>
                            ) : (
                              <span className="mj-muted-2">—</span>
                            )}
                          </td>
                          <td>
                            <CenterPill tone={statusInfo.tone} dot>
                              {t(statusInfo.labelKey)}
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
                  type="button"
                  className="mj-btn mj-btn--primary mj-btn--sm"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="h-4 w-4" />
                  {t('createEmployeeAccount')}
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
        </>
      ) : (
        <div className="mj-card overflow-hidden">
          <div className="border-b border-[color:var(--mj-border-soft)] px-5 py-4">
            <h3 className="font-bold text-[color:var(--mj-ink-strong)]">{t('permissionMatrixTitle')}</h3>
            <p className="mt-0.5 text-sm text-[color:var(--mj-muted)]">{t('permissionMatrixSub')}</p>
          </div>
          {matrixRoles.length === 0 ? (
            <div className="mj-empty">
              <ShieldCheck className="mj-empty-icon" />
              <p className="text-sm">{t('matrixLackPermission')}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="mj-table">
                <thead>
                  <tr>
                    <th>{t('jobTitles')}</th>
                    {matrixRoles.map((r) => (
                      <th key={r.role} style={{ whiteSpace: 'nowrap' }}>
                        {t(getRoleLabel(r.role))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allModules.map((domain) => (
                    <tr key={domain}>
                      <td style={{ fontWeight: 600, color: 'var(--mj-ink-strong)' }}>
                        {t(moduleLabelKey(domain))}
                      </td>
                      {matrixRoles.map((r) => {
                        const level = accessLevelForOps(
                          r.modules.find((m) => m.domain === domain)?.ops,
                        );
                        return (
                          <td key={r.role}>
                            {level === 'none' ? (
                              <span className="mj-muted-2">—</span>
                            ) : (
                              <CenterPill tone={accessLevelTone(level)}>
                                {t(accessLevelLabel(level))}
                              </CenterPill>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <AddEmployeeModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { setShowAddModal(false); reload(); }}
      />
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
      title={t('newEmployeeAccount')}
      description={t('addEmployeeSub')}
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? t('creating') : t('create')}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="mj-field">
          <label className="mj-label">{t('employeeName')}</label>
          <input className="mj-input" required value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('loginUsername')}</label>
          <input className="mj-input" required value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="mj-field">
            <label className="mj-label">{t('email')}</label>
            <input className="mj-input" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('phone')}</label>
            <input className="mj-input" required value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="mj-field">
            <label className="mj-label">{t('jobTitle')}</label>
            <select className="mj-select" required value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="CENTER_EMPLOYEE">{t('centerEmployee')}</option>
              <option value="RECEPTIONIST">{t('receptionist')}</option>
              <option value="TEACHER_ASSISTANT">{t('teacherAssistant')}</option>
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('password')}</label>
            <input className="mj-input" type="password" required value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
        </div>
      </form>
    </CenterModal>
  );
}
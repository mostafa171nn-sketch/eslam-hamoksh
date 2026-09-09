'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ShieldCheck,
  Plus,
  CheckCircle2,
  RefreshCcw,
  Power,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { PageBackButton } from '../../../components/layout/PageBackButton';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey } from '../../../i18n';
import { formatDate, isOverdue, timeAgo } from '../../../lib/format';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill, type CenterPillTone } from '../ui/CenterPill';
import { CenterModal } from '../ui/CenterModal';
import {
  accessLevelForOps,
  accessLevelLabel,
  accessLevelTone,
  activityLabelKey,
  groupPermissions,
  moduleLabelKey,
  ROLE_LABEL_KEYS,
} from './permissions';

interface EmployeeActivity {
  action: string;
  createdAt: string;
}

interface EmployeeDetail {
  id: string;
  fullName: string;
  username: string;
  phone: string | null;
  email: string | null;
  role: string;
  status: string;
  photo: string | null;
  createdAt: string;
  permissions: string[];
  openTaskCount: number;
  lastActivity: EmployeeActivity | null;
  centerName: string | null;
}

interface EmployeeTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueAt: string | null;
  createdAt: string;
}

type Tab = 'overview' | 'tasks' | 'permissions' | 'security';

const STATUS_TONE: Record<string, CenterPillTone> = {
  ACTIVE: 'green',
  PENDING: 'amber',
  SUSPENDED: 'red',
  INACTIVE: 'slate',
};

const TASK_TONE: Record<string, CenterPillTone> = {
  OPEN: 'amber',
  IN_PROGRESS: 'blue',
  DONE: 'green',
};

const TASK_LABEL: Record<string, DictKey> = {
  OPEN: 'taskStatusOpen',
  IN_PROGRESS: 'taskStatusInProgress',
  DONE: 'taskStatusDone',
};

export default function CenterEmployeeDetailPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string }>();
  const toast = useToast();

  const { data: employee, loading, error, reload } = useApi<EmployeeDetail>(
    () => api.get<EmployeeDetail>(`/center/employees/${params.id}`),
    [params.id]
  );
  const { data: tasks, loading: tasksLoading, reload: reloadTasks } = useApi<EmployeeTask[]>(
    () => api.get<EmployeeTask[]>('/center/account/tasks', { assigneeId: params.id }),
    [params.id]
  );

  const [tab, setTab] = useState<Tab>('overview');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [closingTask, setClosingTask] = useState<string | null>(null);

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>;
  if (!employee) return null;

  const roleKey = ROLE_LABEL_KEYS[employee.role] ?? (employee.role as DictKey);
  const roleLabel = t(roleKey);
  const statusInfo = STATUS_TONE[employee.status] ?? 'slate';

  const modules = groupPermissions(employee.permissions ?? []);
  const openedTasks = tasks ?? [];
  const hasTasks = !tasksLoading && openedTasks.length > 0;

  const closeTask = async (taskId: string) => {
    setClosingTask(taskId);
    try {
      await api.put(`/center/account/tasks/${taskId}`, { status: 'DONE' });
      toast.success(t('taskClosedToast'));
      reloadTasks();
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setClosingTask(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageBackButton label={t('backToEmployees')} fallback="/center/employees" />

      <CenterPageHeader
        eyebrow={t('employeeAccountEyebrow')}
        title={employee.fullName}
        description={[roleLabel, employee.centerName].filter(Boolean).join(' · ')}
      >
        <CenterPill tone={statusInfo}>
          {employee.status === 'ACTIVE' ? t('active') : t(employee.status.toLowerCase() as DictKey)}
        </CenterPill>
      </CenterPageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CenterStatCard value={employee.permissions?.length ?? 0} label={t('availablePages')} />
        <CenterStatCard value={employee.openTaskCount ?? 0} label={t('openTasks')} />
        <CenterStatCard value={roleLabel} label={t('jobTitle')} />
        <CenterStatCard
          value={formatDate(employee.createdAt, lang)}
          label={t('joinedAt')}
        />
      </div>

      <div className="mj-detail-grid">
        <div className="mj-detail-main">
          <div className="mj-tabs">
            <button type="button" className={`mj-tab ${tab === 'overview' ? 'mj-tab--active' : ''}`} onClick={() => setTab('overview')}>
              {t('overviewTab')}
            </button>
            <button type="button" className={`mj-tab ${tab === 'tasks' ? 'mj-tab--active' : ''}`} onClick={() => setTab('tasks')}>
              {t('tasksTab')}
              <span className="mj-tab-count">{openedTasks.length}</span>
            </button>
            <button type="button" className={`mj-tab ${tab === 'permissions' ? 'mj-tab--active' : ''}`} onClick={() => setTab('permissions')}>
              {t('permissionsTab')}
            </button>
            <button type="button" className={`mj-tab ${tab === 'security' ? 'mj-tab--active' : ''}`} onClick={() => setTab('security')}>
              {t('securityTab')}
            </button>
          </div>

          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="mj-card overflow-hidden">
                <div className="border-b border-[color:var(--mj-border-soft)] px-5 py-4">
                  <h3 className="font-bold text-[color:var(--mj-ink-strong)]">{t('accessScopeTitle')}</h3>
                  <p className="mt-0.5 text-sm text-[color:var(--mj-muted)]">
                    {t('accessScopeSub')} · {t('restoreRoleLabel')}: {roleLabel}
                  </p>
                </div>
                {modules.length === 0 ? (
                  <div className="mj-empty">
                    <AlertCircle className="mj-empty-icon" />
                    <p className="text-sm">{t('matrixLackPermission')}</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="mj-table">
                      <thead>
                        <tr>
                          <th>{t('jobTitles')}</th>
                          <th>{t('permissions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modules.map((m) => {
                          const level = accessLevelForOps(m.ops);
                          return (
                            <tr key={m.domain}>
                              <td style={{ fontWeight: 600, color: 'var(--mj-ink-strong)' }}>
                                {t(moduleLabelKey(m.domain))}
                              </td>
                              <td>
                                {level === 'none' ? (
                                  <span className="mj-muted-2">—</span>
                                ) : (
                                  <CenterPill tone={accessLevelTone(level)}>
                                    {t(accessLevelLabel(level))}
                                  </CenterPill>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {employee.lastActivity && (
                <div className="mj-card mj-card--padding">
                  <p className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{t('lastActivityColumn')}</p>
                  <p className="mt-1 text-sm text-[color:var(--mj-muted)]">
                    {t(activityLabelKey(employee.lastActivity.action))} · {timeAgo(employee.lastActivity.createdAt, lang)}
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'tasks' && (
            <div className="mj-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--mj-border-soft)] px-5 py-4">
                <div>
                  <h3 className="font-bold text-[color:var(--mj-ink-strong)]">{t('assignedTasksTitle')}</h3>
                  <p className="mt-0.5 text-sm text-[color:var(--mj-muted)]">{employee.fullName}</p>
                </div>
                <button type="button" className="mj-btn mj-btn--primary mj-btn--sm" onClick={() => setShowTaskModal(true)}>
                  <Plus className="h-4 w-4" />
                  {t('assignTask')}
                </button>
              </div>
              {hasTasks ? (
                <div className="divide-y divide-[color:var(--mj-border-soft)]">
                  {openedTasks.map((task) => (
                    <div key={task.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[color:var(--mj-ink-strong)]">{task.title}</p>
                          {task.dueAt && !task.status.startsWith('DONE') && isOverdue(task.dueAt) && (
                            <CenterPill tone="red" dot>{t('overdueLabel')}</CenterPill>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[color:var(--mj-muted)]">
                          {task.dueAt
                            ? `${t('taskDueDate')}: ${formatDate(task.dueAt, lang)}`
                            : timeAgo(task.createdAt, lang)}
                        </p>
                      </div>
                      <CenterPill tone={TASK_TONE[task.status] ?? 'slate'}>
                        {t(TASK_LABEL[task.status] ?? 'taskStatusOpen')}
                      </CenterPill>
                      {task.status !== 'DONE' && (
                        <button
                          type="button"
                          className="mj-btn mj-btn--ghost mj-btn--sm"
                          disabled={closingTask === task.id}
                          onClick={() => closeTask(task.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {t('closeTask')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mj-empty">
                  <AlertCircle className="mj-empty-icon" />
                  <p style={{ fontWeight: 700, color: 'var(--mj-ink-strong)' }}>{t('noTasks')}</p>
                  <p className="mj-muted-2">{t('noTasksDesc')}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'permissions' && (
            <div className="mj-card overflow-hidden">
              <div className="border-b border-[color:var(--mj-border-soft)] px-5 py-4">
                <h3 className="font-bold text-[color:var(--mj-ink-strong)]">
                  {t('individualPermissionsTitle', { name: employee.fullName })}
                </h3>
                <p className="mt-0.5 text-sm text-[color:var(--mj-muted)]">
                  {t('individualPermissionsSub', { role: roleLabel })}
                </p>
              </div>
              {modules.length === 0 ? (
                <div className="mj-empty">
                  <AlertCircle className="mj-empty-icon" />
                  <p className="text-sm">{t('matrixLackPermission')}</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="mj-table">
                    <thead>
                      <tr>
                        <th>{t('jobTitles')}</th>
                        <th>{t('permissions')}</th>
                        <th>{t('restoreRoleLabel')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((m) => {
                        const level = accessLevelForOps(m.ops);
                        return (
                          <tr key={m.domain}>
                            <td style={{ fontWeight: 600, color: 'var(--mj-ink-strong)' }}>
                              {t(moduleLabelKey(m.domain))}
                            </td>
                            <td>
                              {level === 'none' ? (
                                <span className="mj-muted-2">—</span>
                              ) : (
                                <CenterPill tone={accessLevelTone(level)}>
                                  {t(accessLevelLabel(level))}
                                </CenterPill>
                              )}
                            </td>
                            <td className="text-xs" style={{ color: 'var(--mj-muted)' }}>
                              {level === 'none' ? '—' : t(accessLevelLabel(level))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-4">
              <ResetPasswordCard employee={employee} onDone={reload} />
              <StatusToggleCard employee={employee} onDone={() => { reload(); }} />
            </div>
          )}
        </div>

        <div className="mj-detail-side">
          <div className="mj-side-card">
            <h2 className="mb-3 text-sm font-bold text-[color:var(--mj-ink-strong)]">{t('accountDataTitle')}</h2>
            <p className="mb-3 text-xs leading-relaxed text-[color:var(--mj-muted)]">{t('accountDataSub')}</p>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('employee')}</span>
              <span className="mj-side-row-value">{employee.fullName}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('accountLogin')}</span>
              <span className="mj-side-row-value" dir="ltr">@{employee.username}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('email')}</span>
              <span className="mj-side-row-value" dir="ltr">{employee.email || '—'}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('phone')}</span>
              <span className="mj-side-row-value" dir="ltr">{employee.phone || '—'}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('jobTitle')}</span>
              <span className="mj-side-row-value">{roleLabel}</span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('employeeAccountStatus')}</span>
              <span>
                <CenterPill tone={statusInfo}>
                  {employee.status === 'ACTIVE' ? t('active') : t((employee.status.toLowerCase()) as DictKey)}
                </CenterPill>
              </span>
            </div>
            <div className="mj-side-row">
              <span className="mj-side-row-label">{t('joinedAt')}</span>
              <span className="mj-side-row-value">{formatDate(employee.createdAt, lang)}</span>
            </div>
          </div>

          <div className="mj-side-card">
            <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--mj-ink-strong)]">
              <ShieldCheck className="h-4 w-4" />
              {t('availablePages')}
            </div>
            <p className="mt-1 text-xs text-[color:var(--mj-muted)]">
              {employee.permissions?.length ?? 0} · {roleLabel}
            </p>
          </div>
        </div>
      </div>

      <AssignTaskModal
        employeeId={employee.id}
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSuccess={() => { setShowTaskModal(false); reloadTasks(); reload(); }}
      />
    </div>
  );
}

function ResetPasswordCard({ employee, onDone }: { employee: EmployeeDetail; onDone: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return;
    setSaving(true);
    try {
      await api.put(`/center/employees/${employee.id}`, { password });
      setPassword('');
      toast.success(t('passwordResetToast'));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mj-card mj-card--padding">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-[color:var(--mj-accent)]" />
        <h3 className="font-bold text-[color:var(--mj-ink-strong)]">{t('resetPassword')}</h3>
      </div>
      <p className="mt-1 text-sm text-[color:var(--mj-muted)]">{t('resetPasswordNote')}</p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="mj-field flex-1">
          <label className="mj-label">{t('password')}</label>
          <input className="mj-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="mj-btn mj-btn--primary" disabled={saving || password.length < 6}>
          <RefreshCcw className="h-4 w-4" />
          {saving ? t('creating') : t('resetPassword')}
        </button>
      </form>
    </div>
  );
}

function StatusToggleCard({ employee, onDone }: { employee: EmployeeDetail; onDone: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const isActive = employee.status === 'ACTIVE';

  const toggle = async () => {
    setSaving(true);
    try {
      await api.patch(`/center/employees/${employee.id}/status`, { status: isActive ? 'INACTIVE' : 'ACTIVE' });
      toast.success(isActive ? t('employeeDeactivated') : t('employeeActivated'));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mj-card mj-card--padding">
      <div className="flex items-center gap-2">
        <Power className="h-4 w-4 text-[color:var(--mj-danger)]" />
        <h3 className="font-bold text-[color:var(--mj-ink-strong)]">
          {isActive ? t('deactivateAccount') : t('activateAccount')}
        </h3>
      </div>
      <p className="mt-1 text-sm text-[color:var(--mj-muted)]">
        {isActive ? t('deactivateAccountNote') : t('deactivateAccountNote')}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className={`mj-btn ${isActive ? 'mj-btn--danger' : 'mj-btn--primary'}`} onClick={toggle} disabled={saving}>
          <Power className="h-4 w-4" />
          {isActive ? t('deactivateAccount') : t('activateAccount')}
        </button>
        <CenterPill tone={STATUS_TONE[employee.status] ?? 'slate'} dot>
          {employee.status === 'ACTIVE' ? t('active') : t((employee.status.toLowerCase()) as DictKey)}
        </CenterPill>
      </div>
    </div>
  );
}

function AssignTaskModal({
  employeeId,
  open,
  onClose,
  onSuccess,
}: {
  employeeId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.post('/center/account/tasks', {
        assigneeId: employeeId,
        title: title.trim(),
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      });
      toast.success(t('taskCreatedToast'));
      setTitle('');
      setDueAt('');
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
      title={t('assignTask')}
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={submit} disabled={saving || !title.trim()}>
            {saving ? t('creating') : t('create')}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="mj-field">
          <label className="mj-label">{t('taskTitle')}</label>
          <input className="mj-input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('taskDueDate')}</label>
          <input className="mj-input" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </div>
      </form>
    </CenterModal>
  );
}
'use client';

import { useParams } from 'next/navigation';
import { Phone, Mail, ShieldCheck, CalendarDays } from 'lucide-react';
import { PageBackButton } from '../../../components/layout/PageBackButton';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill } from '../ui/CenterPill';
import { useApi } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useT } from '../../../i18n';

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
}

export default function CenterEmployeeDetailPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string }>();
  const { data: employee, loading, error } = useApi<EmployeeDetail>(
    () => api.get<EmployeeDetail>(`/center/employees/${params.id}`),
    [params.id]
  );

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>;
  if (!employee) return null;

  const statusTone = employee.status === 'ACTIVE' ? 'green' : employee.status === 'PENDING' ? 'amber' : 'slate';

  return (
    <div className="space-y-5">
      <PageBackButton />

      <CenterPageHeader
        eyebrow={t('employee')}
        title={employee.fullName}
        description={`@${employee.username}`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CenterStatCard value={employee.status} label={t('status')} />
        <CenterStatCard value={employee.role.replace(/_/g, ' ')} label={t('role')} />
        <CenterStatCard value={employee.phone || '—'} label={t('phone')} />
        <CenterStatCard
          value={new Date(employee.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          label={t('joinedAt')}
        />
      </div>

      <div className="mj-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[color:var(--mj-border-soft)] p-5 sm:flex-row sm:items-center">
          <span className="mj-avatar mj-avatar--md shrink-0">{employee.fullName.charAt(0)}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[color:var(--mj-ink-strong)]">{employee.fullName}</h2>
              <CenterPill tone={statusTone}>{employee.status}</CenterPill>
              <CenterPill tone="blue">{employee.role.replace(/_/g, ' ')}</CenterPill>
            </div>
            <p className="mt-1 text-sm text-[color:var(--mj-muted)]">
              {t('joinedAt')}: {new Date(employee.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="grid gap-px bg-[color:var(--mj-border-soft)] sm:grid-cols-2 lg:grid-cols-4">
          <InfoCell icon={Phone} label={t('phone')} value={employee.phone || '—'} />
          <InfoCell icon={Mail} label={t('email')} value={employee.email || '—'} />
          <InfoCell icon={ShieldCheck} label={t('role')} value={employee.role.replace(/_/g, ' ')} />
          <InfoCell
            icon={CalendarDays}
            label={t('joinedAt')}
            value={new Date(employee.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          />
        </div>
      </div>
    </div>
  );
}

function InfoCell({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-[color:var(--mj-surface)] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--mj-accent-soft)] text-[color:var(--mj-accent)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[color:var(--mj-muted)]">{label}</p>
        <p className="truncate text-sm font-semibold text-[color:var(--mj-ink-strong)]">{value}</p>
      </div>
    </div>
  );
}

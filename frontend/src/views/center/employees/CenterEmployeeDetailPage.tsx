'use client';

import { useParams } from 'next/navigation';
import { Phone, Mail, ShieldCheck, CalendarDays } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageBackButton } from '../../../components/layout/PageBackButton';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { PencilLoader } from '../../../components/ui/PencilLoader';
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
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>;
  if (!employee) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PageBackButton />
        <PageHeader title={employee.fullName} subtitle={`@${employee.username}`} />
      </div>

      <Card bodyClassName="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={employee.fullName} src={employee.photo} size="xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{employee.fullName}</h2>
              <Badge tone={employee.status === 'ACTIVE' ? 'green' : employee.status === 'PENDING' ? 'amber' : 'slate'}>
                {employee.status}
              </Badge>
              <Badge tone="blue">{employee.role.replace(/_/g, ' ')}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {t('joinedAt')}: {new Date(employee.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={Phone} label={t('phone')} value={employee.phone || '—'} />
        <InfoCard icon={Mail} label={t('email')} value={employee.email || '—'} />
        <InfoCard icon={ShieldCheck} label={t('role')} value={employee.role.replace(/_/g, ' ')} />
        <InfoCard icon={CalendarDays} label={t('joinedAt')} value={new Date(employee.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <Card bodyClassName="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </Card>
  );
}
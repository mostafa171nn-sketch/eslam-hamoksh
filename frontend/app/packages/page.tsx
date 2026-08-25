'use client';

import Link from 'next/link';
import {
  BadgeCheck,
  Building2,
  Check,
  CreditCard,
  FileText,
  MapPinned,
  MessageSquare,
  Receipt,
  Users,
  BarChart3,
  Network,
  UserCog,
  GraduationCap,
  DoorOpen,
  Percent,
  ArrowRight,
} from 'lucide-react';
import { PublicNav } from '../../src/components/layout/PublicNav';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { PencilLoader } from '../../src/components/ui/PencilLoader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Alert } from '../../src/components/ui/ErrorAlert';
import { api, type CenterPackage } from '../../src/lib/api';
import { useApi } from '../../src/hooks/useApi';
import { useT, type Dict } from '../../src/i18n';

const FEATURE_FLAGS: { key: keyof CenterPackage; labelKey: keyof Dict; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'includesChat', labelKey: 'featureChat', icon: MessageSquare },
  { key: 'includesExams', labelKey: 'featureExams', icon: FileText },
  { key: 'includesAssignments', labelKey: 'featureAssignments', icon: BadgeCheck },
  { key: 'includesAttendance', labelKey: 'featureAttendance', icon: MapPinned },
  { key: 'includesPayments', labelKey: 'featurePayments', icon: Receipt },
  { key: 'includesAnalytics', labelKey: 'featureAnalytics', icon: BarChart3 },
  { key: 'includesMultiBranch', labelKey: 'featureMultiBranch', icon: Network },
];

const QUOTAS: { key: keyof CenterPackage; labelKey: keyof Dict; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'maxTeachers', labelKey: 'maxTeachersQuota', icon: GraduationCap },
  { key: 'maxStudents', labelKey: 'maxStudentsQuota', icon: Users },
  { key: 'maxEmployees', labelKey: 'maxEmployeesQuota', icon: UserCog },
  { key: 'maxAssistants', labelKey: 'maxAssistantsQuota', icon: UserCog },
  { key: 'maxRooms', labelKey: 'maxRoomsQuota', icon: DoorOpen },
];

function billingPeriodLabel(p: CenterPackage, t: (k: keyof Dict) => string): string {
  if (p.billingPeriod === 'YEARLY') return t('billingPeriodYearly');
  if (p.billingPeriod === 'QUARTERLY') return t('billingPeriodQuarterly');
  return t('billingPeriodMonthly');
}

export default function PackagesPage() {
  const { t } = useT();
  const { data, initialLoading, error } = useApi<CenterPackage[]>(() => api.getPublicCenterPlans(), []);

  const plans = data ?? [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PublicNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{t('packagesTitle')}</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">{t('packagesSubtitle')}</p>
        </div>

        {error && <Alert message={error || t('packagesErrorState')} className="mx-auto max-w-md" />}

        {initialLoading ? (
          <div className="flex justify-center py-20">
            <PencilLoader label={t('packagesLoading')} />
          </div>
        ) : !error && plans.length === 0 ? (
          <EmptyState icon={CreditCard} title={t('noData')} description={t('packagesErrorState')} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <Card
                key={p.id}
                bodyClassName="flex flex-col p-6"
                className="flex transition hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
              >
                {/* Name + price */}
                <div className="border-b border-slate-100 pb-4 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{p.name}</h2>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{p.description}</p>
                  )}
                  <div className="mt-4 flex items-end gap-1">
                    <span className="text-3xl font-extrabold tracking-tight text-brand-600 dark:text-brand-300">
                      {p.priceMonthly.toLocaleString()}
                    </span>
                    <span className="pb-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                      {p.currency} {t('perMonth')}
                    </span>
                  </div>
                  <p className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {billingPeriodLabel(p, t)}
                  </p>
                  {p.commissionRate > 0 && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Percent className="h-3.5 w-3.5" /> {t('commissionRateLabel')}: {(p.commissionRate * 100).toFixed(1)}%
                    </p>
                  )}
                </div>

                {/* Included functionality */}
                <div className="pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('includesSection')}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {FEATURE_FLAGS.map(({ key, labelKey, icon: Icon }) => (
                      <li
                        key={String(key)}
                        className={`flex items-center gap-2 text-sm ${
                          p[key] ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 line-through dark:text-slate-600'
                        }`}
                      >
                        {p[key] ? (
                          <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <span className="h-4 w-4 shrink-0" />
                        )}
                        <Icon className="h-4 w-4 shrink-0 opacity-70" />
                        {t(labelKey)}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Limits / quotas */}
                <div className="pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('limitsSection')}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {QUOTAS.map(({ key, labelKey, icon: Icon }) => (
                      <li key={String(key)} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Icon className="h-4 w-4 shrink-0 opacity-60" />
                        <span>{t(labelKey)}:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {typeof p[key] === 'number' ? `${t('upTo')} ${p[key]}` : t('unlimitedQuota')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action */}
                <div className="mt-auto pt-5">
                  <Link href="/centers/register" className="block">
                    <Button className="w-full" size="lg">
                      {t('choosePackageCta')}
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

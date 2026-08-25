'use client';

import { useEffect, useState } from 'react';
import { Check, CreditCard, Percent } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { api, type CenterPackage } from '../../lib/api';
import { useApi } from '../../hooks/useApi';
import { useT, type Dict } from '../../i18n';

interface MySubscription {
  centerId: string;
  centerName: string;
  subscriptionStatus: string;
  plan: {
    id: string;
    name: string;
    priceMonthly: number;
    currency: string;
    commissionRate: number;
    billingPeriod: string;
  } | null;
  startedAt: string | null;
  expiresAt: string | null;
}

const QUOTA_KEYS: { key: keyof CenterPackage; labelKey: keyof Dict }[] = [
  { key: 'maxTeachers', labelKey: 'maxTeachersQuota' },
  { key: 'maxStudents', labelKey: 'maxStudentsQuota' },
  { key: 'maxEmployees', labelKey: 'maxEmployeesQuota' },
  { key: 'maxAssistants', labelKey: 'maxAssistantsQuota' },
  { key: 'maxRooms', labelKey: 'maxRoomsQuota' },
];

const FEATURE_KEYS: { key: keyof CenterPackage; labelKey: keyof Dict }[] = [
  { key: 'includesChat', labelKey: 'featureChat' },
  { key: 'includesExams', labelKey: 'featureExams' },
  { key: 'includesAssignments', labelKey: 'featureAssignments' },
  { key: 'includesAttendance', labelKey: 'featureAttendance' },
  { key: 'includesPayments', labelKey: 'featurePayments' },
  { key: 'includesAnalytics', labelKey: 'featureAnalytics' },
  { key: 'includesMultiBranch', labelKey: 'featureMultiBranch' },
];

/**
 * Center Admin view of the platform packages: the package the center currently
 * has (from /subscriptions/me) plus every active CENTER package available on
 * the platform (same public dataset as the public packages page).
 */
export function CenterPackagesPanel() {
  const { t } = useT();
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [subError, setSubError] = useState('');

  const { data: plans, initialLoading, error } = useApi<CenterPackage[]>(() => api.getPublicCenterPlans(), []);

  useEffect(() => {
    let active = true;
    api
      .get<MySubscription>('/subscriptions/me')
      .then((res) => {
        if (active) setSubscription(res.data);
      })
      .catch((err) => {
        if (active) setSubError(err instanceof Error ? err.message : t('packagesErrorState'));
      })
      .finally(() => {
        if (active) setSubLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentPlanId = subscription?.plan?.id ?? null;

  return (
    <div className="mt-8">
      {/* Current package */}
      <Card title={t('currentPlanCard')} bodyClassName="p-5">
        {subLoading ? (
          <PencilLoader size="sm" />
        ) : subError ? (
          <Alert message={subError} />
        ) : !subscription?.plan ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('noActivePlan')}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-slate-400">{t('currentPlanCard')}</p>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{subscription.plan.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{t('price')}</p>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                {subscription.plan.priceMonthly.toLocaleString()} {subscription.plan.currency} {t('perMonth')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{t('subscriptionStatusLabel')}</p>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{subscription.subscriptionStatus}</p>
            </div>
            {subscription.expiresAt && (
              <div>
                <p className="text-xs text-slate-400">{t('subscriptionExpiresLabel')}</p>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                  {new Date(subscription.expiresAt).toLocaleDateString()}
                </p>
              </div>
            )}
            {subscription.plan.commissionRate > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Percent className="h-3.5 w-3.5" /> {t('commissionRateLabel')}: {(subscription.plan.commissionRate * 100).toFixed(1)}%
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Available packages */}
      <h3 className="mb-3 mt-6 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
        <CreditCard className="h-5 w-5 text-brand-600" />
        {t('availablePackagesCard')}
      </h3>

      {error && <Alert message={error || t('packagesErrorState')} />}
      {initialLoading ? (
        <div className="flex justify-center py-10">
          <PencilLoader label={t('packagesLoading')} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(plans ?? []).map((p) => {
            const isCurrent = p.id === currentPlanId;
            return (
              <Card
                key={p.id}
                bodyClassName="flex flex-col p-5"
                className={isCurrent ? 'border-brand-500 ring-1 ring-brand-200 dark:border-brand-400' : ''}
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">{p.name}</h4>
                  {isCurrent && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                      {t('currentPlanCard')}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xl font-extrabold text-brand-600 dark:text-brand-300">
                  {p.priceMonthly.toLocaleString()} {p.currency}
                  <span className="text-xs font-medium text-slate-400"> {t('perMonth')}</span>
                </p>
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('limitsSection')}</p>
                  <ul className="mt-1 space-y-1">
                    {QUOTA_KEYS.map(({ key, labelKey }) => (
                      <li key={String(key)} className="text-xs text-slate-600 dark:text-slate-300">
                        {t(labelKey)}:{' '}
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {typeof p[key] === 'number' ? `${t('upTo')} ${p[key]}` : t('unlimitedQuota')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('featuresSection')}</p>
                  <ul className="mt-1 space-y-1">
                    {FEATURE_KEYS.map(({ key, labelKey }) => (
                      <li
                        key={String(key)}
                        className={`flex items-center gap-1.5 text-xs ${p[key] ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300 line-through dark:text-slate-600 dark:text-slate-300'}`}
                      >
                        {p[key] && <Check className="h-3 w-3 shrink-0 text-emerald-500" />}
                        {t(labelKey)}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CenterPackagesPanel;

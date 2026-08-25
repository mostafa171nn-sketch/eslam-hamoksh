'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert, InlineError } from '../../components/ui/ErrorAlert';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useT, type Dict } from '../../i18n';
import { PAYMENT_METHODS } from '../../lib/payments';
import type { PaymentMethodType, TeacherPaymentSettings } from '../../lib/types';

const METHOD_FIELD_BY_VALUE: Record<PaymentMethodType, keyof TeacherPaymentSettings> = {
  VODAFONE_CASH: 'vodafoneCash',
  ETISALAT_CASH: 'etisalatCash',
  ORANGE_CASH: 'orangeCash',
  INSTAPAY: 'instaPay',
  TELDA: 'telda',
};

export default function TeacherPaymentSettingsPage() {
  const toast = useToast();
  const { t } = useT();
  const { data, initialLoading, error } = useApi<TeacherPaymentSettings>(() => api.get<TeacherPaymentSettings>('/payments/teacher/settings'), []);
  const [form, setForm] = useState<Partial<TeacherPaymentSettings>>({});
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | ''>('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  // Preselect the first configured method (or none when nothing is set up yet).
  useEffect(() => {
    if (!selectedMethod && data) {
      const first = PAYMENT_METHODS.find((m) => data[METHOD_FIELD_BY_VALUE[m.value]]);
      if (first) setSelectedMethod(first.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const set = (key: keyof TeacherPaymentSettings, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      await api.put('/payments/teacher/settings', form);
      toast.success(t('settingsSavedToast'));
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) return <PencilLoader label={t('loading')} />;
  if (error) return <Alert message={error} />;

  const methodOptions: { value: string; label: string }[] = [
    ...PAYMENT_METHODS.map((m) => ({
      value: m.value,
      label: t(m.labelKey as keyof Dict) ?? m.label,
    })),
  ];

  const activeField = selectedMethod ? METHOD_FIELD_BY_VALUE[selectedMethod] : null;
  const activeMeta = PAYMENT_METHODS.find((m) => m.value === selectedMethod);

  return (
    <div>
      <PageHeader title={t('paymentSettingsTitle')} subtitle={t('paymentSettingsSub')} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('pricingCard')}>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={!!form.sessionEnabled}
                onChange={(e) => set('sessionEnabled', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              {t('enablePayPerSession')}
            </label>
            <Input
              label={t('sessionPrice')}
              type="number"
              value={form.sessionPrice ?? 0}
              onChange={(e) => set('sessionPrice', Number(e.target.value))}
            />
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={!!form.monthlyEnabled}
                onChange={(e) => set('monthlyEnabled', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              {t('enableMonthlySubscription')}
            </label>
            <Input
              label={t('monthlyPrice')}
              type="number"
              value={form.monthlyPrice ?? 0}
              onChange={(e) => set('monthlyPrice', Number(e.target.value))}
            />
          </div>
        </Card>

        {/* Payment methods: one dropdown + the account field for the chosen method. */}
        <Card
          title={t('paymentMethodsCard')}
          subtitle={t('selectMethodConfigure')}
        >
          <div className="space-y-4">
            <Select
              label={t('method')}
              options={methodOptions}
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value as PaymentMethodType)}
            />
            {activeField && activeMeta ? (
              <>
                <Input
                  label={t('methodAccount').replace('{m}', t(activeMeta.labelKey as keyof Dict))}
                  placeholder={activeMeta.placeholder}
                  value={(form[activeField] as string) ?? ''}
                  onChange={(e) => set(activeField, e.target.value)}
                />
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('configuredMethods')}</p>
                  <ul className="mt-1 space-y-0.5">
                    {PAYMENT_METHODS.map((m) => {
                      const configured = !!(form[METHOD_FIELD_BY_VALUE[m.value]] as string | undefined);
                      return (
                        <li key={m.value} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-300">{t(m.labelKey as keyof Dict)}</span>
                          <span className={configured ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                            {configured ? '✓' : t('notConfigured')}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">{t('selectMethodConfigure')}</p>
            )}
          </div>
        </Card>
      </div>

      {err && (
        <div className="mt-4">
          <InlineError message={err} />
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button onClick={save} loading={saving}>
          <Save className="h-4 w-4" />
          {t('save')}
        </Button>
      </div>
    </div>
  );
}

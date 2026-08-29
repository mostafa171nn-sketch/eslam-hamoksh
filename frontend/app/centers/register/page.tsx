'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { PublicNav } from '../../../src/components/layout/PublicNav';
import { Input } from '../../../src/components/ui/Input';
import { Textarea } from '../../../src/components/ui/Textarea';
import { Button } from '../../../src/components/ui/Button';
import { InlineError } from '../../../src/components/ui/ErrorAlert';
import { PhoneInput } from '../../../src/components/ui/PhoneInput';
import { api, ApiClientError, type RegisterCenterResult } from '../../../src/lib/api';
import { errorMessage } from '../../../src/hooks/useApi';
import { useT } from '../../../src/i18n';
import { normalizePhone } from '../../../src/lib/phone';
import { PageBackButton } from '@/src/components/layout/PageBackButton';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_.-]+$/;

export default function CenterRegisterPage() {
  const { t } = useT();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    description: '',
    adminFullName: '',
    adminUsername: '',
    adminPhone: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [centerCountryCode, setCenterCountryCode] = useState('+20');
  const [adminCountryCode, setAdminCountryCode] = useState('+20');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [serverDetails, setServerDetails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegisterCenterResult | null>(null);

  const locationStatusMessage = (() => {
    if (!result?.locationStatus || result.locationStatus === 'success') return null;
    switch (result.locationStatus) {
      case 'not_found':
        return t('locationNotFound');
      case 'unavailable':
        return t('locationUnavailable');
      case 'skipped':
        return t('locationSkipped');
      default:
        return null;
    }
  })();

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (form.name.trim().length < 2) errs.name = `${t('centerName')} ${t('required')}`;
    // Center phone validation with country code
    try {
      const n = normalizePhone(form.phone.trim(), centerCountryCode);
      if (!/^\+\d{8,15}$/.test(n)) errs.phone = t('validPhoneDigits');
    } catch {
      errs.phone = t('validPhoneDigits');
    }
    if (!form.city.trim()) errs.city = `${t('city')} ${t('required')}`;
    if (!form.address.trim()) errs.address = `${t('address')} ${t('required')}`;
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) errs.email = t('validEmailOptional');

    if (form.adminFullName.trim().length < 2) errs.adminFullName = `${t('adminFullName')} ${t('required')}`;

    const username = form.adminUsername.trim();
    if (!username) errs.adminUsername = `${t('adminUsername')} ${t('required')}`;
    else if (username.length < 3 || !USERNAME_RE.test(username)) errs.adminUsername = t('usernameCenterRule');

    try {
      const n = normalizePhone(form.adminPhone.trim(), adminCountryCode);
      if (!/^\+\d{8,15}$/.test(n)) errs.adminPhone = t('validPhoneDigits');
    } catch {
      errs.adminPhone = t('validPhoneDigits');
    }

    if (!form.adminEmail.trim()) errs.adminEmail = `${t('adminEmail')} ${t('required')}`;
    else if (!EMAIL_RE.test(form.adminEmail.trim())) errs.adminEmail = t('validEmailOptional');

    if (form.adminPassword.length < 8) errs.adminPassword = t('passwordMinChars');

    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setServerError('');
    setServerDetails([]);
    try {
      const normalizedCenterPhone = normalizePhone(form.phone.trim(), centerCountryCode);
      const normalizedAdminPhone = normalizePhone(form.adminPhone.trim(), adminCountryCode);
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: normalizedCenterPhone,
        city: form.city.trim(),
        address: form.address.trim(),
        description: form.description.trim() || undefined,
        adminFullName: form.adminFullName.trim(),
        adminUsername: form.adminUsername.trim(),
        adminPhone: normalizedAdminPhone,
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
      };
      const res = await api.registerCenter(payload);
      setResult(res.data);
      return;
    } catch (err) {
      const raw = errorMessage(err, t('registrationFailed'));
      if (raw.toLowerCase().includes('phone') && raw.toLowerCase().includes('already')) {
        setErrors((prev) => ({ ...prev, phone: 'This phone number is already registered.', adminPhone: 'This phone number is already registered.' }));
      }
      if (raw.toLowerCase().includes('username') && raw.toLowerCase().includes('taken')) {
        setErrors((prev) => ({ ...prev, adminUsername: 'This username is already taken.' }));
      }
      setServerError(raw);
      if (err instanceof ApiClientError && Array.isArray(err.details)) {
        setServerDetails((err.details as Array<{ path?: string; message?: string }>).map((d) => (d?.path ? `${d.path}: ${d.message}` : d?.message)).filter(Boolean) as string[]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <PublicNav />
        <main className="mx-auto max-w-xl px-4 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{t('registerCenter')}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('pendingApproval')}</p>
            {locationStatusMessage && (
              <div
                className={`mt-4 rounded-lg p-3 text-sm ${
                  result?.locationStatus === 'not_found' || result?.locationStatus === 'unavailable'
                    ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200'
                    : 'bg-slate-50 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300'
                }`}
              >
                {locationStatusMessage}
              </div>
            )}
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-700/40 dark:text-slate-300">
              <p>{t('centerIdLabel')}: {result.centerId}</p>
            </div>
            {result?.locationStatus === 'success' && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> {t('locationDetected')}
              </p>
            )}
            <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
              {t('login')} →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PublicNav />
      <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <PageBackButton fallback="/centers" className="mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('registerCenterTitle')}</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500 dark:text-slate-400">{t('registerCenterSubtitle')}</p>

        <form
          onSubmit={submit}
          noValidate
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <InlineError message={serverError} />
          {serverDetails.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {serverDetails.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('center')}</h2>
          <Input label={`${t('centerName')} *`} value={form.name} onChange={set('name')} error={errors.name} />
          <Input label={t('centerEmail')} type="email" value={form.email} onChange={set('email')} error={errors.email} />
          <PhoneInput
            label={`${t('centerPhone')} *`}
            value={form.phone}
            countryCode={centerCountryCode}
            onValueChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            onCountryChange={setCenterCountryCode}
            error={errors.phone}
            placeholder="10 1234 5678"
          />
          <Input label={`${t('city')} *`} value={form.city} onChange={set('city')} error={errors.city} />
          <Input label={`${t('address')} *`} value={form.address} onChange={set('address')} error={errors.address} />
          <Textarea
            label={`${t('description')} (${t('optional')})`}
            rows={3}
            value={form.description}
            onChange={set('description')}
          />

          <h2 className="border-t border-slate-100 pt-4 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:text-white">
            {t('adminAccount')}
          </h2>
          <Input
            label={`${t('adminFullName')} *`}
            value={form.adminFullName}
            onChange={set('adminFullName')}
            error={errors.adminFullName}
          />
          <Input
            label={`${t('adminUsername')} *`}
            value={form.adminUsername}
            onChange={set('adminUsername')}
            error={errors.adminUsername}
          />
          <PhoneInput
            label={`${t('adminPhone')} *`}
            value={form.adminPhone}
            countryCode={adminCountryCode}
            onValueChange={(v) => setForm((f) => ({ ...f, adminPhone: v }))}
            onCountryChange={setAdminCountryCode}
            error={errors.adminPhone}
            placeholder="10 1234 5678"
          />
          <Input
            label={`${t('adminEmail')} *`}
            type="email"
            value={form.adminEmail}
            onChange={set('adminEmail')}
            error={errors.adminEmail}
          />
          <Input
            label={`${t('adminPassword')} *`}
            type="password"
            value={form.adminPassword}
            onChange={set('adminPassword')}
            error={errors.adminPassword}
          />

          <Button type="submit" loading={loading} className="w-full" size="lg">
            {t('submit')}
          </Button>
        </form>
      </main>
    </div>
  );
}

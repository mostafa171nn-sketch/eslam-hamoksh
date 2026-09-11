'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/ErrorAlert';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { api } from '../../lib/api';
import { errorMessage } from '../../hooks/useApi';
import { useT } from '../../i18n';
import { normalizePhone } from '../../lib/phone';

export default function ForgotPasswordPage() {
  const { t } = useT();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+20');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    let e164: string;
    try {
      e164 = normalizePhone(phone.trim(), countryCode);
      if (!/^\+\d{8,15}$/.test(e164)) throw new Error('invalid');
    } catch {
      setError(t('validPhone'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.requestPasswordResetOtp(e164);
      router.push(
        `/forgot-password/verify?v=${encodeURIComponent(res.data?.verificationId ?? '')}&m=${encodeURIComponent(res.data?.maskedPhone ?? '')}`,
      );
    } catch (err) {
      setError(errorMessage(err, t('requestFailed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t('forgotPasswordPhoneTitle')} subtitle={t('forgotPasswordPhoneSubtitle')}>
      <form onSubmit={submit} className="space-y-4">
        <InlineError message={error} />
        <PhoneInput
          label={t('phone')}
          value={phone}
          countryCode={countryCode}
          onValueChange={setPhone}
          onCountryChange={setCountryCode}
          error={error}
          placeholder="10 1234 5678"
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          {t('sendCode')}
        </Button>
        <p className="text-center text-sm text-slate-500">
          {t('ifAccountExistsMsg')}
        </p>
        <p className="text-center text-sm text-slate-500">
          {t('rememberedIt')}{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            {t('backToSignIn')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
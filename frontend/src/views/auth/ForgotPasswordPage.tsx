'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/ErrorAlert';
import { api } from '../../lib/api';
import { errorMessage } from '../../hooks/useApi';
import { useT } from '../../i18n';
import { MailCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { t } = useT();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim()) {
      setError(t('enterUsernameOrEmail'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { usernameOrEmail: usernameOrEmail.trim() });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, t('requestFailed')));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title={t('checkEmailTitle')} subtitle={t('checkEmailSubtitle')}>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-emerald-600" />
          <p className="mt-3 text-sm text-emerald-800">
            {t('checkEmailSentPre')} <strong>{usernameOrEmail}</strong>{t('checkEmailSentPost')}
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
            {t('backToSignIn')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('resetPasswordTitle')} subtitle={t('resetPasswordSubtitle')}>
      <form onSubmit={submit} className="space-y-4">
        <InlineError message={error} />
        <Input
          label={t('usernameOrEmail')}
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          placeholder={t('usernamePlaceholder')}
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          {t('sendResetLink')}
        </Button>
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

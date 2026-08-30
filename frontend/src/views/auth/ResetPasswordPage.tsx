'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/ErrorAlert';
import { api } from '../../lib/api';
import { errorMessage } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n';
import { CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? '';
  const toast = useToast();
  const { t } = useT();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError(t('passwordStrength'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordsNoMatch'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setDone(true);
      toast.success(t('passwordUpdatedToast'));
    } catch (err) {
      setError(errorMessage(err, t('resetFailed')));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title={t('invalidResetLink')} subtitle={t('invalidResetLinkSub')}>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">
            {t('invalidResetLinkBody')}
          </p>
          <Link href="/forgot-password" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
            {t('requestNewLink')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title={t('passwordUpdatedTitle')} subtitle={t('passwordUpdatedSub')}>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <p className="mt-3 text-sm text-emerald-800">{t('canNowSignIn')}</p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
            {t('goToSignIn')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('setNewPasswordTitle')} subtitle={t('setNewPasswordSub')}>
      <form onSubmit={submit} className="space-y-4">
        <InlineError message={error} />
        <Input
          label={t('newPassword')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={t('passwordHint8')}
          autoComplete="new-password"
        />
        <Input
          label={t('confirmNewPassword')}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          {t('updatePassword')}
        </Button>
      </form>
    </AuthLayout>
  );
}

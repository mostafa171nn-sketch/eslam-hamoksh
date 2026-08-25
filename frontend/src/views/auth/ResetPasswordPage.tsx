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
import { CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? '';
  const toast = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be 8+ characters with letters and numbers.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setDone(true);
      toast.success('Password updated. Sign in with your new password.');
    } catch (err) {
      setError(errorMessage(err, 'Reset failed.'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid reset link" subtitle="This link is missing its security token.">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">
            The reset link is invalid or has expired. Please request a new one.
          </p>
          <Link href="/forgot-password" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="Your password has been changed.">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <p className="mt-3 text-sm text-emerald-800">You can now sign in with your new password.</p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
            Go to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password for your account.">
      <form onSubmit={submit} className="space-y-4">
        <InlineError message={error} />
        <Input
          label="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters with letters and numbers."
          autoComplete="new-password"
        />
        <Input
          label="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}

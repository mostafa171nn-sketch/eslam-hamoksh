'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/ErrorAlert';
import { api } from '../../lib/api';
import { errorMessage } from '../../hooks/useApi';
import { MailCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim()) {
      setError('Enter your username or email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { usernameOrEmail: usernameOrEmail.trim() });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, 'Request failed.'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="We sent you a link to reset your password.">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-emerald-600" />
          <p className="mt-3 text-sm text-emerald-800">
            If an account exists for <strong>{usernameOrEmail}</strong>, a password reset link has been
            sent. The link is valid for one hour.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your username or email and we'll send you a reset link.">
      <form onSubmit={submit} className="space-y-4">
        <InlineError message={error} />
        <Input
          label="Username or email"
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          placeholder="superadmin or you@example.com"
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Send reset link
        </Button>
        <p className="text-center text-sm text-slate-500">
          Remembered it?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

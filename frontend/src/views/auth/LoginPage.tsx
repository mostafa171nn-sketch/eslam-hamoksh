'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { StudentLoginShell } from '../../components/auth/StudentAuthShell';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/ErrorAlert';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../hooks/useApi';
import { useT } from '../../i18n';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get('next') || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!username.trim()) errs.username = t('username') + ' ' + t('required') + '.';
    if (!password) errs.password = t('passwordRequiredField');
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setServerError('');
    try {
      await login(username.trim(), password);
      router.replace(next);
    } catch (err) {
      setServerError(errorMessage(err, t('loginFailed')));
    } finally {
      setLoading(false);
    }
  };

  return (
      <StudentLoginShell title={t('login')} subtitle={t('enterCredentials')} back={true} flipTo="/register/student" flipLabel={t('register')}>
        <form onSubmit={submit} className="space-y-4">
        <InlineError message={serverError} />
        <Input
          label={t('username')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          autoComplete="username"
          placeholder={t('enterYourUsername')}
          type="text"
        />
        <Input
          label={t('password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="current-password"
          placeholder="••••••••"
        />
        <div className="flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700 transition-colors">
            {t('forgotPasswordQ')}
          </Link>
        </div>
        <Button type="submit" loading={loading} className="w-full" size="lg">
          {t('login')}
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
        <p className="font-medium text-slate-700 dark:text-slate-200">{t('register')}</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/register/teacher" className="text-brand-600 hover:text-brand-700 transition-colors">
            {t('teacher')}
          </Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <Link href="/register/student" className="text-brand-600 hover:text-brand-700 transition-colors">
            {t('student')}
          </Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <Link href="/register/parent" className="text-brand-600 hover:text-brand-700 transition-colors">
            {t('parent')}
          </Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <Link href="/centers/register" className="text-brand-600 hover:text-brand-700 transition-colors">
            {t('registerCenter')}
          </Link>
        </div>
      </div>

      {process.env.NODE_ENV !== 'production' && (
        <p className="mt-2 text-[11px] text-slate-400">
          {t('testAccountsNote')}
        </p>
      )}
    </StudentLoginShell>
  );
}

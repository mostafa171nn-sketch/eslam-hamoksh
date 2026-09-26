'use client';

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { StudentLoginShell } from '../../components/auth/StudentAuthShell';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/ErrorAlert';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../hooks/useApi';
import { useT } from '../../i18n';
import { api } from '../../lib/api';

interface DemoAccount {
  username: string;
  role: string;
  fullName: string;
  centerId: string | null;
}

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
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    api.get<{ success: boolean; data: { enabled: boolean; password: string; accounts: DemoAccount[] } }>('/auth/mock-info')
      .then((res) => {
        if (res.data?.success && res.data.data.enabled) {
          setDemoAccounts(res.data.data.accounts);
        }
      })
      .catch(() => {});
  }, []);

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

  const useDemo = async (account: DemoAccount) => {
    setUsername(account.username);
    setPassword('Demo@12345');
    setErrors({});
    setServerError('');
    setLoading(true);
    try {
      await login(account.username, 'Demo@12345');
      router.replace(next);
    } catch (err) {
      setServerError(errorMessage(err, t('loginFailed')));
    } finally {
      setLoading(false);
    }
  };

  const roleLabel: Record<string, string> = { SUPER_ADMIN: 'Super Admin', CENTER_ADMIN: 'Center Admin', ADMIN: 'Admin', TEACHER: 'Teacher', STUDENT: 'Student', PARENT: 'Parent' };

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

      {demoAccounts.length > 0 && (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-800 dark:bg-brand-950/30">
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">{t('demoAccounts')}</p>
          <p className="mt-1 text-xs text-brand-600 dark:text-brand-400">{t('demoAccountPicker')}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {demoAccounts.map((a) => (
              <button
                key={a.username}
                type="button"
                disabled={demoLoading}
                onClick={() => { setDemoLoading(true); useDemo(a).finally(() => setDemoLoading(false)); }}
                className="rounded-lg border border-brand-300 bg-white px-3 py-2 text-left text-xs font-medium text-brand-800 shadow-sm hover:bg-brand-100 dark:border-brand-700 dark:bg-slate-800 dark:text-brand-200 dark:hover:bg-brand-900/40"
              >
                <span className="block font-bold">{a.fullName}</span>
                <span className="block text-[11px] opacity-70">{a.username} · {roleLabel[a.role] ?? a.role}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-brand-500 dark:text-brand-400">{t('demoPasswordLabel')}: <b>Demo@12345</b></p>
        </div>
      )}

      {process.env.NODE_ENV !== 'production' && demoAccounts.length === 0 && (
        <p className="mt-2 text-[11px] text-slate-400">
          {t('testAccountsNote')}
        </p>
      )}
    </StudentLoginShell>
  );
}
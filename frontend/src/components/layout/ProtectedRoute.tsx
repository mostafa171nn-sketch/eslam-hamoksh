'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useT();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600 dark:border-slate-700 dark:border-t-brand-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('loading')}</p>
        </div>
      </div>
    );
  }
  if (!user) {
    return null;
  }
  return <>{children}</>;
}

export function RoleRoute({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  // Center-admin roles (CENTER_ADMIN + legacy ADMIN) are interchangeable, and
  // the platform super admin may access admin-gated areas for oversight.
  const allowed = new Set(roles);
  if (allowed.has('ADMIN')) {
    allowed.add('CENTER_ADMIN');
    allowed.add('SUPER_ADMIN');
  }

  useEffect(() => {
    if (user && !allowed.has(user.role)) router.replace('/dashboard');
  }, [user, roles, router]);

  if (user && !allowed.has(user.role)) {
    return null;
  }
  return <>{children}</>;
}

export function RoleDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'CENTER_ADMIN' || user?.role === 'ADMIN')
      router.replace('/admin');
    else if (user?.role === 'TEACHER') router.replace('/teacher');
    else if (user?.role === 'STUDENT') router.replace('/student');
    else if (user?.role === 'PARENT') router.replace('/parent');
    else router.replace('/login');
  }, [user, router]);

  return null;
}

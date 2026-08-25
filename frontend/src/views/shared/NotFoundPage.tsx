'use client';

import Link from 'next/link';
import { Compass } from 'lucide-react';
import { useT } from '../../i18n';

export default function NotFoundPage() {
  const { t } = useT();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Compass className="h-7 w-7 text-slate-400" />
      </div>
      <h1 className="mt-5 text-4xl font-bold text-slate-900 dark:text-white">404</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('notFoundDesc')}</p>
      <Link
        href="/centers"
        className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        {t('goHome')}
      </Link>
    </div>
  );
}

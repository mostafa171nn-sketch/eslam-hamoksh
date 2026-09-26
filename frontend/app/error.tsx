'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useT } from '../src/i18n';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useT();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Unhandled page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">{t('errorOccurred')}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{t('unexpectedError')}</p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-slate-400">{error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          {t('retry')}
        </button>
        <Link
          href="/"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {t('goHome')}
        </Link>
      </div>
    </div>
  );
}
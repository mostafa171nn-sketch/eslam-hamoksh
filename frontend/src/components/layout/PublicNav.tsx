'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { LangToggle } from '../LangToggle';
import { useT } from '../../i18n';

export function PublicNav() {
  const { t } = useT();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-white">{t('appName')}</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/centers"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:inline-block"
          >
            {t('centers')}
          </Link>
          <Link
            href="/packages"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:inline-block"
          >
            {t('packagesNav')}
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {t('register')}
          </Link>
          <LangToggle />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export default PublicNav;

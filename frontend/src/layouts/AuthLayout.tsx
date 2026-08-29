import type { ReactNode } from 'react';
import Link from 'next/link';
import { BookOpen, Sparkles } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { LangToggle } from '../components/LangToggle';
import { PageBackButton } from '../components/layout/PageBackButton';
import { useT } from '../i18n';

export function AuthLayout({
  title,
  subtitle,
  children,
  /** Optional in-content back control (rendered inside the card column). */
  back = true,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  back?: boolean | string;
}) {
  const { t } = useT();
  return (
    <div className="flex min-h-[100dvh]">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-slate-900 p-10 lg:flex dark:bg-slate-950">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-white">معارج</span>
        </Link>
        <div>
          <h1 className="max-w-md text-3xl font-bold leading-tight text-white">{t('authTaglineTitle')}</h1>
          <p className="mt-3 max-w-md text-sm text-slate-400">{t('authTaglineSub')}</p>
          <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="h-4 w-4 text-brand-400" />
            {t('authTaglineBadge')}
          </div>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300">© {new Date().getFullYear()} معارج</p>
      </div>
      <div className="flex w-full items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-900 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-4 flex items-center justify-between gap-2">
            {back !== false ? <PageBackButton fallback="/" /> : <span />}
            <div className="flex gap-2">
              <LangToggle />
              <ThemeToggle />
            </div>
          </div>
          <Link href="/" className="mb-8 flex items-center justify-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">معارج</span>
          </Link>
          <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-1.5 text-center text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-800">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

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
      {/* Left panel — brand side */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-brand-950 p-10 lg:flex dark:from-slate-950 dark:via-slate-950 dark:to-brand-950">
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        </div>
        {/* Gradient orb */}
        <div className="absolute -bottom-32 -start-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />

        <Link href="/" className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 shadow-brand">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">معارج</span>
        </Link>

        <div className="relative">
          <h1 className="max-w-md text-3xl font-bold leading-tight text-white">{t('authTaglineTitle')}</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">{t('authTaglineSub')}</p>
          <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="h-4 w-4 text-gold-400" />
            {t('authTaglineBadge')}
          </div>
        </div>

        <p className="relative text-xs text-slate-600 dark:text-slate-400">© {new Date().getFullYear()} معارج</p>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-900 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-4 flex items-center justify-between gap-2">
            {back !== false ? <PageBackButton fallback="/" /> : <span />}
            <div className="flex gap-2">
              <LangToggle />
              <ThemeToggle />
            </div>
          </div>
          <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 shadow-brand">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">معارج</span>
          </Link>
          <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-1.5 text-center text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-elevated sm:p-8 dark:border-slate-700 dark:bg-slate-800">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

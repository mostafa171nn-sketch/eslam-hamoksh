import type { ReactNode } from 'react';
import Link from 'next/link';
import { BookOpen, Sparkles } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { LangToggle } from '../components/LangToggle';
import { PageBackButton } from '../components/layout/PageBackButton';
import { KnowledgeVisual } from '../components/auth/KnowledgeVisual';
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
  const { t, dir } = useT();

  return (
    <div className={`flex min-h-[100dvh] ${dir === 'rtl' ? 'rtl' : 'ltr'}`}>
      {/* LEFT — Brand, Arabic identity, 3D knowledge */}
      <aside className="relative hidden w-1/2 flex-col overflow-hidden lg:flex" aria-label="Brand identity">
        <div className="absolute inset-0 bg-gradient-to-br from-[#060f22] via-[#091a30] to-[#0d1638]" aria-hidden />
        <div aria-hidden className="absolute -start-24 -top-24 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div aria-hidden className="absolute end-0 bottom-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

        {/* Arabic geometric frame */}
        <div aria-hidden className="absolute start-10 top-10 w-24 h-24 opacity-10 dark:opacity-20">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon points="10,50 50,10 90,50 50,90" fill="none" stroke="#d4a843" strokeWidth="0.8" />
            <polygon points="25,50 50,25 75,50 50,75" fill="none" stroke="#d4a843" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Subtle scientific grid */}
        <div aria-hidden className="absolute inset-0 opacity-[0.06] dark:opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <Link href="/" className="relative z-10 m-10 flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-brand">
            <BookOpen className="h-5 w-5 text-white" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-white">معارج</span>
        </Link>

        <div className="relative z-10 flex flex-1 items-center justify-center px-10">
          <KnowledgeVisual className="w-full max-w-md" />
        </div>

        <div className="relative z-10 px-10 pb-10">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white">{t('authTaglineTitle')}</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">{t('authTaglineSub')}</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-200 ring-1 ring-inset ring-brand-400/30">
            <Sparkles className="h-3.5 w-3.5 text-gold-400" />
            {t('authTaglineBadge')}
          </div>
        </div>
      </aside>

      {/* RIGHT — Form surface */}
      <main className="relative flex w-full items-start justify-center bg-[#f8f7f0] px-4 py-10 dark:bg-[#0b1122] lg:w-1/2 lg:items-center lg:justify-center lg:px-10 lg:py-12">
        {/* Soft decorative orbs */}
        <div aria-hidden className="pointer-events-none absolute -end-20 -top-20 h-64 w-64 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-900/30" />
        <div aria-hidden className="pointer-events-none absolute -start-10 bottom-10 h-48 w-48 rounded-full bg-cyan-200/30 blur-3xl dark:bg-cyan-900/20" />

        <div className="relative z-10 w-full max-w-[420px]">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-brand">
              <BookOpen className="h-5 w-5 text-white" />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">معارج</span>
          </div>

          <div className="mb-4 flex items-center justify-between gap-3">
            {back !== false ? <PageBackButton fallback="/" /> : <span />}
            <div className="flex gap-2">
              <LangToggle />
              <ThemeToggle />
            </div>
          </div>

          <div className="mb-2 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>

          {/* Form surface */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-[0_2px_30px_rgba(11,22,66,0.06)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-[0_2px_30px_rgba(11,22,66,0.2)] sm:p-8">
            {/* Subtle top accent line */}
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-400 via-cyan-400 to-gold-400 opacity-60" aria-hidden />
            {children}
          </div>

          {/* Small decorative scientific label */}
          <p className="mt-4 text-center text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-600" aria-hidden>
            {t('appName')}
          </p>
        </div>
      </main>
    </div>
  );
}

import type { ReactNode } from 'react';
import Link from 'next/link';
import { BookOpen, Sparkles } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { LangToggle } from '../LangToggle';
import { PageBackButton } from '../layout/PageBackButton';
import { useT } from '../../i18n';

export interface StudentLoginShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  back?: boolean | string;
  flipTo?: string;
  flipLabel?: string;
}

export function StudentLoginShell({
  title,
  subtitle,
  children,
  back = true,
  flipTo,
  flipLabel,
}: StudentLoginShellProps) {
  const { t, dir } = useT();
  return (
    <div
      className={`relative flex h-auto max-h-none min-h-[100dvh] w-full max-w-full flex-col overflow-x-hidden overflow-y-visible bg-[#060f22] text-slate-900 [box-sizing:border-box] dark:text-white lg:h-[100dvh] lg:max-h-[100dvh] lg:min-h-[100dvh] lg:flex-row lg:overflow-hidden ${dir === 'rtl' ? 'rtl' : 'ltr'}`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* LEFT — subtle abstract scientific identity */}
      <aside
        aria-label="Brand identity"
        className="relative z-10 hidden min-w-0 flex-col overflow-hidden bg-gradient-to-br from-[#060f22] via-[#091a30] to-[#0d1638] [box-sizing:border-box] lg:flex lg:h-[100dvh] lg:max-h-[100dvh] lg:min-h-[100dvh] lg:w-[44%] lg:shrink-0 xl:w-[42%]"
        style={{ boxSizing: 'border-box' }}
      >
        {/* Soft glows */}
        <div aria-hidden className="absolute -start-24 -top-24 h-80 w-80 rounded-full bg-brand-500/15 blur-[100px]" />
        <div aria-hidden className="absolute end-0 bottom-0 h-64 w-64 rounded-full bg-cyan-400/10 blur-[80px]" />

        {/* Subtle scientific dot grid */}
        <div aria-hidden className="absolute inset-0 opacity-[0.07] dark:opacity-[0.10]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {/* Small Arabic geometry */}
        <div aria-hidden className="absolute start-8 top-10 w-14 h-14 opacity-[0.15] dark:opacity-20 lg:start-12 lg:top-12">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon points="10,50 50,10 90,50 50,90" fill="none" stroke="#d4a843" strokeWidth="0.8" />
            <polygon points="25,50 50,25 75,50 50,75" fill="none" stroke="#d4a843" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Brand */}
        <div className="relative z-10 p-10 pt-10 pb-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Maarej home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-brand">
              <BookOpen className="h-5 w-5 text-white" />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-white">معارج</span>
          </Link>
          <div className="mt-6 max-w-xs">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white">{t('authTaglineTitle')}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{t('authTaglineSub')}</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-200 ring-1 ring-inset ring-brand-400/30">
              <Sparkles className="h-3.5 w-3.5 text-gold-400" />
              {t('authTaglineBadge')}
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-auto px-10 pb-8 pt-6">
          <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" aria-hidden />
            <span>Maarej — Education</span>
          </div>
        </div>
      </aside>

      {/* RIGHT — clean premium form */}
      <main
        className="relative z-10 box-border flex h-auto max-h-none w-full max-w-full min-w-0 flex-col items-stretch justify-start overflow-x-hidden overflow-y-visible bg-[#f8f7f0] px-5 py-8 sm:px-6 sm:py-10 lg:min-h-[100dvh] lg:h-[100dvh] lg:max-h-[100dvh] lg:flex-1 lg:w-auto lg:items-center lg:justify-start lg:overflow-y-auto lg:overflow-x-hidden lg:px-8 lg:py-10 xl:px-10 dark:bg-[#0b1122] lg:[overscroll-behavior:contain] lg:[scrollbar-gutter:stable]"
        style={{ boxSizing: 'border-box' }}
      >
        <div aria-hidden className="pointer-events-none absolute -start-10 -top-10 h-56 w-56 rounded-full bg-brand-200/30 blur-3xl dark:bg-brand-900/20" />

        <div className="relative z-10 mx-auto box-border w-full min-w-0 max-w-[448px] sm:max-w-[440px] lg:max-w-[480px] xl:max-w-[520px] pb-6 lg:pb-8" style={{ boxSizing: 'border-box' }}>
          {/* Controls */}
          <div className="mb-5 flex items-center justify-between gap-3">
            {back !== false ? <PageBackButton fallback="/" /> : <span />}
            <div className="flex items-center gap-2">
              {flipTo && flipLabel && (
                <Link
                  href={flipTo}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10"
                >
                  {flipLabel}
                </Link>
              )}
              <LangToggle />
              <ThemeToggle />
            </div>
          </div>

          {/* Form surface — reference card style */}
          <div className="relative box-border w-full max-w-full min-w-0 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-5 shadow-[0_10px_40px_rgba(30,64,175,0.08)] sm:p-6 dark:border-slate-700/60 dark:bg-slate-900 dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)]" style={{ boxSizing: 'border-box' }}>
            <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 rounded-t-[20px] bg-gradient-to-r from-brand-500 via-cyan-400 to-gold-400 opacity-50" />

            <div className="mb-6 text-center lg:text-start">
              <h2 className="text-[26px] font-semibold tracking-tight text-brand-600 dark:text-brand-400">{title}</h2>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

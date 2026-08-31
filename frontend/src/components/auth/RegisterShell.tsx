import type { ReactNode } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { LangToggle } from '../LangToggle';
import { PageBackButton } from '../layout/PageBackButton';
import { useT } from '../../i18n';

export function RegisterShell({
  title,
  subtitle,
  children,
  back = true,
  flipTo,
  flipLabel,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  back?: boolean | string;
  flipTo?: string;
  flipLabel?: string;
}) {
  const { t, dir } = useT();
  return (
    <div
      className={`relative flex min-h-[100dvh] w-full overflow-x-hidden bg-gradient-to-b from-[#fcfcf9] to-[#f5f3ee] text-slate-900 lg:flex-row ${dir === 'rtl' ? 'rtl' : 'ltr'} dark:bg-gradient-to-b dark:from-[#0b1122] dark:to-[#060f22] dark:text-slate-100`}
    >
      {/* Subtle abstract left visual — very restrained */}
      <aside
        aria-label="Decorative identity"
        className="hidden lg:flex relative z-10 w-[42%] flex-col overflow-hidden items-center justify-center bg-gradient-to-br from-[#060f22] via-[#0b1635] to-[#091a30]"
      >
        <div aria-hidden className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div aria-hidden className="absolute -start-24 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-[80px]" />
        <div aria-hidden className="absolute end-8 bottom-10 h-48 w-48 rounded-full bg-cyan-400/10 blur-[60px]" />

        <Link href="/" className="relative z-10 mb-auto mt-10 flex items-center gap-2.5" aria-label="Maarej home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-brand">
            <BookOpen className="h-4 w-4 text-white" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">معارج</span>
        </Link>

        <div aria-hidden className="relative z-10 mx-auto my-auto w-48 h-48 opacity-90">
          <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden>
            <defs>
              <linearGradient id="regGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4fc3f7" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#d4a843" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="70" fill="none" stroke="url(#regGrad)" strokeWidth="0.6" opacity="0.7" />
            <circle cx="100" cy="100" r="50" fill="none" stroke="#d4a843" strokeWidth="0.4" opacity="0.5" />
            <circle cx="100" cy="100" r="3" fill="#f0c97a" opacity="0.9" />
            <circle cx="65" cy="55" r="2.5" fill="#4fc3f7" opacity="0.8" />
            <circle cx="135" cy="145" r="2.5" fill="#4fc3f7" opacity="0.8" />
            <line x1="65" y1="55" x2="100" y2="100" stroke="#4fc3f7" strokeWidth="0.5" opacity="0.5" />
            <line x1="135" y1="145" x2="100" y2="100" stroke="#4fc3f7" strokeWidth="0.5" opacity="0.5" />
          </svg>
        </div>

        <div className="relative z-10 mb-10 mt-auto px-10 pb-8 text-[11px] font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">
          <span className="text-slate-400">معارج</span> · Education
        </div>
      </aside>

      {/* RIGHT — premium registration form */}
      <main
        className="relative z-10 flex w-full flex-col justify-start overflow-y-auto overflow-x-hidden bg-[#f8f7f0] px-5 py-8 sm:px-6 lg:w-[58%] lg:items-center lg:justify-center lg:px-14 lg:py-10 dark:bg-[#0b1122]"
        style={{ overscrollBehavior: 'contain' }}
      >
        <div aria-hidden className="pointer-events-none absolute -end-16 -top-16 h-72 w-72 rounded-full bg-brand-200/30 blur-3xl dark:bg-brand-900/20" />

        <div className="relative z-10 w-full max-w-[480px] lg:max-w-[520px]">
          <div className="mb-5 flex items-center justify-between gap-3">
            {back !== false ? <PageBackButton fallback="/" /> : <span />}
            <div className="flex gap-2">
              <LangToggle />
              <ThemeToggle />
            </div>
          </div>

          <div className="mb-2 text-center lg:text-start">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>

          <div className="relative rounded-2xl border border-slate-200/70 bg-white/90 shadow-[0_2px_30px_rgba(11,22,66,0.06)] backdrop-blur-xl transition-colors dark:border-slate-700/60 dark:bg-slate-900/80 dark:shadow-[0_2px_30px_rgba(11,22,66,0.2)] p-6 sm:p-8 lg:p-10">
            <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-400 via-cyan-400 to-gold-400 opacity-60" />
            <div className="mb-6 flex items-center gap-3">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-brand-100 dark:ring-brand-900/40" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('register')}</span>
            </div>
            {children}
          </div>

          {flipTo && (
            <div className="mt-5 text-center">
              <Link href={flipTo} className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors dark:text-brand-300 dark:hover:text-brand-200 underline underline-offset-2">
                {flipLabel}
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

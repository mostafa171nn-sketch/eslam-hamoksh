import type { ReactNode } from 'react';
import Link from 'next/link';
import { BookOpen, Sparkles, Atom } from 'lucide-react';
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
    <div
      className={`relative flex h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-[#060f22] text-slate-900 dark:text-white lg:flex-row ${dir === 'rtl' ? 'rtl' : 'ltr'}`}
      style={{ overflowY: 'hidden' }}
    >
      {/* LEFT — immersive brand + 3D visual + Arabic identity */}
      <aside
        aria-label="Brand identity"
        className="relative z-10 flex w-full flex-col justify-between overflow-hidden lg:w-[55%] lg:flex lg:justify-between lg:items-stretch"
      >
        {/* Deep ink background */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#060f22] via-[#091a30] to-[#0d1638]" />
        <div aria-hidden className="absolute -start-16 -top-16 h-72 w-72 rounded-full bg-brand-500/20 blur-[80px]" />
        <div aria-hidden className="absolute end-0 bottom-0 h-64 w-64 rounded-full bg-cyan-400/10 blur-[80px]" />

        {/* Scientific grid */}
        <div aria-hidden className="absolute inset-0 opacity-[0.07] dark:opacity-[0.10]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {/* Arabic geometric frame */}
        <div aria-hidden className="absolute start-12 top-12 w-20 h-20 opacity-20 dark:opacity-25 lg:start-16 lg:top-16">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon points="10,50 50,10 90,50 50,90" fill="none" stroke="#d4a843" strokeWidth="0.8" />
            <polygon points="25,50 50,25 75,50 50,75" fill="none" stroke="#d4a843" strokeWidth="0.5" />
            <line x1="50" y1="10" x2="50" y2="90" stroke="#d4a843" strokeWidth="0.3" />
          </svg>
        </div>

        {/* Brand */}
        <div className="relative z-10 p-6 pt-8 pb-4 lg:p-10 lg:pt-10 lg:pb-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Maarej home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-brand">
              <BookOpen className="h-5 w-5 text-white" />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-white">المعارج</span>
          </Link>
          <div className="mt-4 max-w-md">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white lg:text-4xl">{t('authTaglineTitle')}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{t('authTaglineSub')}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-200 ring-1 ring-inset ring-brand-400/30">
              <Sparkles className="h-3.5 w-3.5 text-gold-400" />
              {t('authTaglineBadge')}
            </div>
          </div>
        </div>

        {/* 3D Visual — integrated, not isolated */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-6 lg:px-12 lg:pb-12">
          <div className="relative w-full max-w-md lg:max-w-lg" style={{ perspective: '1200px' }}>
            <KnowledgeVisual className="scale-[0.85] sm:scale-95 lg:scale-100 lg:scale-110 origin-center" />
          </div>
        </div>

        {/* Bottom scientific annotation */}
        <div className="relative z-10 pb-6 pl-6 lg:pl-10 lg:pb-8">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">
            <Atom className="h-3 w-3 text-cyan-400" />
            <span>Scientific visualization · Arabic identity</span>
          </div>
        </div>
      </aside>

      {/* RIGHT — Form area */}
      <main
        className="relative z-10 flex w-full flex-col justify-start overflow-y-auto bg-[#f8f7f0] px-6 py-8 dark:bg-[#0b1122] lg:w-[45%] lg:items-center lg:justify-center lg:px-10 lg:py-12"
        style={{ overscrollBehavior: 'contain' }}
      >
        {/* Very subtle top glow on right side */}
        <div aria-hidden className="pointer-events-none absolute -start-20 -top-20 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-900/20" />

        <div className="relative z-10 w-full max-w-[420px] lg:max-w-[460px]">
          {/* Controls */}
          <div className="mb-5 flex items-center justify-between gap-3">
            {back !== false ? <PageBackButton fallback="/" /> : <span />}
            <div className="flex gap-2">
              <LangToggle />
              <ThemeToggle />
            </div>
          </div>

          {/* Form title */}
          <div className="mb-6 text-center lg:text-start">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>

          {/* Form surface — hairline + subtle shadow + excellent whitespace */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-[0_2px_30px_rgba(11,22,66,0.06)] backdrop-blur-xl transition-colors duration-200 dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-[0_2px_30px_rgba(11,22,66,0.2)] sm:p-7 lg:p-8 p-6">
            {/* Scientific top line accent */}
            <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-400 via-cyan-400 to-gold-400 opacity-60" />
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

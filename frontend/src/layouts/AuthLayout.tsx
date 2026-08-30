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
  const { t, dir } = useT();

  return (
    <div
      className={`relative flex h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-[#060f22] text-slate-900 dark:text-white lg:flex-row ${dir === 'rtl' ? 'rtl' : 'ltr'}`}
      style={{ overflowY: 'hidden' }}
    >
      {/* LEFT — abstract scientific identity, no book, no large card */}
      <aside
        aria-label="Brand identity"
        className="relative z-10 flex w-full flex-col overflow-hidden lg:w-[52%] lg:items-stretch"
      >
        {/* Deep ink with soft atmospheric glow */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#060f22] via-[#0b1638] to-[#0d1638]" />
        <div aria-hidden className="absolute -start-20 -top-20 h-80 w-80 rounded-full bg-brand-500/15 blur-[100px]" />
        <div aria-hidden className="absolute end-10 bottom-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-[80px]" />

        {/* Subtle scientific grid */}
        <div aria-hidden className="absolute inset-0 opacity-[0.06] dark:opacity-[0.10]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {/* Small Arabic geometry accent */}
        <div aria-hidden className="absolute start-10 top-10 w-16 h-16 opacity-[0.15] dark:opacity-20 lg:start-14 lg:top-14">
          <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden>
            <polygon points="10,50 50,10 90,50 50,90" fill="none" stroke="#d4a843" strokeWidth="0.8" />
            <polygon points="25,50 50,25 75,50 50,75" fill="none" stroke="#d4a843" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Brand */}
        <div className="relative z-10 p-6 pt-8 pb-4 lg:p-10 lg:pt-10 lg:pb-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Maarej home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-brand">
              <BookOpen className="h-4 w-4 text-white" />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-white">معارج</span>
          </Link>
          <div className="mt-6 max-w-md">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white lg:text-[2.5rem]">{t('authTaglineTitle')}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{t('authTaglineSub')}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-200 ring-1 ring-inset ring-brand-400/30">
              <Sparkles className="h-3.5 w-3.5 text-gold-400" />
              {t('authTaglineBadge')}
            </div>
          </div>
        </div>

        {/* Subtle abstract scientific pattern (not a book) */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-6 lg:px-12" aria-hidden>
          <div className="relative w-full max-w-sm lg:max-w-md" style={{ perspective: '1000px' }}>
            {/* Layered translucent geometric planes */}
            <div className="relative h-48 lg:h-56 w-full" style={{ transformStyle: 'preserve-3d', transform: dir === 'rtl' ? 'rotateY(6deg) rotateX(4deg)' : 'rotateY(-6deg) rotateX(4deg)' }}>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-brand-900/40 to-cyan-900/30 border border-white/10 backdrop-blur-sm shadow-2xl" />
              <div className="absolute inset-4 rounded-2xl bg-gradient-to-br from-[#091a30]/60 to-[#060f22]/80 border border-white/5" />
              {/* Thin orbital curves */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 160" preserveAspectRatio="none">
                <ellipse cx="100" cy="80" rx="85" ry="55" fill="none" stroke="rgba(79,195,247,0.15)" strokeWidth="0.5" />
                <ellipse cx="100" cy="80" rx="55" ry="35" fill="none" stroke="rgba(212,168,67,0.15)" strokeWidth="0.5" transform="rotate(15 100 80)" />
                <circle cx="100" cy="80" r="3" fill="#f0c97a" opacity="0.9" />
                <circle cx="65" cy="50" r="2" fill="#4fc3f7" opacity="0.7" />
                <circle cx="135" cy="110" r="2" fill="#4fc3f7" opacity="0.7" />
                <line x1="65" y1="50" x2="100" y2="80" stroke="#4fc3f7" strokeWidth="0.4" opacity="0.6" />
                <line x1="135" y1="110" x2="100" y2="80" stroke="#4fc3f7" strokeWidth="0.4" opacity="0.6" />
                <line x1="100" y1="80" x2="100" y2="30" stroke="#d4a843" strokeWidth="0.3" opacity="0.5" />
                <text x="100" y="145" textAnchor="middle" fill="#94a3b8" fontSize="7" opacity="0.7" fontFamily="system-ui">Maarej — Education</text>
              </svg>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-6 pb-6 pl-6 lg:px-10 lg:pb-8 text-xs text-slate-500 tracking-widest uppercase">
          <span className="text-slate-600">معارج</span> · Knowledge Platform
        </div>
      </aside>

      {/* RIGHT — Form surface */}
      <main
        className="relative z-10 flex w-full flex-col justify-start overflow-y-auto bg-[#f8f7f0] px-6 py-8 lg:w-[45%] lg:items-center lg:justify-center lg:px-10 lg:py-12 dark:bg-[#0b1122]"
        style={{ overscrollBehavior: 'contain' }}
      >
        <div aria-hidden className="pointer-events-none absolute -start-16 -top-16 h-64 w-64 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-900/20" />

        <div className="relative z-10 w-full max-w-[420px] lg:max-w-[460px]">
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

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-[0_2px_30px_rgba(11,22,66,0.06)] backdrop-blur-xl transition-colors dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-[0_2px_30px_rgba(11,22,66,0.2)] sm:p-7 lg:p-8 p-6">
            <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-400 via-cyan-400 to-gold-400 opacity-60" />
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

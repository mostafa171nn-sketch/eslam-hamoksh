'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Wrench } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { LangToggle } from '../LangToggle';
import { SidebarTrigger } from './SidebarTrigger';
import { MobileNavPanel } from './MobileNavPanel';
import { useT } from '../../i18n';

const NAV_LINKS = [
  { href: '/', key: 'homeNav' },
  { href: '/teachers', key: 'teachersNav' },
  { href: '/centers', key: 'centers' },
] as const;

export function PublicNav() {
  const { t } = useT();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const linkBase =
    'rounded-[10px] px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200';
  const activeClass =
    'bg-sky-50 text-[#0878f8] dark:bg-slate-800 dark:text-sky-300';
  const idleClass =
    'text-slate-600 hover:bg-sky-50/70 hover:text-[#0878f8] dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-sky-300';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl shadow-[0_2px_14px_rgba(20,73,137,0.05)] dark:border-slate-800/80 dark:bg-slate-900/85 dark:shadow-none">
      <div className="mx-auto grid h-16 grid-cols-[1fr_auto_1fr] items-center px-4 sm:h-[76px] sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 justify-self-start">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1499ff] to-[#0878f8] shadow-[0_6px_16px_rgba(8,120,248,0.35)]">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{t('appName')}</span>
        </Link>

        {/* Desktop nav — the three links are centered on the viewport (grid auto column), not pushed by the brand/edge cluster */}
        <nav className="hidden items-center gap-1 justify-self-center lg:flex" aria-label={t('mainNavigation')}>
          {NAV_LINKS.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              className={`${linkBase} ${isActive(href) ? activeClass : idleClass}`}
            >
              {t(key)}
            </Link>
          ))}
        </nav>

        {/* Edge cluster: desktop toggles/login + mobile hamburger */}
        <div className="flex items-center justify-self-end">
          <div className="hidden items-center gap-0.5 lg:flex">
            <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
            <LangToggle />
            <ThemeToggle />
            <div className="ms-1.5 flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-[13px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-[#0878f8]/50 hover:text-[#0878f8] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-400/60 dark:hover:text-sky-300"
              >
                {t('login')}
              </Link>
              <Link
                href="/login"
                className="rounded-[13px] bg-gradient-to-br from-[#1499ff] to-[#0878f8] px-4 py-2 text-sm font-bold text-white shadow-[0_6px_18px_rgba(8,120,248,0.35)] transition-all duration-150 hover:shadow-[0_8px_24px_rgba(8,120,248,0.45)]"
              >
                {t('createAccount')}
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <LangToggle />
            <ThemeToggle />
            <SidebarTrigger onOpen={() => setMobileOpen(true)} expanded={mobileOpen} controlsId="mobile-nav-panel" />
          </div>
        </div>
      </div>

      {/* Mobile menu top-drop panel */}
      <MobileNavPanel open={mobileOpen} onClose={() => setMobileOpen(false)} id="mobile-nav-panel">
        <nav className="flex flex-col items-center gap-0.5 px-4 py-3">
          {NAV_LINKS.map(({ href, key }, i) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="nav-item w-full rounded-lg px-4 py-3 text-center text-sm font-medium transition-colors"
              style={{ '--i': i } as React.CSSProperties}
            >
              {t(key)}
            </Link>
          ))}
          <Link
            href="/packages"
            onClick={() => setMobileOpen(false)}
            className="nav-item w-full rounded-lg px-4 py-3 text-center text-sm font-medium transition-colors"
            style={{ '--i': NAV_LINKS.length } as React.CSSProperties}
          >
            {t('packagesNav')}
          </Link>

          <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('createAccount')}
          </p>
          <Link
            href="/register/student"
            onClick={() => setMobileOpen(false)}
            className="nav-item w-full rounded-lg px-4 py-3 text-center text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            style={{ '--i': NAV_LINKS.length + 1 } as React.CSSProperties}
          >
            {t('register')} — {t('student')}
          </Link>
          <Link
            href="/register/teacher"
            onClick={() => setMobileOpen(false)}
            className="nav-item w-full rounded-lg px-4 py-3 text-center text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            style={{ '--i': NAV_LINKS.length + 2 } as React.CSSProperties}
          >
            {t('register')} — {t('teacher')}
          </Link>
          <Link
            href="/register/parent"
            onClick={() => setMobileOpen(false)}
            className="nav-item w-full rounded-lg px-4 py-3 text-center text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            style={{ '--i': NAV_LINKS.length + 3 } as React.CSSProperties}
          >
            {t('register')} — {t('parent')}
          </Link>
          <Link
            href="/centers/register"
            onClick={() => setMobileOpen(false)}
            className="nav-item flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-center text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            style={{ '--i': NAV_LINKS.length + 4 } as React.CSSProperties}
          >
            <Wrench className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            {t('registerCenter')}
          </Link>

          <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="nav-item w-full rounded-lg bg-gradient-to-br from-[#1499ff] to-[#0878f8] px-4 py-3 text-center text-sm font-bold text-white shadow-[0_6px_18px_rgba(8,120,248,0.35)] transition-colors hover:shadow-[0_8px_24px_rgba(8,120,248,0.45)]"
            style={{ '--i': NAV_LINKS.length + 5 } as React.CSSProperties}
          >
            {t('login')}
          </Link>
        </nav>
      </MobileNavPanel>
    </header>
  );
}

export default PublicNav;
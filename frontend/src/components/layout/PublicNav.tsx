'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, GraduationCap, Wrench } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { LangToggle } from '../LangToggle';
import { useT } from '../../i18n';

const NAV_LINKS = [
  { href: '/', key: 'homeNav' },
  { href: '/teachers', key: 'teachersNav' },
  { href: '/centers', key: 'centers' },
  { href: '/student', key: 'studentPortal' },
  { href: '/parent', key: 'parent' },
] as const;

export function PublicNav() {
  const { t } = useT();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  useEffect(() => {
    if (!mobileOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [mobileOpen]);

  const activeClass =
    'text-[#0878f8] dark:text-sky-300';
  const idleClass =
    'text-slate-600 hover:text-[#0878f8] hover:bg-sky-50 dark:text-slate-300 dark:hover:text-sky-300 dark:hover:bg-slate-800';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl shadow-[0_2px_14px_rgba(20,73,137,0.05)] dark:border-slate-800/80 dark:bg-slate-900/85 dark:shadow-none">
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:h-[76px] sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1499ff] to-[#0878f8] shadow-[0_6px_16px_rgba(8,120,248,0.35)]">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{t('appName')}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 lg:flex">
          {NAV_LINKS.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-[13px] px-3.5 py-2 text-sm font-semibold transition-colors ${isActive(href) ? activeClass : idleClass}`}
            >
              {t(key)}
            </Link>
          ))}
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
        </nav>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-1 lg:hidden">
          <LangToggle />
          <ThemeToggle />
          <button
            type="button"
            className={`toggle ${mobileOpen ? 'open' : ''}`}
            onClick={() => setMobileOpen((p) => !p)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            <div id="bar1" className="bars" />
            <div id="bar2" className="bars" />
            <div id="bar3" className="bars" />
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div
          ref={menuRef}
          className="animate-slide-in border-t border-slate-200/80 bg-white/95 backdrop-blur-xl lg:hidden dark:border-slate-800/80 dark:bg-slate-900/95"
        >
          <nav className="flex flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map(({ href, key }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive(href) ? activeClass + ' bg-sky-50 dark:bg-slate-800' : idleClass}`}
              >
                {t(key)}
              </Link>
            ))}
            <Link
              href="/packages"
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive('/packages') ? activeClass + ' bg-sky-50 dark:bg-slate-800' : idleClass}`}
            >
              {t('packagesNav')}
            </Link>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('createAccount')}
            </p>
            <Link
              href="/register/student"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('register')} — {t('student')}
            </Link>
            <Link
              href="/register/teacher"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('register')} — {t('teacher')}
            </Link>
            <Link
              href="/register/parent"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('register')} — {t('parent')}
            </Link>
            <Link
              href="/centers/register"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Wrench className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              {t('registerCenter')}
            </Link>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg bg-gradient-to-br from-[#1499ff] to-[#0878f8] px-4 py-2.5 text-center text-sm font-bold text-white shadow-[0_6px_18px_rgba(8,120,248,0.35)]"
            >
              {t('login')}
            </Link>
            <Link
              href="/student"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <GraduationCap className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              {t('studentPortal')}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export default PublicNav;
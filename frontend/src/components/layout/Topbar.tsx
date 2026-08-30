'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Menu, User as UserIcon, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { Avatar } from '../ui/Avatar';
import { NotificationsBell } from './NotificationsBell';
import { ThemeToggle } from '../ThemeToggle';
import { LangToggle } from '../LangToggle';

export function Topbar({ onOpenSidebar, collapsed }: { onOpenSidebar: () => void; collapsed: boolean }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { t, lang } = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const doLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const roleLabel =
    user?.role === 'SUPER_ADMIN'
      ? t('superAdminRole')
      : user?.role === 'CENTER_ADMIN' || user?.role === 'ADMIN'
        ? t('centerAdminRole')
        : user?.role === 'TEACHER'
          ? t('teacherRole')
          : user?.role === 'STUDENT'
            ? t('studentRole')
            : t('parentRole');

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/80 sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
          aria-label={t('openMenu')}
        >
          <Menu className="h-5 w-5" />
        </button>
        <span
          className={`hidden shrink-0 items-center gap-2 ${collapsed ? 'lg:flex' : 'lg:hidden'}`}
          aria-hidden
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700">
            <BookOpen className="h-4 w-4 text-white" />
          </span>
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">معارج</span>
        </span>
        <span className="hidden items-center text-sm text-slate-500 dark:text-slate-400 sm:flex">
          <span className="me-2 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <LangToggle />
        <ThemeToggle />
        <span className="mx-1 hidden h-5 w-px bg-slate-200 dark:bg-slate-700 sm:block" aria-hidden />
        <NotificationsBell />
        <div ref={menuRef} className="relative ms-1">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={`flex items-center gap-2 rounded-full p-1 ring-1 ring-inset transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 ${
              menuOpen ? 'bg-slate-100 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700' : 'ring-transparent'
            }`}
          >
            <Avatar name={user?.fullName ?? 'User'} src={user?.photo} size="sm" />
          </button>
          {menuOpen && (
            <div className="animate-scale-in absolute end-0 top-full z-[60] mt-2 w-56 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevated-lg dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                <Avatar name={user?.fullName ?? 'User'} src={user?.photo} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.fullName}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{user?.username}</p>
                </div>
              </div>
              <span className="mt-2 ms-4 inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                {roleLabel}
              </span>
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
              >
                <UserIcon className="h-4 w-4" /> {t('myProfile')}
              </Link>
              <button
                onClick={doLogout}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" /> {t('signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
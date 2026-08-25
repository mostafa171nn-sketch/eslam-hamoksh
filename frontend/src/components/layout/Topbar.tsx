'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Menu, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { Avatar } from '../ui/Avatar';
import { NotificationsBell } from './NotificationsBell';
import { ThemeToggle } from '../ThemeToggle';
import { LangToggle } from '../LangToggle';

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
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

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
          aria-label={t('openMenu')}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">
          {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <LangToggle />
        <ThemeToggle />
        <NotificationsBell />
        <div ref={menuRef} className="relative ms-1">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={`flex items-center gap-2 rounded-full p-1 transition hover:bg-slate-100 dark:hover:bg-slate-800 ${menuOpen ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
          >
            <Avatar name={user?.fullName ?? 'User'} src={user?.photo} size="sm" />
          </button>
          {menuOpen && (
            <div className="animate-slide-in absolute end-0 top-full z-[60] mt-2 w-56 max-w-[calc(100vw-1rem)] origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-800 dark:ring-white/10">
              <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.fullName}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{user?.username}</p>
              </div>
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60"
              >
                <UserIcon className="h-4 w-4" /> {t('myProfile')}
              </Link>
              <button
                onClick={doLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
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

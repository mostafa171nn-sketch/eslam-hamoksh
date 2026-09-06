'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, Settings, User as UserIcon, LogOut, ChevronDown, GraduationCap } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../i18n';
import { useCenterBranch } from './CenterBranchContext';
import { Avatar } from '../../../components/ui/Avatar';
import { NotificationsBell } from '../../../components/layout/NotificationsBell';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { LangToggle } from '../../../components/LangToggle';

export function CenterHeader({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { user, center, logout } = useAuth();
  const { t, lang } = useT();
  const { branches, branchId, setBranches, setBranchId } = useCenterBranch();
  const [menuOpen, setMenuOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);
  const loadedBranches = useRef(false);

  useEffect(() => {
    if (loadedBranches.current) return;
    loadedBranches.current = true;
    import('../../../lib/api').then(({ api }) => {
      api
        .get<{ id: string; name: string }[]>('/center/account/branches')
        .then((res) => setBranches(res.data))
        .catch(() => setBranches([]));
    });
  }, [setBranches]);

  useEffect(() => {
    if (!menuOpen && !branchOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) setBranchOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setBranchOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, branchOpen]);

  const dateLabel = new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const selectedBranch = branches.find((b) => b.id === branchId);

  const doLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-teal-100 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
          aria-label={t('openMenu')}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Branch selector */}
        <div ref={branchRef} className="relative min-w-0">
          <button
            onClick={() => setBranchOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={branchOpen}
            className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600/10 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
              <GraduationCap className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 max-w-[11rem] truncate text-start">
              {center?.name || 'المركز'}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
          {branchOpen && (
            <div className="animate-scale-in absolute start-0 top-full z-[60] mt-2 w-64 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-elevated-lg dark:border-slate-700 dark:bg-slate-800">
              <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {selectedBranch ? selectedBranch.name : t('allBranches')}
              </p>
              <button
                onClick={() => {
                  setBranchId('');
                  setBranchOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
                {t('allBranches')}
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setBranchId(b.id);
                    setBranchOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${b.id === branchId ? 'bg-teal-600' : 'bg-slate-300'}`}
                    aria-hidden
                  />
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          <span className="text-sm text-slate-600 dark:text-slate-300">{dateLabel}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <ThemeToggle />
        <LangToggle className="hidden sm:inline-flex" />
        <Link
          href="/center/settings"
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label={t('settings')}
        >
          <Settings className="h-5 w-5" />
        </Link>
        <span className="mx-1 hidden h-5 w-px bg-slate-200 dark:bg-slate-700 sm:block" aria-hidden />
        <NotificationsBell />
        <div ref={menuRef} className="relative ms-1">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-full p-1 ring-1 ring-inset ring-transparent transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Avatar name={user?.fullName ?? 'User'} src={user?.photo} size="sm" />
          </button>
          {menuOpen && (
            <div className="animate-scale-in absolute end-0 top-full z-[60] mt-2 w-56 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevated-lg dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                <Avatar name={user?.fullName ?? 'User'} src={user?.photo} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {user?.fullName}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {t('centerAdminRole')}
                  </p>
                </div>
              </div>
<div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                  <ThemeToggle />
                  <LangToggle className="flex-1 justify-center" />
                </div>
                <Link
                  href="/center/profile"
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
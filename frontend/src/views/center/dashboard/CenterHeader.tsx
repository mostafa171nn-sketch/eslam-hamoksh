'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, Settings, User as UserIcon, LogOut, ChevronDown } from 'lucide-react';
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
  const { branches, branchId, setBranches } = useCenterBranch();
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

  useEffect(() => {
    if (branches.length > 0) return;
    import('../../../lib/api').then(({ api }) => {
      api
        .get<{ id: string; name: string }[]>('/center/account/branches')
        .then((res) => setBranches(res.data))
        .catch(() => setBranches([]));
    });
  }, [branches.length, setBranches]);

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
    <header className="mj-header sticky top-0 z-30 flex h-[72px] items-center justify-between px-4 sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="-ms-1 rounded-lg p-2 text-[color:var(--mj-muted)] transition-colors hover:bg-[color:var(--mj-wash)] lg:hidden"
          aria-label={t('openMenu')}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-[1.0625rem] font-bold leading-tight text-[color:var(--mj-ink-strong)]">
            {center?.name || t('centerDashboard')}
          </p>
          <p className="truncate text-[0.8125rem] text-[color:var(--mj-muted)]">
            {t('branchLabel', { name: selectedBranch ? selectedBranch.name : t('allBranches') })} · {dateLabel}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <ThemeToggle />
        <LangToggle className="hidden sm:inline-flex" />
        <Link
          href="/center/settings"
          className="rounded-lg p-2 text-[color:var(--mj-muted)] transition-colors hover:bg-[color:var(--mj-wash)] hover:text-[color:var(--mj-ink)]"
          aria-label={t('settings')}
        >
          <Settings className="h-5 w-5" />
        </Link>
        <span className="mx-1 hidden h-6 w-px bg-[color:var(--mj-border-soft)] sm:block" aria-hidden />
        <NotificationsBell />
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2.5 rounded-full p-1 transition-colors hover:bg-[color:var(--mj-wash)]"
          >
            <Avatar name={user?.fullName ?? 'User'} src={user?.photo} size="sm" />
            <span className="hidden text-start md:block">
              <span className="block text-sm font-bold leading-tight text-[color:var(--mj-ink-strong)]">
                {user?.fullName}
              </span>
              <span className="block text-xs text-[color:var(--mj-muted)]">{t('centerAdminRole')}</span>
            </span>
            <ChevronDown className={`hidden h-4 w-4 text-[color:var(--mj-muted-2)] md:block ${menuOpen ? 'rotate-180' : ''}`} />
          </button>
          {menuOpen && (
            <div className="absolute end-0 top-full z-[60] mt-2 w-56 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-[color:var(--mj-border)] bg-[var(--mj-surface)] py-1 shadow-lg">
              <div className="flex items-center gap-3 border-b border-[color:var(--mj-border-soft)] px-4 py-3">
                <Avatar name={user?.fullName ?? 'User'} src={user?.photo} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[color:var(--mj-ink-strong)]">{user?.fullName}</p>
                  <p className="truncate text-xs text-[color:var(--mj-muted)]">{t('centerAdminRole')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 border-b border-[color:var(--mj-border-soft)] px-4 py-3">
                <ThemeToggle />
                <LangToggle className="flex-1 justify-center" />
              </div>
              <Link
                href="/center/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[color:var(--mj-ink)] transition-colors hover:bg-[color:var(--mj-wash)]"
              >
                <UserIcon className="h-4 w-4" /> {t('myProfile')}
              </Link>
              <button
                onClick={doLogout}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[color:var(--mj-danger)] transition-colors hover:bg-[color:var(--mj-danger-soft)]"
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
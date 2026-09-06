'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  DoorOpen,
  GraduationCap,
  Group,
  Users,
  ContactRound,
  Wallet,
  Bus,
  MessagesSquare,
  Radio,
  FileBarChart,
  Globe,
  Settings,
  LogOut,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useT, type DictKey } from '../../../i18n';
import { useCenterBranch } from './CenterBranchContext';

interface NavItem {
  to: string;
  labelKey: DictKey;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/center', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
  { to: '/center/classrooms', labelKey: 'classrooms', icon: DoorOpen },
  { to: '/center/teachers', labelKey: 'teachers', icon: GraduationCap },
  { to: '/center/groups', labelKey: 'groups', icon: Group },
  { to: '/center/students', labelKey: 'students', icon: Users },
  { to: '/center/employees', labelKey: 'employees', icon: ContactRound },
  { to: '/center/finance', labelKey: 'finance', icon: Wallet },
  { to: '/center/transport', labelKey: 'transport', icon: Bus },
  { to: '/center/communications', labelKey: 'communications', icon: MessagesSquare },
  { to: '/center/broadcast', labelKey: 'broadcast', icon: Radio },
  { to: '/center/reports', labelKey: 'reports', icon: FileBarChart },
  { to: '/center/profile', labelKey: 'centerPage', icon: Globe },
  { to: '/center/settings', labelKey: 'settings', icon: Settings },
];

function isActive(pathname: string | null, item: NavItem): boolean {
  return item.end ? pathname === item.to : (pathname ?? '').startsWith(item.to);
}

export function CenterSidebar({
  open,
  onClose,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t, dir } = useT();
  const { branches, branchId, setBranches, setBranchId } = useCenterBranch();
  const [branchOpen, setBranchOpen] = useState(false);
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
    if (!branchOpen) return;
    const onClick = (e: MouseEvent) => {
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) setBranchOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBranchOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [branchOpen]);

  if (!user) return null;

  const selectedBranch = branches.find((b) => b.id === branchId);
  const sidebarDir = dir === 'rtl' ? 'right-0' : 'left-0';

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`mj-sidebar fixed inset-y-0 z-50 flex w-[280px] flex-col transition-transform duration-300 ease-out-expo lg:translate-x-0 ${sidebarDir} ${
          open ? 'translate-x-0' : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'
        }`}
        aria-label={t('mainNavigation')}
      >
        {/* Brand */}
        <div className="flex shrink-0 items-start justify-between px-4 pb-3 pt-5">
          <div className="min-w-0 flex-1">
            <p className="text-[1.375rem] font-bold leading-tight text-[color:var(--mj-ink-strong)]">
              معارج
            </p>
            <p className="mt-0.5 text-[0.8125rem] font-medium text-[color:var(--mj-muted)]">
              {t('centerDashboard')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[color:var(--mj-muted)] transition-colors hover:bg-[color:var(--mj-wash)] hover:text-[color:var(--mj-ink)] lg:hidden"
            aria-label={t('closeMenu')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current branch */}
        <div ref={branchRef} className="relative px-4 pb-3">
          <p className="mb-1.5 text-[0.75rem] font-bold text-[color:var(--mj-muted)]">{t('currentBranch')}</p>
          <button
            type="button"
            onClick={() => setBranchOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={branchOpen}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-[color:var(--mj-border)] bg-[color:var(--mj-surface-2)] px-2.5 py-2 text-start text-sm font-semibold text-[color:var(--mj-ink-strong)] transition-colors hover:border-[color:var(--mj-accent)]"
          >
            <span className="truncate">{selectedBranch ? selectedBranch.name : t('allBranches')}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-[color:var(--mj-muted-2)] transition-transform ${branchOpen ? 'rotate-180' : ''}`} />
          </button>
          {branchOpen && (
            <div className="absolute start-4 end-4 top-full z-[60] mt-1 overflow-hidden rounded-lg border border-[color:var(--mj-border)] bg-[var(--mj-surface)] py-1 shadow-lg">
              {branches.length === 0 && (
                <p className="px-3 py-2 text-sm text-[color:var(--mj-muted)]">{t('noBranchesAvailable')}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setBranchId('');
                  setBranchOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition-colors hover:bg-[color:var(--mj-wash)] ${branchId === '' ? 'font-bold text-[color:var(--mj-accent)]' : 'text-[color:var(--mj-ink)]'}`}
              >
                {t('allBranches')}
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBranchId(b.id);
                    setBranchOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition-colors hover:bg-[color:var(--mj-wash)] ${b.id === branchId ? 'font-bold text-[color:var(--mj-accent)]' : 'text-[color:var(--mj-ink)]'}`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mx-4 mb-2 h-px bg-[color:var(--mj-border-soft)]" aria-hidden />

        {/* Nav */}
        <nav className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 py-2">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    href={item.to}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                      active
                        ? 'bg-[color:var(--mj-accent-soft)] text-[color:var(--mj-accent)]'
                        : 'text-[color:var(--mj-muted)] hover:bg-[color:var(--mj-wash)] hover:text-[color:var(--mj-ink-strong)]'
                    }`}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-[color:var(--mj-accent)]"
                      />
                    )}
                    <Icon
                      className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-[color:var(--mj-accent)]' : 'stroke-[color:var(--mj-muted-2)]'}`}
                      strokeWidth={2}
                    />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-[color:var(--mj-border-soft)] px-4 py-4">
          <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-[color:var(--mj-wash)] px-3 py-2">
            <span className="mj-avatar mj-avatar--sm" aria-hidden>
              {user.fullName?.trim().charAt(0) || '?'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[color:var(--mj-ink-strong)]">{user.fullName}</p>
              <p className="truncate text-xs text-[color:var(--mj-muted)]">{t('centerAdminRole')}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[color:var(--mj-danger)] transition-colors hover:bg-[color:var(--mj-danger-soft)]"
          >
            <LogOut className="h-4 w-4" />
            {t('signOut')}
          </button>
        </div>
      </aside>
    </>
  );
}
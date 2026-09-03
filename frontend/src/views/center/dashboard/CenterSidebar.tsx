'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  DoorOpen,
  Coins,
  Users,
  GraduationCap,
  Group,
  FileBarChart,
  Settings,
  LogOut,
  X,
  Calendar,
  TrendingUp,
  CalendarCheck,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useT, type DictKey } from '../../../i18n';
import { Avatar } from '../../../components/ui/Avatar';

interface NavItem {
  to: string;
  labelKey: DictKey;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  end?: boolean;
}

type NavGroup =
  | 'general'
  | 'management'
  | 'operations'
  | 'system';

const NAV_GROUPS: Record<NavGroup, { titleKey: DictKey; items: NavItem[] }> = {
  general: {
    titleKey: 'general',
    items: [
      { to: '/center', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
      { to: '/center/classrooms', labelKey: 'classrooms', icon: DoorOpen },
      { to: '/center/schedule', labelKey: 'schedule', icon: Calendar },
      { to: '/center/analytics', labelKey: 'analytics', icon: TrendingUp },
    ],
  },
  management: {
    titleKey: 'management',
    items: [
      { to: '/center/students', labelKey: 'students', icon: Users },
      { to: '/center/teachers', labelKey: 'teachers', icon: GraduationCap },
      { to: '/center/employees', labelKey: 'employees', icon: Group },
    ],
  },
  operations: {
    titleKey: 'operations',
    items: [
      { to: '/center/payments', labelKey: 'payments', icon: Coins },
      { to: '/center/attendance', labelKey: 'attendance', icon: CalendarCheck },
      { to: '/center/reports', labelKey: 'reports', icon: FileBarChart },
    ],
  },
  system: {
    titleKey: 'system',
    items: [
      { to: '/center/profile', labelKey: 'centerSettings', icon: Settings },
    ],
  },
};

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
  const { user, center } = useAuth();
  const { t, dir } = useT();

  if (!user) return null;

  const sidebarDir = dir === 'rtl' ? 'right-0' : 'left-0';

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 z-50 flex w-72 flex-col bg-gradient-to-b from-teal-800 via-teal-900 to-teal-950 text-teal-50 shadow-2xl transition-transform duration-300 ease-out-expo ${sidebarDir} ${
          open ? 'translate-x-0' : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'
        } lg:translate-x-0`}
        aria-label={t('mainNavigation')}
      >
        {/* Brand */}
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-white/10 px-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-inset ring-white/20">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold tracking-tight text-white">
              {center?.name || 'المركز'}
            </p>
            <p className="truncate text-[11px] font-medium text-teal-200/80">
              {t('centerDashboard')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ms-auto rounded-lg p-1.5 text-teal-200/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label={t('closeMenu')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          {Object.entries(NAV_GROUPS).map(([groupKey, group]) => (
            <div key={groupKey} className="mb-4">
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-teal-300/60">
                {t(group.titleKey)}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(pathname, item);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      href={item.to}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                        active
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-teal-100/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute inset-y-2 start-0 w-1 rounded-full bg-teal-300"
                        />
                      )}
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 ${
                          active ? 'text-teal-200' : 'text-teal-300/70'
                        }`}
                      />
                      <span className="truncate">{t(item.labelKey)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 px-4 py-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-inset ring-white/10">
            <Avatar name={user.fullName} src={user.photo} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
              <p className="truncate text-[11px] text-teal-200/70">{t('centerAdminRole')}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500/80"
          >
            <LogOut className="h-4 w-4" />
            {t('signOut')}
          </button>
        </div>
      </aside>
    </>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  FileText,
  Users,
  Receipt,
  ScanLine,
  GraduationCap,
} from 'lucide-react';
import type { Role } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { useT, type Dict } from '../../i18n';

interface NavItem {
  to: string;
  labelKey: keyof Dict;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  end?: boolean;
}

const NAVS: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [
    { to: '/admin', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', labelKey: 'users', icon: Users },
    { to: '/admin/teachers', labelKey: 'teachersNav', icon: GraduationCap },
    { to: '/admin/payments', labelKey: 'payments', icon: Receipt },
  ],
  ADMIN: [
    { to: '/admin', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', labelKey: 'users', icon: Users },
    { to: '/admin/teachers', labelKey: 'teachersNav', icon: GraduationCap },
    { to: '/admin/payments', labelKey: 'payments', icon: Receipt },
  ],
  CENTER_ADMIN: [
    { to: '/admin', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', labelKey: 'users', icon: Users },
    { to: '/admin/teachers', labelKey: 'teachersNav', icon: GraduationCap },
    { to: '/admin/payments', labelKey: 'payments', icon: Receipt },
  ],
  TEACHER: [
    { to: '/teacher', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
    { to: '/teacher/students', labelKey: 'myStudents', icon: Users },
    { to: '/teacher/lessons', labelKey: 'lessons', icon: Calendar },
    { to: '/teacher/payments', labelKey: 'payments', icon: Receipt },
  ],
  STUDENT: [
    { to: '/student', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
    { to: '/student/lessons', labelKey: 'myLessons', icon: Calendar },
    { to: '/student/assignments', labelKey: 'homework', icon: ClipboardList },
    { to: '/student/exams', labelKey: 'exams', icon: FileText },
  ],
  PARENT: [
    { to: '/parent', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
    { to: '/parent/children', labelKey: 'myChildren', icon: Users },
    { to: '/parent/attendance', labelKey: 'attendance', icon: ScanLine },
    { to: '/parent/payments', labelKey: 'payments', icon: Receipt },
  ],
};

/** Primary-actions bottom navigation — mobile only (lg:hidden). */
export function BottomNav() {
  const { user } = useAuth();
  const { t } = useT();
  const pathname = usePathname();
  if (!user) return null;
  const items = NAVS[user.role];

  return (
    <nav
      aria-label={t('mainNavigation')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {items.map((item) => {
          const active = item.end
            ? pathname === item.to
            : (pathname ?? '').startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              href={item.to}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2.5 transition-colors duration-150 ${
                active ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-brand'
                    : 'bg-transparent'
                }`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
              </span>
              <span className="max-w-full truncate text-[10px] font-medium">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
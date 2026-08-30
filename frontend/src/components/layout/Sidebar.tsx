'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Building2,
  Calendar,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Logs,
  Menu,
  QrCode,
  Receipt,
  ScanLine,
  Settings,
  Users,
  X,
} from 'lucide-react';
import type { Role } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { useT, type Dict } from '../../i18n';

interface NavItem {
  to: string;
  labelKey: keyof Dict;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

const NAVS: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [
    { to: '/admin', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', labelKey: 'users', icon: Users },
    { to: '/admin/centers', labelKey: 'manageCenters', icon: Building2 },
    { to: '/admin/teachers', labelKey: 'teachersNav', icon: GraduationCap },
    { to: '/admin/subjects', labelKey: 'subjects', icon: BookOpen },
    { to: '/admin/grades', labelKey: 'gradesNav', icon: FileText },
    { to: '/admin/locations', labelKey: 'branches', icon: Menu },
    { to: '/admin/analytics', labelKey: 'analytics', icon: Logs },
    { to: '/admin/reports', labelKey: 'reports', icon: ClipboardList },
    { to: '/admin/attendance', labelKey: 'attendance', icon: ScanLine },
    { to: '/admin/payments', labelKey: 'payments', icon: Receipt },
    { to: '/admin/center', labelKey: 'centerSettings', icon: Building2 },
    { to: '/admin/logs', labelKey: 'activityLogs', icon: Logs },
  ],
  ADMIN: [
    { to: '/admin', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', labelKey: 'users', icon: Users },
    { to: '/admin/teachers', labelKey: 'teachersNav', icon: GraduationCap },
    { to: '/admin/subjects', labelKey: 'subjects', icon: BookOpen },
    { to: '/admin/grades', labelKey: 'gradesNav', icon: FileText },
    { to: '/admin/locations', labelKey: 'branches', icon: Menu },
    { to: '/admin/analytics', labelKey: 'analytics', icon: Logs },
    { to: '/admin/reports', labelKey: 'reports', icon: ClipboardList },
    { to: '/admin/attendance', labelKey: 'attendance', icon: ScanLine },
    { to: '/admin/payments', labelKey: 'payments', icon: Receipt },
    { to: '/admin/center', labelKey: 'centerSettings', icon: Building2 },
    { to: '/admin/logs', labelKey: 'activityLogs', icon: Logs },
  ],
  CENTER_ADMIN: [
    { to: '/admin', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', labelKey: 'users', icon: Users },
    { to: '/admin/teachers', labelKey: 'teachersNav', icon: GraduationCap },
    { to: '/admin/subjects', labelKey: 'subjects', icon: BookOpen },
    { to: '/admin/grades', labelKey: 'gradesNav', icon: FileText },
    { to: '/admin/locations', labelKey: 'branches', icon: Menu },
    { to: '/admin/analytics', labelKey: 'analytics', icon: Logs },
    { to: '/admin/reports', labelKey: 'reports', icon: ClipboardList },
    { to: '/admin/attendance', labelKey: 'attendance', icon: ScanLine },
    { to: '/admin/payments', labelKey: 'payments', icon: Receipt },
    { to: '/admin/center', labelKey: 'centerSettings', icon: Building2 },
    { to: '/admin/logs', labelKey: 'activityLogs', icon: Logs },
  ],
  TEACHER: [
    { to: '/teacher', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
    { to: '/teacher/students', labelKey: 'myStudents', icon: Users },
    { to: '/teacher/lessons', labelKey: 'lessons', icon: Calendar },
    { to: '/teacher/attendance', labelKey: 'attendance', icon: ScanLine },
    { to: '/teacher/assignments', labelKey: 'assignments', icon: ClipboardList },
    { to: '/teacher/exams', labelKey: 'exams', icon: FileText },
    { to: '/teacher/availability', labelKey: 'availability', icon: Settings },
    { to: '/teacher/payments', labelKey: 'payments', icon: Receipt },
    { to: '/teacher/payment-settings', labelKey: 'paymentSettings', icon: CreditCard },
  ],
  STUDENT: [
    { to: '/student', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
    { to: '/centers', labelKey: 'centers', icon: Building2 },
    { to: '/teachers', labelKey: 'browseTeachers', icon: GraduationCap },
    { to: '/student/lessons', labelKey: 'myLessons', icon: Calendar },
    { to: '/student/followed', labelKey: 'followedCenters', icon: Building2 },
    { to: '/student/attendance', labelKey: 'myAttendance', icon: Calendar },
    { to: '/student/qr', labelKey: 'checkInQr', icon: QrCode },
    { to: '/student/payments', labelKey: 'payments', icon: Receipt },
    { to: '/student/assignments', labelKey: 'homework', icon: ClipboardList },
    { to: '/student/exams', labelKey: 'exams', icon: FileText },
    { to: '/student/results', labelKey: 'myResults', icon: Logs },
    { to: '/notifications', labelKey: 'notifications', icon: Logs },
  ],
  PARENT: [
    { to: '/parent', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
    { to: '/parent/children', labelKey: 'myChildren', icon: Users },
    { to: '/parent/attendance', labelKey: 'myAttendance', icon: Calendar },
    { to: '/parent/payments', labelKey: 'payments', icon: Receipt },
  ],
};

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useT();
  return (
    <nav className="space-y-0.5 px-3">
      {items.map((item) => {
        const active = item.end
          ? pathname === item.to
          : (pathname ?? '').startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            href={item.to}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
              active
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className={`h-[18px] w-[18px] transition-colors duration-150 ${
              active ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'
            }`} />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { user, center } = useAuth();
  const { t } = useT();
  if (!user) return null;
  const items = NAVS[user.role];

  const roleLabel =
    user.role === 'SUPER_ADMIN'
      ? t('superAdminRole')
      : user.role === 'CENTER_ADMIN' || user.role === 'ADMIN'
        ? t('centerAdminRole')
        : user.role === 'TEACHER'
          ? t('teacherRole')
          : user.role === 'STUDENT'
            ? t('studentRole')
            : t('parentRole');

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 start-0 z-50 flex w-64 flex-col bg-slate-900 transition-transform duration-300 ease-out-expo lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 shadow-brand">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">معارج</span>
          </Link>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden" aria-label={t('closeMenu')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="mt-2 flex-1 overflow-y-auto pb-6">
          <NavLinks items={items} onNavigate={onClose} />
        </div>

        {/* User info */}
        <div className="border-t border-white/10 px-5 py-4">
          {center && (
            <p className="mb-1 truncate text-xs font-medium text-brand-400">{center.name}</p>
          )}
          <p className="text-xs font-medium text-slate-500">{roleLabel}</p>
          <p className="mt-0.5 truncate text-sm font-medium text-white">{user.fullName}</p>
        </div>
      </aside>
    </>
  );
}

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
    { to: '/student/lessons', labelKey: 'myLessons', icon: Calendar },
    { to: '/student/teachers', labelKey: 'myTeachers', icon: Users },
    { to: '/student/attendance', labelKey: 'myAttendance', icon: Calendar },
    { to: '/student/qr', labelKey: 'checkInQr', icon: QrCode },
    { to: '/student/payments', labelKey: 'payments', icon: Receipt },
    { to: '/student/assignments', labelKey: 'homework', icon: ClipboardList },
    { to: '/student/exams', labelKey: 'exams', icon: FileText },
    { to: '/student/results', labelKey: 'myResults', icon: Logs },
    { to: '/teachers', labelKey: 'browseTeachers', icon: GraduationCap },
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
    <nav className="space-y-1 px-3">
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
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-white/10 text-white'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
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
        <div className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 transition-transform lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <BookOpen className="h-[18px] w-[18px]" />
            </div>
            <span className="text-base font-bold text-white">معارچ</span>
          </Link>
          <button onClick={onClose} className="text-slate-400 hover:text-white lg:hidden" aria-label={t('closeMenu')}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 flex-1 overflow-y-auto pb-6">
          <NavLinks items={items} onNavigate={onClose} />
        </div>
        <div className="border-t border-white/10 px-5 py-4">
          {center && (
            <p className="mb-1 truncate text-xs font-medium text-brand-400">{center.name}</p>
          )}
          <p className="text-xs font-medium text-slate-400">{roleLabel}</p>
          <p className="mt-0.5 truncate text-sm font-medium text-white">{user.fullName}</p>
        </div>
      </aside>
    </>
  );
}

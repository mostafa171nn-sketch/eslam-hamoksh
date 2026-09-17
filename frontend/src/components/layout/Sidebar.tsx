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
  Lock,
  Logs,
  MapPin,
  QrCode,
  Receipt,
  ScanLine,
  Settings,
  Users,
  X,
  Bell,
} from 'lucide-react';
import type { Role } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { useT, type Dict } from '../../i18n';
import { Avatar } from '../ui/Avatar';

interface NavItem {
  to: string;
  labelKey: keyof Dict;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

type GroupKey = 'overview' | 'learn' | 'explore' | 'teach' | 'manage' | 'operations' | 'settings';

const GROUP_LABEL: Record<GroupKey, keyof Dict> = {
  overview: 'navOverview',
  learn: 'navLearn',
  explore: 'navExplore',
  teach: 'navTeach',
  manage: 'navManage',
  operations: 'navOperations',
  settings: 'navSettings',
};

const STUDENT_LEARN: NavItem[] = [
  { to: '/student/lessons', labelKey: 'myLessons', icon: Calendar },
  { to: '/student/attendance', labelKey: 'myAttendance', icon: ScanLine },
  { to: '/student/qr', labelKey: 'checkInQr', icon: QrCode },
  { to: '/student/assignments', labelKey: 'homework', icon: ClipboardList },
  { to: '/student/exams', labelKey: 'exams', icon: FileText },
  { to: '/student/results', labelKey: 'myResults', icon: Logs },
];

const STUDENT_EXPLORE: NavItem[] = [
  { to: '/centers', labelKey: 'centers', icon: Building2 },
  { to: '/teachers', labelKey: 'browseTeachers', icon: GraduationCap },
  { to: '/student/followed', labelKey: 'followedCenters', icon: Building2 },
];

const TEACHER_TEACH: NavItem[] = [
  { to: '/teacher/students', labelKey: 'myStudents', icon: Users },
  { to: '/teacher/lessons', labelKey: 'lessons', icon: Calendar },
  { to: '/teacher/attendance', labelKey: 'attendance', icon: ScanLine },
  { to: '/teacher/assignments', labelKey: 'assignments', icon: ClipboardList },
  { to: '/teacher/exams', labelKey: 'exams', icon: FileText },
];

const ADMINS_MANAGE: NavItem[] = [
  { to: '/admin/users', labelKey: 'users', icon: Users },
  { to: '/admin/teachers', labelKey: 'teachersNav', icon: GraduationCap },
  { to: '/admin/subjects', labelKey: 'subjects', icon: BookOpen },
  { to: '/admin/grades', labelKey: 'gradesNav', icon: FileText },
  { to: '/admin/locations', labelKey: 'branches', icon: MapPin },
];

const ADMINS_OPERATIONS: NavItem[] = [
  { to: '/admin/analytics', labelKey: 'analytics', icon: Logs },
  { to: '/admin/reports', labelKey: 'reports', icon: ClipboardList },
  { to: '/admin/attendance', labelKey: 'attendance', icon: ScanLine },
  { to: '/admin/payments', labelKey: 'payments', icon: Receipt },
  { to: '/admin/logs', labelKey: 'activityLogs', icon: Logs },
];

const NAVS: Record<Role, Array<{ group: GroupKey; items: NavItem[] }>> = {
  SUPER_ADMIN: [
    { group: 'overview', items: [{ to: '/admin', labelKey: 'dashboard', icon: LayoutDashboard, end: true }] },
    { group: 'manage', items: ADMINS_MANAGE },
    {
      group: 'operations',
      items: [
        { to: '/admin/centers', labelKey: 'manageCenters', icon: Building2 },
        ...ADMINS_OPERATIONS,
      ],
    },
    { group: 'settings', items: [{ to: '/admin/center', labelKey: 'centerSettings', icon: Settings }] },
  ],
  ADMIN: [
    { group: 'overview', items: [{ to: '/admin', labelKey: 'dashboard', icon: LayoutDashboard, end: true }] },
    { group: 'manage', items: ADMINS_MANAGE },
    { group: 'operations', items: ADMINS_OPERATIONS },
    { group: 'settings', items: [{ to: '/admin/center', labelKey: 'centerSettings', icon: Settings }] },
  ],
  CENTER_ADMIN: [
    { group: 'overview', items: [{ to: '/admin', labelKey: 'dashboard', icon: LayoutDashboard, end: true }] },
    { group: 'manage', items: ADMINS_MANAGE },
    { group: 'operations', items: ADMINS_OPERATIONS },
    { group: 'settings', items: [{ to: '/admin/center', labelKey: 'centerSettings', icon: Settings }] },
  ],
  TEACHER: [
    { group: 'overview', items: [{ to: '/teacher', labelKey: 'dashboard', icon: LayoutDashboard, end: true }] },
    { group: 'teach', items: TEACHER_TEACH },
    {
      group: 'manage',
      items: [
        { to: '/teacher/availability', labelKey: 'availability', icon: Settings },
        { to: '/teacher/payments', labelKey: 'payments', icon: Receipt },
        { to: '/teacher/payment-settings', labelKey: 'paymentSettings', icon: CreditCard },
      ],
    },
  ],
  STUDENT: [
    { group: 'overview', items: [{ to: '/student', labelKey: 'dashboard', icon: LayoutDashboard, end: true }] },
    { group: 'learn', items: STUDENT_LEARN },
    { group: 'explore', items: STUDENT_EXPLORE },
    {
      group: 'manage',
      items: [
        { to: '/student/payments', labelKey: 'payments', icon: Receipt },
        { to: '/notifications', labelKey: 'notifications', icon: Bell },
      ],
    },
  ],
  PARENT: [
    { group: 'overview', items: [{ to: '/parent', labelKey: 'dashboard', icon: LayoutDashboard, end: true }] },
    {
      group: 'learn',
      items: [
        { to: '/parent/children', labelKey: 'myChildren', icon: Users },
        { to: '/parent/attendance', labelKey: 'myAttendance', icon: ScanLine },
      ],
    },
    {
      group: 'manage',
      items: [
        { to: '/parent/payments', labelKey: 'payments', icon: Receipt },
        { to: '/notifications', labelKey: 'notifications', icon: Bell },
      ],
    },
  ],
};

function isActive(pathname: string | null, item: NavItem): boolean {
  return item.end ? pathname === item.to : (pathname ?? '').startsWith(item.to);
}

function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useT();
  const active = isActive(pathname, item);
  const Icon = item.icon;
  const label = t(item.labelKey);

  return (
    <Link
      key={item.to}
      href={item.to}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center rounded-lg text-sm font-medium transition-all duration-150 px-3 py-2 gap-3 ${
        collapsed ? 'lg:justify-center lg:px-0 lg:py-2.5' : ''
      } ${active ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
    >
      {active && (
        <span aria-hidden className="absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-brand-400" />
      )}
      <Icon
        className={`h-[18px] w-[18px] shrink-0 transition-colors duration-150 ${
          active ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'
        }`}
      />
      <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{label}</span>
    </Link>
  );
}

export function Sidebar({
  mobileOpen,
  onClose,
  collapsed,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
}) {
  const { user, center } = useAuth();
  const { t, dir } = useT();
  if (!user) return null;
  const groups = NAVS[user.role];

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
        className={`fixed inset-y-0 start-0 z-50 flex w-64 flex-col overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 transition-[width] duration-300 ease-out-expo lg:translate-x-0 ${
          collapsed ? 'lg:w-20' : 'lg:w-64'
        } ${mobileOpen ? 'translate-x-0' : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'}`}
      >
        <div aria-hidden className="pointer-events-none absolute -start-16 -top-16 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />

        {/* Brand */}
        <div className={`relative flex h-16 shrink-0 items-center border-b border-white/5 justify-between px-5 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <Link href="/" className="flex items-center gap-2.5" title={t('appName')}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-brand">
              <BookOpen className="h-5 w-5 text-white" aria-hidden />
            </span>
            <span className={`truncate text-lg font-bold tracking-tight text-white ${collapsed ? 'lg:hidden' : ''}`}>
              معارج
            </span>
          </Link>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden" aria-label={t('closeMenu')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label={t('mainNavigation')} className="relative mt-2 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
          {groups.map((group) => (
            <div key={group.group} className="mb-1">
              <div
                aria-hidden
                className={`mx-auto my-2 h-px w-8 rounded bg-white/10 ${collapsed ? 'hidden lg:block' : 'hidden'}`}
              />
              <p className={`px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${collapsed ? 'lg:hidden' : ''}`}>
                {t(GROUP_LABEL[group.group])}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.to} item={item} collapsed={collapsed} onNavigate={onClose} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="relative shrink-0 border-t border-white/5 px-3 py-3">
          <div className={`flex items-center gap-2.5 ${collapsed ? 'lg:justify-center' : ''}`}>
            <Avatar name={user.fullName} src={user.photo} size="sm" className="ring-2 ring-white/10" />
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              {center && <p className="truncate text-[11px] font-medium text-brand-400">{center.name}</p>}
              <p className="truncate text-sm font-medium text-white">{user.fullName}</p>
              <p className="truncate text-[11px] text-slate-500">{roleLabel}</p>
            </div>
          </div>
          <div className={`mt-2 flex items-center gap-1.5 px-1 text-[10px] text-slate-600 ${collapsed ? 'lg:hidden' : ''}`}>
            <Lock className="h-3 w-3" aria-hidden />
            <span>{t('secureAppLabel')}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
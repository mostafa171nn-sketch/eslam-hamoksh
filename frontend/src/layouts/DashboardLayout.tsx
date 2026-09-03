'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '../../src/components/layout/Sidebar';
import { Topbar } from '../../src/components/layout/Topbar';
import { BottomNav } from '../../src/components/layout/BottomNav';
import { PageBackButton } from '../../src/components/layout/PageBackButton';
import { CenterDashboardShell } from '../../src/views/center/dashboard/CenterDashboardShell';

const SIDEBAR_STORAGE_KEY = 'maarech-sidebar';

const NO_BACK = new Set([
  '/student',
  '/teacher',
  '/parent',
  '/admin',
  '/dashboard',
  '/profile',
  '/notifications',
]);

function fallbackFor(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length <= 1) {
    const seg = parts[0];
    if (seg === 'student' || seg === 'teacher' || seg === 'parent' || seg === 'admin') return `/${seg}`;
    return '/';
  }
  parts.pop();
  return '/' + parts.join('/');
}

function initialCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const pathname = usePathname();
  const showBack = pathname ? !NO_BACK.has(pathname) : false;

  // The Center account dashboard uses its own scoped shell (right-side teal
  // sidebar + custom header). Only /center routes are affected; every other
  // role continues to render the shared layout below unchanged.
  if (pathname?.startsWith('/center')) {
    return <CenterDashboardShell>{children}</CenterDashboardShell>;
  }

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-900">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-0 h-64 bg-gradient-to-b from-brand-100/40 via-transparent to-transparent dark:from-brand-950/20" />
      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className={`relative transition-[padding-inline-start] duration-300 ease-out-expo ${collapsed ? 'lg:ps-20' : 'lg:ps-64'}`}>
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} collapsed={collapsed} />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:pb-8">
          <div className="pb-24 lg:pb-0">
            {showBack && (
              <div className="mb-4">
                <PageBackButton fallback={fallbackFor(pathname ?? '/')} />
              </div>
            )}
            <div key={pathname} className="animate-fade-in">
              {children}
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
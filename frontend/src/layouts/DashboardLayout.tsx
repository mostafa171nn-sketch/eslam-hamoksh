'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { PageBackButton } from '../components/layout/PageBackButton';

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
    // top-level dashboard pages: back to their role dashboard
    const seg = parts[0];
    if (seg === 'student' || seg === 'teacher' || seg === 'parent' || seg === 'admin') return `/${seg}`;
    return '/';
  }
  parts.pop();
  return '/' + parts.join('/');
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const showBack = pathname ? !NO_BACK.has(pathname) : false;

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-900">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          {showBack && (
            <div className="mb-4">
              <PageBackButton fallback={fallbackFor(pathname ?? '/')} />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

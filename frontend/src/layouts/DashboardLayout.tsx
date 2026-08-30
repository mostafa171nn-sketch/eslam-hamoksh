'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '../../src/components/layout/Sidebar';
import { Topbar } from '../../src/components/layout/Topbar';
import { BottomNav } from '../../src/components/layout/BottomNav';
import { PageBackButton } from '../../src/components/layout/PageBackButton';

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

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const showBack = pathname ? !NO_BACK.has(pathname) : false;

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-900">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ps-64">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:pb-8">
          <div className="pb-24 lg:pb-0">
            {showBack && (
              <div className="mb-4">
                <PageBackButton fallback={fallbackFor(pathname ?? '/')} />
              </div>
            )}
            <div className="animate-fade-in">
              {children}
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

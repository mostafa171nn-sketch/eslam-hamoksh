'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Sidebar, AccountNavContent } from '../../src/components/layout/Sidebar';
import { JourneySidebar } from '../../src/components/layout/JourneySidebar';
import { StudentJourneyFab, JOURNEY_STORAGE_KEY } from '../../src/components/student/StudentJourneyFab';
import { Topbar } from '../../src/components/layout/Topbar';
import { BottomNav } from '../../src/components/layout/BottomNav';
import { PageBackButton } from '../../src/components/layout/PageBackButton';
import { RouteTransition } from '../../src/components/RouteTransition';
import { MobileNavPanel } from '../../src/components/layout/MobileNavPanel';
import { useAuth } from '../../src/context/AuthContext';

const SIDEBAR_STORAGE_KEY = 'maarech-sidebar';

// The center dashboard shell is heavy (feat reports/tables/charts) and only
// used by center admins, so it is code-split and rendered only on demand.
const CenterDashboardShell = dynamic(
  () =>
    import('../../src/views/center/dashboard/CenterDashboardShell').then(
      (m) => m.CenterDashboardShell,
    ),
  {
    ssr: false,
    loading: () => <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />,
  },
);

const NO_BACK = new Set([
  '/student',
  '/student/account',
  '/student/finance',
  '/student/journey',
  '/teacher',
  '/parent',
  '/admin',
  '/dashboard',
  '/profile',
  '/notifications',
]);

/** Routes where the Journey Sidebar stays visible while in Journey Mode. */
function isJourneyRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === '/student' || pathname === '/student/learning' || pathname === '/student/schedule' || pathname === '/student/finance' || pathname === '/student/account') return true;
  return pathname === '/student/journey' || pathname.startsWith('/student/journey/');
}

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
  const { user } = useAuth();
  const showBack = pathname ? !NO_BACK.has(pathname) : false;
  const isStudent = user?.role === 'STUDENT';

  // Journey Mode: entering via the "My learning journey" FAB swaps the normal
  // student sidebar for the 4-item journey sidebar. The flag lives in
  // sessionStorage (SSR-safe, no search params), and leaving the journey
  // routes exits the mode automatically.
  const [journeyOn, setJourneyOn] = useState(false);
  useEffect(() => {
    try {
      const flag = window.sessionStorage.getItem(JOURNEY_STORAGE_KEY) === '1';
      if (!isJourneyRoute(pathname)) {
        if (flag) window.sessionStorage.removeItem(JOURNEY_STORAGE_KEY);
        setJourneyOn(false);
      } else {
        setJourneyOn(flag || pathname === '/student/journey' || (pathname ?? '').startsWith('/student/journey/'));
      }
    } catch {
      setJourneyOn(pathname === '/student/journey');
    }
  }, [pathname]);

  const inJourneyMode = isStudent && !!pathname?.startsWith('/student') && journeyOn;
  // The shared /profile account page uses this shell too; students keep the CTA there.
  const onStudentSurface = pathname === '/profile' || !!pathname?.startsWith('/student');
  const showJourneyFab = isStudent && onStudentSurface && !inJourneyMode;

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
      {inJourneyMode ? (
        <JourneySidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      ) : (
        <>
          <Sidebar
            mobileOpen={isStudent ? false : sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            collapsed={collapsed}
          />
          {isStudent && (
            <MobileNavPanel id="account-sidebar" open={sidebarOpen} onClose={() => setSidebarOpen(false)} tone="dark">
              <AccountNavContent collapsed={false} onNavigate={() => setSidebarOpen(false)} />
            </MobileNavPanel>
          )}
        </>
      )}
      <div className={`relative transition-[padding-inline-start] duration-300 ease-out-expo ${collapsed && !inJourneyMode ? 'lg:ps-20' : 'lg:ps-64'}`}>
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} collapsed={collapsed} onToggleCollapse={toggleCollapse} sidebarOpen={sidebarOpen} />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:pb-8">
          <div className="pb-24 lg:pb-0">
            {showBack && (
              <div className="mb-4">
                <PageBackButton fallback={fallbackFor(pathname ?? '/')} />
              </div>
            )}
            <RouteTransition mode="shell">{children}</RouteTransition>
          </div>
        </main>
        <BottomNav />
      </div>
      {showJourneyFab && <StudentJourneyFab />}
    </div>
  );
}
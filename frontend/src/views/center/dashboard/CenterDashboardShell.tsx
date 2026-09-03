'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { CenterSidebar } from './CenterSidebar';
import { CenterHeader } from './CenterHeader';

export function CenterDashboardShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const doLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-900">
      <CenterSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={doLogout}
      />
      <div className="lg:ps-72">
        <CenterHeader onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div key={pathname} className="animate-fade-in pb-24 lg:pb-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

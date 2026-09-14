'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { CenterSidebar } from './CenterSidebar';
import { CenterHeader } from './CenterHeader';
import { CenterBranchProvider } from './CenterBranchContext';
import { RouteTransition } from '../../../components/RouteTransition';

export function CenterDashboardShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();

  const doLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <CenterBranchProvider>
      <div className="mj-shell">
        <CenterSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={doLogout}
        />
        <div className="lg:ps-[280px]">
          <CenterHeader onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="mj-main">
            <RouteTransition mode="shell">{children}</RouteTransition>
          </main>
        </div>
      </div>
    </CenterBranchProvider>
  );
}

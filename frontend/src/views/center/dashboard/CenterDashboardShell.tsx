'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { CenterSidebar } from './CenterSidebar';
import { CenterHeader } from './CenterHeader';
import { CenterBranchProvider } from './CenterBranchContext';

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
            <div key={pathname} className="animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </div>
    </CenterBranchProvider>
  );
}

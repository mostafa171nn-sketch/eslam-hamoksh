'use client';

import type { ReactNode } from 'react';
import { ProtectedRoute } from '../../src/components/layout/ProtectedRoute';
import { DashboardLayout } from '../../src/layouts/DashboardLayout';

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}

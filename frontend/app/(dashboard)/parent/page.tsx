'use client';

import ParentDashboardPage from '../../../src/views/parent/ParentDashboardPage';
import { RoleRoute } from '../../../src/components/layout/ProtectedRoute';

export default function ParentDashboardRoute() {
  return (
    <RoleRoute roles={['PARENT']}>
      <ParentDashboardPage />
    </RoleRoute>
  );
}

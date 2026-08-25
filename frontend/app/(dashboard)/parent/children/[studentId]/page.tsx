'use client';

import ChildDashboardPage from '../../../../../src/views/parent/ChildDashboardPage';
import { RoleRoute } from '../../../../../src/components/layout/ProtectedRoute';

export default function ChildDashboardRoute() {
  return (
    <RoleRoute roles={['PARENT']}>
      <ChildDashboardPage />
    </RoleRoute>
  );
}

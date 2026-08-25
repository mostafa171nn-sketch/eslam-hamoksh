'use client';

import ChildDashboardPage from '../../../../../src/views/parent/ChildDashboardPage';
import { RoleRoute } from '../../../../../src/components/layout/ProtectedRoute';
import { PageBackButton } from '@/src/components/layout/PageBackButton';

export default function ChildDashboardRoute() {
  return (
    <RoleRoute roles={['PARENT']}>
      <PageBackButton className="mb-4" />
      <ChildDashboardPage />
    </RoleRoute>
  );
}

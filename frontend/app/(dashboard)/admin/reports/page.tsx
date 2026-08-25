'use client';

import AdminReportsPage from '../../../../src/views/admin/AdminReportsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function AdminReportsRoute() {
  return (
    <RoleRoute roles={['ADMIN']}>
      <AdminReportsPage />
    </RoleRoute>
  );
}

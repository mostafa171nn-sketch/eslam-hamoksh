'use client';

import AdminDashboardPage from '../../../src/views/admin/AdminDashboardPage';
import { RoleRoute } from '../../../src/components/layout/ProtectedRoute';

export default function AdminDashboardRoute() {
  return (
    <RoleRoute roles={['ADMIN']}>
      <AdminDashboardPage />
    </RoleRoute>
  );
}

'use client';

import AdminUsersPage from '../../../../src/views/admin/AdminUsersPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function AdminUsersRoute() {
  return (
    <RoleRoute roles={['ADMIN']}>
      <AdminUsersPage />
    </RoleRoute>
  );
}

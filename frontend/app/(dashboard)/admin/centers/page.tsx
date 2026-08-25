'use client';

import AdminCentersPage from '../../../../src/views/admin/AdminCentersPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function AdminCentersRoute() {
  return (
    <RoleRoute roles={['SUPER_ADMIN']}>
      <AdminCentersPage />
    </RoleRoute>
  );
}

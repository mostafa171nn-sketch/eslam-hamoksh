'use client';

import AdminLocationsPage from '../../../../src/views/admin/AdminLocationsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function AdminLocationsRoute() {
  return (
    <RoleRoute roles={['ADMIN']}>
      <AdminLocationsPage />
    </RoleRoute>
  );
}

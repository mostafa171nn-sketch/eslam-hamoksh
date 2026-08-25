'use client';

import AdminTeachersPage from '../../../../src/views/admin/AdminTeachersPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function AdminTeachersRoute() {
  return (
    <RoleRoute roles={['ADMIN']}>
      <AdminTeachersPage />
    </RoleRoute>
  );
}

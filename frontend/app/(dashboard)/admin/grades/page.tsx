'use client';

import AdminGradesPage from '../../../../src/views/admin/AdminGradesPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function AdminGradesRoute() {
  return (
    <RoleRoute roles={['ADMIN']}>
      <AdminGradesPage />
    </RoleRoute>
  );
}

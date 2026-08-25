'use client';

import AdminSubjectsPage from '../../../../src/views/admin/AdminSubjectsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function AdminSubjectsRoute() {
  return (
    <RoleRoute roles={['ADMIN']}>
      <AdminSubjectsPage />
    </RoleRoute>
  );
}

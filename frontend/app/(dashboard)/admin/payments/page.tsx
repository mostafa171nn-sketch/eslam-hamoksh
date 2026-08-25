'use client';

import AdminPaymentsPage from '../../../../src/views/admin/AdminPaymentsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function AdminPaymentsRoute() {
  return (
    <RoleRoute roles={['ADMIN']}>
      <AdminPaymentsPage />
    </RoleRoute>
  );
}

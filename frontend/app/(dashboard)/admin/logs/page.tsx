'use client';

import AdminLogsPage from '../../../../src/views/admin/AdminLogsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function AdminLogsRoute() {
  return (
    <RoleRoute roles={['ADMIN']}>
      <AdminLogsPage />
    </RoleRoute>
  );
}

'use client';

import AdminCenterSettingsPage from '../../../../src/views/admin/AdminCenterSettingsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function AdminCenterRoute() {
  return (
    <RoleRoute roles={['ADMIN']}>
      <AdminCenterSettingsPage />
    </RoleRoute>
  );
}

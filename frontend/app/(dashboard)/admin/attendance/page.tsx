'use client';

import AdminAttendancePage from '../../../../src/views/admin/AdminAttendancePage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function AdminAttendanceRoute() {
  return (
    <RoleRoute roles={['ADMIN']}>
      <AdminAttendancePage />
    </RoleRoute>
  );
}

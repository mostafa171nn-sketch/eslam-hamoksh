'use client';

import ParentAttendancePage from '../../../../src/views/parent/ParentAttendancePage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function ParentAttendanceRoute() {
  return (
    <RoleRoute roles={['PARENT']}>
      <ParentAttendancePage />
    </RoleRoute>
  );
}

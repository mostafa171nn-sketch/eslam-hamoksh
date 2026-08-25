'use client';

import StudentAttendancePage from '../../../../src/views/student/StudentAttendancePage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function StudentAttendanceRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <StudentAttendancePage />
    </RoleRoute>
  );
}

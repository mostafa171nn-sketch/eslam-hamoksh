'use client';

import TeacherAttendancePage from '../../../../src/views/teacher/TeacherAttendancePage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function TeacherAttendanceRoute() {
  return (
    <RoleRoute roles={['TEACHER']}>
      <TeacherAttendancePage />
    </RoleRoute>
  );
}

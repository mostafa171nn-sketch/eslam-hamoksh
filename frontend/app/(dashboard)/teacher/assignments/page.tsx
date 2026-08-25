'use client';

import TeacherAssignmentsPage from '../../../../src/views/teacher/TeacherAssignmentsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function TeacherAssignmentsRoute() {
  return (
    <RoleRoute roles={['TEACHER']}>
      <TeacherAssignmentsPage />
    </RoleRoute>
  );
}

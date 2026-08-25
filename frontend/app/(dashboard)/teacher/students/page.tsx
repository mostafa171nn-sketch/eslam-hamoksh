'use client';

import TeacherStudentsPage from '../../../../src/views/teacher/TeacherStudentsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function TeacherStudentsRoute() {
  return (
    <RoleRoute roles={['TEACHER']}>
      <TeacherStudentsPage />
    </RoleRoute>
  );
}

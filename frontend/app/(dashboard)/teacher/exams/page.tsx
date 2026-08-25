'use client';

import TeacherExamsPage from '../../../../src/views/teacher/TeacherExamsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function TeacherExamsRoute() {
  return (
    <RoleRoute roles={['TEACHER']}>
      <TeacherExamsPage />
    </RoleRoute>
  );
}

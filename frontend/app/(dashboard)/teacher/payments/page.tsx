'use client';

import TeacherPaymentsPage from '../../../../src/views/teacher/TeacherPaymentsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function TeacherPaymentsRoute() {
  return (
    <RoleRoute roles={['TEACHER']}>
      <TeacherPaymentsPage />
    </RoleRoute>
  );
}

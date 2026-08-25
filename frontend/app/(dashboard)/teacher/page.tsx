'use client';

import TeacherDashboardPage from '../../../src/views/teacher/TeacherDashboardPage';
import { RoleRoute } from '../../../src/components/layout/ProtectedRoute';

export default function TeacherDashboardRoute() {
  return (
    <RoleRoute roles={['TEACHER']}>
      <TeacherDashboardPage />
    </RoleRoute>
  );
}

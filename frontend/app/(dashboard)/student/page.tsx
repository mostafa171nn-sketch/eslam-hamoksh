'use client';

import StudentDashboardPage from '../../../src/views/student/StudentDashboardPage';
import { RoleRoute } from '../../../src/components/layout/ProtectedRoute';

export default function StudentDashboardRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <StudentDashboardPage />
    </RoleRoute>
  );
}

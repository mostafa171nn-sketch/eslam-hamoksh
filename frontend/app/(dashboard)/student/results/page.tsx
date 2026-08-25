'use client';

import StudentResultsPage from '../../../../src/views/student/StudentResultsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function StudentResultsRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <StudentResultsPage />
    </RoleRoute>
  );
}

'use client';

import StudentAccountPage from '../../../../src/views/student/StudentAccountPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function StudentAccountRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <StudentAccountPage />
    </RoleRoute>
  );
}

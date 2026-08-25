'use client';

import StudentPaymentsPage from '../../../../src/views/student/StudentPaymentsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function StudentPaymentsRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <StudentPaymentsPage />
    </RoleRoute>
  );
}

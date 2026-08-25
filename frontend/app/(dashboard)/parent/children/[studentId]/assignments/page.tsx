'use client';

import StudentAssignmentsPage from '../../../../../../src/views/student/StudentAssignmentsPage';
import { RoleRoute } from '../../../../../../src/components/layout/ProtectedRoute';

export default function ChildAssignmentsRoute() {
  return (
    <RoleRoute roles={['PARENT']}>
      <StudentAssignmentsPage />
    </RoleRoute>
  );
}

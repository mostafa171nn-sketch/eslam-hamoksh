'use client';

import StudentAssignmentsPage from '../../../../../../src/views/student/StudentAssignmentsPage';
import { RoleRoute } from '../../../../../../src/components/layout/ProtectedRoute';
import { PageBackButton } from '@/src/components/layout/PageBackButton';

export default function ChildAssignmentsRoute() {
  return (
    <RoleRoute roles={['PARENT']}>
      <PageBackButton className="mb-4" />
      <StudentAssignmentsPage />
    </RoleRoute>
  );
}

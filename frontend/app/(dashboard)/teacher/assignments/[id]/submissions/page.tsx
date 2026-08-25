'use client';

import AssignmentSubmissionsPage from '../../../../../../src/views/teacher/AssignmentSubmissionsPage';
import { RoleRoute } from '../../../../../../src/components/layout/ProtectedRoute';

export default function AssignmentSubmissionsRoute() {
  return (
    <RoleRoute roles={['TEACHER']}>
      <AssignmentSubmissionsPage />
    </RoleRoute>
  );
}

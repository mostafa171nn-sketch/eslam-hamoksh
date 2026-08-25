'use client';

import AssignmentSubmissionsPage from '../../../../../../src/views/teacher/AssignmentSubmissionsPage';
import { RoleRoute } from '../../../../../../src/components/layout/ProtectedRoute';
import { PageBackButton } from '@/src/components/layout/PageBackButton';

export default function AssignmentSubmissionsRoute() {
  return (
    <RoleRoute roles={['TEACHER']}>
      <PageBackButton className="mb-4" />
      <AssignmentSubmissionsPage />
    </RoleRoute>
  );
}

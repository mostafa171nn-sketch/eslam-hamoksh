'use client';

import StudentExamsPage from '../../../../src/views/student/StudentExamsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function StudentExamsRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <StudentExamsPage />
    </RoleRoute>
  );
}

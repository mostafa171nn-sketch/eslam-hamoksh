'use client';

import StudentExamsPage from '../../../../../../src/views/student/StudentExamsPage';
import { RoleRoute } from '../../../../../../src/components/layout/ProtectedRoute';

export default function ChildExamsRoute() {
  return (
    <RoleRoute roles={['PARENT']}>
      <StudentExamsPage />
    </RoleRoute>
  );
}

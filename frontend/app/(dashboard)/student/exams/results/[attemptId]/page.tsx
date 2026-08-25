'use client';

import StudentExamResultPage from '../../../../../../src/views/student/StudentExamResultPage';
import { RoleRoute } from '../../../../../../src/components/layout/ProtectedRoute';

export default function StudentExamResultRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <StudentExamResultPage />
    </RoleRoute>
  );
}

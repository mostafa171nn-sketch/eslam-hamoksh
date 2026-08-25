'use client';

import StudentExamResultPage from '../../../../../../src/views/student/StudentExamResultPage';
import { RoleRoute } from '../../../../../../src/components/layout/ProtectedRoute';
import { PageBackButton } from '@/src/components/layout/PageBackButton';

export default function StudentExamResultRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <PageBackButton className="mb-4" />
      <StudentExamResultPage />
    </RoleRoute>
  );
}

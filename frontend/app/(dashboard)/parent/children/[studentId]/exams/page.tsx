'use client';

import StudentExamsPage from '../../../../../../src/views/student/StudentExamsPage';
import { RoleRoute } from '../../../../../../src/components/layout/ProtectedRoute';
import { PageBackButton } from '@/src/components/layout/PageBackButton';

export default function ChildExamsRoute() {
  return (
    <RoleRoute roles={['PARENT']}>
      <PageBackButton className="mb-4" />
      <StudentExamsPage />
    </RoleRoute>
  );
}

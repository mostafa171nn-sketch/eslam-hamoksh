'use client';

import ExamTakingPage from '../../../../../../src/views/student/ExamTakingPage';
import { RoleRoute } from '../../../../../../src/components/layout/ProtectedRoute';
import { PageBackButton } from '@/src/components/layout/PageBackButton';

export default function ExamTakingRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <PageBackButton className="mb-4" />
      <ExamTakingPage />
    </RoleRoute>
  );
}

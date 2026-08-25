'use client';

import ExamResultsPage from '../../../../../../src/views/teacher/ExamResultsPage';
import { RoleRoute } from '../../../../../../src/components/layout/ProtectedRoute';
import { PageBackButton } from '@/src/components/layout/PageBackButton';

export default function ExamResultsRoute() {
  return (
    <RoleRoute roles={['TEACHER']}>
      <PageBackButton className="mb-4" />
      <ExamResultsPage />
    </RoleRoute>
  );
}

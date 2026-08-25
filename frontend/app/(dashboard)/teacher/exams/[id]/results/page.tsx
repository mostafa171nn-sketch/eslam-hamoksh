'use client';

import ExamResultsPage from '../../../../../../src/views/teacher/ExamResultsPage';
import { RoleRoute } from '../../../../../../src/components/layout/ProtectedRoute';

export default function ExamResultsRoute() {
  return (
    <RoleRoute roles={['TEACHER']}>
      <ExamResultsPage />
    </RoleRoute>
  );
}

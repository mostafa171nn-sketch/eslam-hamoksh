'use client';

import ExamTakingPage from '../../../../../../src/views/student/ExamTakingPage';
import { RoleRoute } from '../../../../../../src/components/layout/ProtectedRoute';

export default function ExamTakingRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <ExamTakingPage />
    </RoleRoute>
  );
}

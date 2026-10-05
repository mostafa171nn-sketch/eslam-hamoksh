'use client';

import StudentFinancePage from '../../../../src/views/student/StudentFinancePage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function StudentFinanceRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <StudentFinancePage />
    </RoleRoute>
  );
}

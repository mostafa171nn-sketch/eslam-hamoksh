'use client';

import StudentQrPage from '../../../../src/views/student/StudentQrPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function StudentQrRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <StudentQrPage />
    </RoleRoute>
  );
}

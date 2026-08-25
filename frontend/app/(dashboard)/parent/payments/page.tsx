'use client';

import ParentPaymentsPage from '../../../../src/views/parent/ParentPaymentsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function ParentPaymentsRoute() {
  return (
    <RoleRoute roles={['PARENT']}>
      <ParentPaymentsPage />
    </RoleRoute>
  );
}

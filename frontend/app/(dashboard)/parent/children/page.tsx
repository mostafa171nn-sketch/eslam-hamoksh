'use client';

import ParentChildrenPage from '../../../../src/views/parent/ParentChildrenPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function ParentChildrenRoute() {
  return (
    <RoleRoute roles={['PARENT']}>
      <ParentChildrenPage />
    </RoleRoute>
  );
}

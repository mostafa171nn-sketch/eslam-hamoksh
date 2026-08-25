'use client';

import MyTeachersPage from '../../../../src/views/student/MyTeachersPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function MyTeachersRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <MyTeachersPage />
    </RoleRoute>
  );
}

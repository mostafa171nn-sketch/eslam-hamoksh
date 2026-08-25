'use client';

import TeacherAvailabilityPage from '../../../../src/views/teacher/TeacherAvailabilityPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function TeacherAvailabilityRoute() {
  return (
    <RoleRoute roles={['TEACHER']}>
      <TeacherAvailabilityPage />
    </RoleRoute>
  );
}

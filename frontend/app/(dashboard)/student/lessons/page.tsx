'use client';

import StudentLessonsPage from '../../../../src/views/student/StudentLessonsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function StudentLessonsRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <StudentLessonsPage />
    </RoleRoute>
  );
}

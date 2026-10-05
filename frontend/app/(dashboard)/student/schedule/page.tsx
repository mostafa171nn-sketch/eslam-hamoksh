'use client';

import StudentLessonsPage from '../../../../src/views/student/StudentLessonsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function StudentScheduleRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <StudentLessonsPage />
    </RoleRoute>
  );
}

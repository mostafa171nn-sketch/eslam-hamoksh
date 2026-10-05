'use client';

import StudentJourneyPage from '../../../../src/views/student/StudentJourneyPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function StudentJourneyRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <StudentJourneyPage />
    </RoleRoute>
  );
}

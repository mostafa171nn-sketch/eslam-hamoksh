'use client';

import StudentAttendancePage from '../../../../../../src/views/student/StudentAttendancePage';
import { RoleRoute } from '../../../../../../src/components/layout/ProtectedRoute';
import { PageBackButton } from '@/src/components/layout/PageBackButton';

export default function ChildAttendanceRoute() {
  return (
    <RoleRoute roles={['PARENT']}>
      <PageBackButton className="mb-4" />
      <StudentAttendancePage />
    </RoleRoute>
  );
}

'use client';

import TeacherPaymentSettingsPage from '../../../../src/views/teacher/TeacherPaymentSettingsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function TeacherPaymentSettingsRoute() {
  return (
    <RoleRoute roles={['TEACHER']}>
      <TeacherPaymentSettingsPage />
    </RoleRoute>
  );
}

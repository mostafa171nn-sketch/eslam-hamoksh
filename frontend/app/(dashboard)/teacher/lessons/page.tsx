'use client';

import TeacherLessonsPage from '../../../../src/views/teacher/TeacherLessonsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function TeacherLessonsRoute() {
  return (
    <RoleRoute roles={['TEACHER']}>
      <TeacherLessonsPage />
    </RoleRoute>
  );
}

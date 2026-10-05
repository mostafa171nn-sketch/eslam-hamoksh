'use client';

import { Suspense } from 'react';
import StudentTeachersPage from '../../../../src/views/public/StudentTeachersPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';
import { PencilLoader } from '../../../../src/components/ui/PencilLoader';

/**
 * Authenticated teacher search. Reuses the exact public search experience
 * (same view, filters, cards, pagination) inside the student account shell.
 * Data loads client-side under the existing authenticated session.
 */
export default function StudentBrowseTeachersRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <PencilLoader />
          </div>
        }
      >
        <StudentTeachersPage />
      </Suspense>
    </RoleRoute>
  );
}

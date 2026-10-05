'use client';

import { Suspense } from 'react';
import CentersView from '../../../../src/views/public/CentersView';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';
import { PencilLoader } from '../../../../src/components/ui/PencilLoader';

/**
 * Authenticated center search. Reuses the exact public search experience
 * (same view, filters, cards, pagination) inside the student account shell.
 * Data loads client-side under the existing authenticated session.
 */
export default function StudentBrowseCentersRoute() {
  return (
    <RoleRoute roles={['STUDENT']}>
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <PencilLoader />
          </div>
        }
      >
        <CentersView />
      </Suspense>
    </RoleRoute>
  );
}

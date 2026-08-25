'use client';

import { Suspense } from 'react';
import StudentTeachersPage from '../../src/views/public/StudentTeachersPage';
import { PublicNav } from '../../src/components/layout/PublicNav';
import { PageBackButton } from '../../src/components/layout/PageBackButton';
import { PencilLoader } from '../../src/components/ui/PencilLoader';

export default function BrowseTeachersRoute() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PublicNav />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-4">
          <PageBackButton fallback="/centers" />
        </div>
        <Suspense
          fallback={
            <div className="flex justify-center py-24">
              <PencilLoader />
            </div>
          }
        >
          <StudentTeachersPage />
        </Suspense>
      </div>
    </div>
  );
}
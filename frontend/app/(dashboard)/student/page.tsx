'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import StudentDashboardPage from '../../../src/views/student/StudentDashboardPage';
import StudentJourneyHome from '../../../src/views/student/StudentJourneyHome';
import { RoleRoute } from '../../../src/components/layout/ProtectedRoute';
import { JOURNEY_STORAGE_KEY } from '../../../src/components/student/StudentJourneyFab';

/**
 * Student home root. Renders the normal dashboard by default; when Journey
 * Mode is active (entered via the "My learning journey" floating button) the
 * Journey-mode home is shown instead. The normal homepage component is never
 * modified by the journey presentation.
 */
export default function StudentDashboardRoute() {
  const pathname = usePathname();
  const [journeyOn, setJourneyOn] = useState(false);

  useEffect(() => {
    try {
      const flag = window.sessionStorage.getItem(JOURNEY_STORAGE_KEY) === '1';
      setJourneyOn(flag && !!pathname?.startsWith('/student'));
    } catch {
      setJourneyOn(false);
    }
  }, [pathname]);

  if (!journeyOn) {
    return (
      <RoleRoute roles={['STUDENT']}>
        <StudentDashboardPage />
      </RoleRoute>
    );
  }

  return (
    <RoleRoute roles={['STUDENT']}>
      <StudentJourneyHome />
    </RoleRoute>
  );
}

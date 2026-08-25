'use client';

import TeacherPublicPage from '../../../src/views/public/TeacherPublicPage';
import { PageBackButton } from '@/src/components/layout/PageBackButton';

export default function TeacherPublicRoute() {
  return (
    <>
      <PageBackButton className="mb-4" />
      <TeacherPublicPage />
    </>
  );
}

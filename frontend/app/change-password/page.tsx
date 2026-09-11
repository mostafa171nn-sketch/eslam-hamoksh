import { Suspense } from 'react';
import ChangePasswordPage from '../../src/views/auth/ChangePasswordPage';

export default function ChangePasswordRoute() {
  return (
    <Suspense fallback={null}>
      <ChangePasswordPage />
    </Suspense>
  );
}
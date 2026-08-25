import { Suspense } from 'react';
import ResetPasswordPage from '../../src/views/auth/ResetPasswordPage';

export default function ResetPasswordRoute() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPage />
    </Suspense>
  );
}

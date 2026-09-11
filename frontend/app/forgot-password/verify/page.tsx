import { Suspense } from 'react';
import ForgotPasswordVerifyPage from '../../../src/views/auth/ForgotPasswordVerifyPage';

export default function ForgotPasswordVerifyRoute() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordVerifyPage />
    </Suspense>
  );
}
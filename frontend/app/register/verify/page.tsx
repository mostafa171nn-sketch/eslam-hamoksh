import { Suspense } from 'react';
import RegisterVerifyPage from '../../../src/views/auth/RegisterVerifyPage';

export default function RegisterVerifyRoute() {
  return (
    <Suspense fallback={null}>
      <RegisterVerifyPage />
    </Suspense>
  );
}
import { Suspense } from 'react';
import RegisterPage from '../../src/views/auth/RegisterPage';

export default function RegisterRoute() {
  return (
    <Suspense fallback={null}>
      <RegisterPage />
    </Suspense>
  );
}

import { Suspense } from 'react';
import LoginPage from '../../src/views/auth/LoginPage';

export default function LoginRoute() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}

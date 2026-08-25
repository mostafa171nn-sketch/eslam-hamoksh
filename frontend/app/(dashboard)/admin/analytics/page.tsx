'use client';

import AdminAnalyticsPage from '../../../../src/views/admin/AdminAnalyticsPage';
import { RoleRoute } from '../../../../src/components/layout/ProtectedRoute';

export default function AdminAnalyticsRoute() {
  return (
    <RoleRoute roles={['ADMIN']}>
      <AdminAnalyticsPage />
    </RoleRoute>
  );
}

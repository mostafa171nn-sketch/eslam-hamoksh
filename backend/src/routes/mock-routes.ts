import { Router } from 'express';
import { env } from '../config/env';
import { getStore } from '../mock/mock-store';

export const mockRoutes = Router();

mockRoutes.get('/auth/mock-info', (_req, res) => {
  if (env.isDev && process.env.DEV_MOCK_DATA === 'true') {
    const store = getStore();
    const accounts = [...store.users.values()].map((u: any) => ({
      username: u.username,
      role: u.role,
      fullName: u.fullName,
      centerId: u.centerId ?? null,
    }));
    return res.json({ success: true, data: { enabled: true, password: 'Demo@12345', accounts } });
  }
  // Mock mode is off: answer explicitly instead of 404. The login page probes
  // this endpoint on every visit to decide whether to show the demo-account
  // picker, so a 404 here only produces console noise in the standard
  // dev/prod setup. No accounts or passwords are disclosed when disabled.
  return res.json({ success: true, data: { enabled: false } });
});
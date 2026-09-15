import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import { env } from './config/env';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/error';
import { uploadRootPath } from './middleware/upload';

import authRoutes from './routes/auth.routes';
import teacherRoutes from './routes/teacher.routes';
import studentRoutes from './routes/student.routes';
import parentRoutes from './routes/parent.routes';
import lessonRoutes from './routes/lesson.routes';
import assignmentRoutes from './routes/assignment.routes';
import examRoutes from './routes/exam.routes';
import ratingRoutes from './routes/rating.routes';
import notificationRoutes from './routes/notification.routes';
import adminRoutes from './routes/admin.routes';
import catalogRoutes from './routes/catalog.routes';
import attendanceRoutes from './routes/attendance.routes';
import paymentRoutes from './routes/payment.routes';
import { centerRoutes } from './routes/center.routes';
import { adminCentersRoutes } from './routes/admin.centers.routes';
import centerEmployeeRoutes from './routes/center-employee.routes';
import centerEmployeesRoutes from './routes/center-employees.routes';
import centerTeachersRoutes from './routes/center-teachers.routes';
import centerBranchesRoutes from './routes/center-branches.routes';
import centerStudentsRoutes from './routes/center-students.routes';
import centerAttendanceRoutes from './routes/center-attendance.routes';
import centerPaymentsRoutes from './routes/center-payments.routes';
import centerRoomsRoutes from './routes/center-rooms.routes';
import centerReportsRoutes from './routes/center-reports.routes';
import centerAnalyticsRoutes from './routes/center-analytics.routes';
import teacherAssistantRoutes from './routes/teacher-assistant.routes';
import { chatRoutes } from './routes/chat.routes';
import { subscriptionRoutes } from './routes/subscription.routes';
import { roomRoutes } from './routes/room.routes';
import { sessionRoutes } from './routes/session.routes';
import walletRoutes from './routes/wallet.routes';
import invoiceRoutes from './routes/invoice.routes';
import settlementRoutes from './routes/settlement.routes';
import { reportRoutes } from './routes/report.routes';
import documentRoutes from './routes/document.routes';
import otpRoutes from './routes/otp.routes';
import notificationTemplateRoutes from './routes/notification-template.routes';
import centerAccountRoutes from './routes/center-account.routes';
import centerGroupsRoutes from './routes/center-groups.routes';
import centerBookingsRoutes from './routes/center-bookings.routes';
import centerTransportRoutes from './routes/center-transport.routes';
import centerFinanceRoutes from './routes/center-finance.routes';
import centerCommunicationsRoutes from './routes/center-communications.routes';
import centerBroadcastRoutes from './routes/center-broadcast.routes';
import centerTasksRoutes from './routes/center-tasks.routes';
import { prisma } from './lib/prisma';

export const app = express();

// Client-IP inference. We do NOT trust proxies by default: rate limiting and
// audit logging then key on the actual socket peer, which cannot be spoofed via
// X-Forwarded-For. Production behind a reverse proxy/CDN must set
// TRUST_PROXY_HOPS to the number of trusted hops in front of this process
// (express-rate-limit v7 fails closed on an unexpected X-Forwarded-For header,
// so an unset value surfaces a clear error instead of silently weakening the
// limiter). 0 (no proxy) is the safe default everywhere else.
app.set('trust proxy', env.TRUST_PROXY_HOPS);

// Security headers. CSP is left to the frontend (API does not serve HTML).
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS: only the configured client origin is allowed for credentialed requests.
// The frontend is deployed on Vercel (app domain + *.vercel.app project/preview
// URLs) and proxies /api/* to this backend, so any Vercel-hosted origin is
// treated as a trusted client. Direct API calls without an Origin header are
// also allowed (server-to-server / curl).
app.use(
  cors({
    origin(origin, callback) {
      const allowed = env.CLIENT_URL.split(',').map((o) => o.trim());
      const allowedHosts = allowed
        .map((o) => {
          try {
            return new URL(o).hostname;
          } catch {
            return '';
          }
        })
        .filter(Boolean);
      if (
        !origin ||
        allowed.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        env.isDev
      ) {
        return callback(null, true);
      }
      let originHost = '';
      try {
        originHost = new URL(origin).hostname;
      } catch {
        originHost = '';
      }
      if (originHost && allowedHosts.includes(originHost)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS.'));
    },
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Response compression (gzip/brotli/...). Skips already-compressed binary
// media (images/video/audio/fonts) so CPU is not wasted re-compressing them.
// Applied before the routes so every JSON payload benefits. The default
// express-rate-limit/streaming behaviour is preserved (Vary: Accept-Encoding
// is added by the middleware).
app.use(
  compression({
    threshold: 1024,
    filter: (req, res) => {
      const type = res.getHeader('Content-Type');
      if (typeof type === 'string' && /^\s*(image\/|video\/|audio\/|font\/)/i.test(type)) {
        return false;
      }
      return compression.filter(req, res);
    },
  }),
);

// Backstop rate limit for every API route. Public discovery gets its own
// tighter budget via `publicDiscoveryRateLimiter` applied at the route level.
app.use('/api', apiRateLimiter);

// Public static files for uploads (photos, homework, attachments). 1h browser
// cache: uploaded file URLs are content-addressed in practice and public, so a
// short maxAge is safe and keeps repeat photo loads off the backend.
app.use('/uploads', express.static(path.resolve(process.cwd(), env.UPLOAD_DIR), { maxAge: '1h' }));

// Health check
app.get('/api/health', async (_req, res) => {
  let db = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'unavailable';
  }
  res.status(db === 'ok' ? 200 : 503).json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    checks: { database: db },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/centers', centerRoutes);
app.use('/api/admin/centers', adminCentersRoutes);
app.use('/api/center/employees', centerEmployeeRoutes);
app.use('/api/center/staff', centerEmployeesRoutes);
app.use('/api/center/teachers', centerTeachersRoutes);
app.use('/api/center/branches', centerBranchesRoutes);
app.use('/api/center/students', centerStudentsRoutes);
app.use('/api/center/account/attendance', centerAttendanceRoutes);
app.use('/api/center/account/payments', centerPaymentsRoutes);
app.use('/api/center/account/classrooms', centerRoomsRoutes);
app.use('/api/center/account/reports', centerReportsRoutes);
app.use('/api/center/account/analytics', centerAnalyticsRoutes);
app.use('/api/teacher-assistants', teacherAssistantRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notification-templates', notificationTemplateRoutes);
app.use('/api/auth/otp', otpRoutes);
app.use('/api/center/account', centerAccountRoutes);
app.use('/api/center/groups', centerGroupsRoutes);
app.use('/api/center/bookings', centerBookingsRoutes);
app.use('/api/center/transport', centerTransportRoutes);
app.use('/api/center/account/finance', centerFinanceRoutes);
app.use('/api/center/account/communications', centerCommunicationsRoutes);
app.use('/api/center/account/broadcast', centerBroadcastRoutes);
app.use('/api/center/account/tasks', centerTasksRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

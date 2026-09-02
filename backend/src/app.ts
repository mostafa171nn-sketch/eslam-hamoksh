import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
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
import { prisma } from './lib/prisma';

export const app = express();

app.set('trust proxy', 1);

// Security headers. CSP is left to the frontend (API does not serve HTML).
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS: only the configured client origin is allowed for credentialed requests.
app.use(
  cors({
    origin(origin, callback) {
      const allowed = env.CLIENT_URL.split(',').map((o) => o.trim());
      if (!origin || allowed.includes(origin) || env.isDev) {
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

// Public static files for uploads (photos, homework, attachments).
app.use('/uploads', express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

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

app.use(notFoundHandler);
app.use(errorHandler);

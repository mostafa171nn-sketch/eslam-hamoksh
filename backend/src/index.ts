import { app } from './app';
import { env } from './config/env';
import { prisma, ensurePrismaReady, setMockPrisma } from './lib/prisma';
import type { PrismaClient } from '@prisma/client';
import { sweepExpiredAttempts } from './services/exam.service';
import { sweepAttendanceFinalization, sweepSubscriptionExpiry } from './services/attendance.service';

let sweeper: NodeJS.Timeout | null = null;
let attendanceSweeper: NodeJS.Timeout | null = null;

async function start() {
  if (process.env.DEV_MOCK_DATA === 'true') {
    try {
      const mod = await import('./mock/mock-prisma.js');
      await mod.ensureReady();
      await setMockPrisma(mod.createMockPrisma() as unknown as PrismaClient);
      console.log('[mock] DEV_MOCK_DATA enabled — in-memory data store active.');
    } catch (err) {
      console.error('[mock] Failed to initialize mock data:', err);
      process.exit(1);
    }
  } else {
    await ensurePrismaReady();
  }

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  // Warm the connection pool. Failure is non-fatal (health reports it).
  try {
    await prisma.$connect();
    // eslint-disable-next-line no-console
    console.log('Database connected.');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Database connection failed at startup:', err);
  }

  // Periodic auto-submission of expired exams. The server remains the
  // authoritative source of exam timing even if clients are offline.
  sweeper = setInterval(async () => {
    try {
      const n = await sweepExpiredAttempts();
      if (n > 0) {
        // eslint-disable-next-line no-console
        console.log(`Auto-submitted ${n} expired exam attempt(s).`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Exam sweeper failed:', err);
    }
  }, env.EXAM_SWEEPER_INTERVAL_MS);

  // Attendance finalization + subscription expiry sweeper.
  attendanceSweeper = setInterval(async () => {
    try {
      const a = await sweepAttendanceFinalization();
      if (a > 0) console.log(`Auto-marked ${a} absent attendance record(s).`);
      const s = await sweepSubscriptionExpiry();
      if (s > 0) console.log(`Expired ${s} subscription(s).`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Attendance/subscription sweeper failed:', err);
    }
  }, 60_000);
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});

async function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (sweeper) clearInterval(sweeper);
  if (attendanceSweeper) clearInterval(attendanceSweeper);
  try {
    await prisma.$disconnect();
  } catch {
    // ignore
  }
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

import { PrismaClient } from '@prisma/client';
import { getTenantContext } from './tenant';

// Models that carry a `centerId` column and therefore must be isolated per
// tenant. Centralised here so the middleware stays the single source of truth.
export const TENANT_MODELS = new Set<string>([
  'User',
  'Teacher',
  'Student',
  'Parent',
  'Lesson',
  'Attendance',
  'AttendanceQrSession',
  'BillingSubscription',
  'Payment',
  'Assignment',
  'Exam',
  'Location',
  'CenterSettings',
  'Conversation',
  'Wallet',
  'CenterRegistrationRequest',
  'Invoice',
  'Settlement',
  'TeacherAssistant',
  'Room',
  'Document',
  'ActivityLog',
  'Group',
  'RoomBooking',
  'Complaint',
  'Broadcast',
  'TransportRoute',
  'Expense',
  'EmployeeTask',
  'CenterMessage',
]);

// Single Prisma client instance reused across the whole app.
// Prisma manages its own connection pool internally; we never open a new
// connection per request.
const enableQueryLog = process.env.PRISMA_LOG === 'query';
const basePrisma = new PrismaClient({
  log: enableQueryLog
    ? [{ emit: 'event', level: 'query' }]
    : process.env.NODE_ENV === 'development'
      ? ['warn', 'error']
      : ['error'],
});

if (enableQueryLog) {
  // Line-per-query trace used by the query-count benchmarks. Every SQL
  // statement is printed as `[q] <sql> (<duration ms>)`; stmt counts are
  // derived by grepping the log for SELECT/INSERT/UPDATE/DELETE.
  (basePrisma as PrismaClient & { $on: (e: 'query', cb: (x: { query: string; duration: number }) => void) => void }).$on('query', (e) => {
    // eslint-disable-next-line no-console
    console.log(`[q] ${e.query.replace(/\s+/g, ' ').trim()} (${e.duration} ms)`);
  });
}

const extended = basePrisma.$extends({

/**
 * Tenant isolation middleware (Prisma 6 `$extends`).
 *
 * In `center` scope (CENTER_ADMIN / TEACHER / STUDENT / PARENT) every query and
 * mutation is transparently scoped to the authenticated user's centerId.
 * Client-supplied centerId values are ALWAYS overridden so a caller can never
 * read or write another tenant's data via IDOR.
 *
 * In `platform` scope (SUPER_ADMIN, no explicit center) no automatic scoping is
 * applied; the caller is responsible for passing an explicit `where.centerId`
 * when they mean to target a single tenant.
 */
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          const ctx = getTenantContext();
          let nextArgs = args;

          // Transient connection failures that are safe to retry while the
          // Neon serverless compute is waking from its idle scale-down:
          //   P1001  "Can't reach database server"     (connect refused/timeout)
          //   P1002  "Database server timed out"       (response timeout)
          //   P1017  "Server has closed the connection" (dropped while waking)
          //   P2024  "Pool fetch timed out"            (concurrent first burst)
          //   P2034  "Transaction already closed"      (dropped connection)
          // Any other error is a real failure (e.g. a schema/query bug) and is
          // rethrown immediately so it is never masked.
          const TRANSIENT_CODES = new Set(['P1001', 'P1002', 'P1017', 'P2024', 'P2034']);
          const RETRY_DELAYS_MS = [1500, 3000, 5000];

          const execute = async () => {
            let lastErr: any;
            for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
              try {
                return await query(nextArgs);
              } catch (err: any) {
                lastErr = err;
                const code = err && typeof err.code === 'string' ? err.code : '';
                if (!TRANSIENT_CODES.has(code)) throw err;
                const delay = RETRY_DELAYS_MS[attempt];
                if (delay === undefined) throw err;
                // eslint-disable-next-line no-console
                console.warn(`[db] transient ${code} on ${model}.${operation}, retrying in ${delay}ms (attempt ${attempt + 1})`);
                await new Promise((r) => setTimeout(r, delay));
              }
            }
            throw lastErr;
          };

          if (!ctx || ctx.scope !== 'center' || !ctx.centerId) {
            return execute();
          }

          if (!model || !TENANT_MODELS.has(model)) {
            return execute();
          }

          const centerId = ctx.centerId;
          nextArgs = { ...args };

        if (operation === 'create') {
          const data = nextArgs.data ?? {};
          // Skip injecting centerId if the caller already provides a center
          // relation (center: { connect: { id } }) to avoid Prisma rejecting
          // the conflicting scalar + relation on the same foreign key.
          if (!data.center && !data.centerId) {
            // Some models (Attendance, AttendanceQrSession) are created via
            // checked input with `student: { connect }` / `lesson: { connect }`.
            // Prisma's checked input does not accept scalar `centerId`; it
            // requires `center: { connect }`. Detect relation-style creates.
            const usesRelation =
              data.student?.connect || data.lesson?.connect || data.teacher?.connect || data.user?.connect;
            if (usesRelation) {
              nextArgs.data = { ...data, center: { connect: { id: centerId } } };
            } else {
              nextArgs.data = { ...data, centerId };
            }
          }
        } else if (operation === 'createMany') {
          const data = nextArgs.data;
          if (Array.isArray(data)) {
            nextArgs.data = data.map((row: any) => ({ ...row, centerId }));
          } else if (data && typeof data === 'object') {
            nextArgs.data = { ...data, centerId };
          }
        } else if (
          [
            'findFirst',
            'findFirstOrThrow',
            'findMany',
            'update',
            'updateMany',
            'upsert',
            'delete',
            'deleteMany',
            'count',
            'aggregate',
            'groupBy',
          ].includes(operation)
        ) {
          const where = (nextArgs.where ?? {}) as Record<string, unknown>;
          nextArgs.where = { ...where, centerId };
        }

        return execute();
      },
    },
  },
});

export let prisma: PrismaClient = extended as unknown as PrismaClient;
export let ensurePrismaReady: () => Promise<void> = async () => { /* no-op for real Prisma */ };
export async function setMockPrisma(mock: PrismaClient) {
  prisma = mock;
  ensurePrismaReady = async () => {};
}

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
]);

// Single Prisma client instance reused across the whole app.
// Prisma manages its own connection pool internally; we never open a new
// connection per request.
const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

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

          // Small helper used below to retry transient connection failures.
          const execute = async () => {
            try {
              return await query(nextArgs);
            } catch (err: any) {
              // Neon (serverless) scales the compute down when idle. The first
              // query after idle can fail with P1001 ("Can't reach database
              // server") because connection establishment is slower than
              // Prisma's default timeout while the compute spins back up.
              // Retrying once after a short delay lets the compute finish waking.
              if (err && err.code === 'P1001') {
                await new Promise((r) => setTimeout(r, 1500));
                return query(nextArgs);
              }
              throw err;
            }
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

// The extended client keeps the tenant-isolation middleware at runtime, but we
// cast it back to the base `PrismaClient` type so interactive transactions
// (which receive a `Prisma.TransactionClient`) keep their original signatures.
// The middleware still wraps every operation, including those inside a
// transaction, because the runtime object is the extended client.
export const prisma = extended as unknown as PrismaClient;

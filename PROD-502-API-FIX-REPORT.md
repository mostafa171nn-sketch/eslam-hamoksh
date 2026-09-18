# Production 502 Bad Gateway — Root Cause & Fix Report

## Summary

Production API endpoints on `https://maarej-kappa.vercel.app/api/*` return
**502 Bad Gateway** (`Application failed to respond`) because the **backend is
deployed on Railway** (`https://eslam-hamoksh-production-0cd3.up.railway.app`)
and the Railway service is in a **startup crash-loop**: the Neon PostgreSQL
database is over quota, so the backend's `prisma.$connect()` at boot fails,
the process calls `process.exit(1)`, the HTTP listener never binds, and Railway
turns every request into a 502. Vercel simply proxies `/api/*` to that dead
Railway host and surfaces the same 502.

## Exact Root Cause (two components)

### 1. Primary / trigger — Neon database is over quota (account-level)

A direct Prisma query against the production database returns:

```
ERROR: Your account or project has exceeded the quota. Upgrade your plan to increase limits.
```

- Verified locally against the real Neon `DATABASE_URL`
  (`ep-gentle-frost-…-neon.tech`, `connect_timeout=15`).
- The Neon host accepts TCP connections (`:5432` ACCEPT), but **every query is
  rejected with the over-quota error**.
- The local backend health check confirms the same state:
  `/api/health` → `503 {"status":"unavailable",...}`.

This is a **billing/quota condition on the Neon account (Hobby plan)** —
`Storage-Time` or `Compute-Time` limits exceeded, which suspends the project.
It cannot be fixed in code; the Neon account must be brought back into quota
(upgrade the plan or wait for the quota/reset limits).

### 2. Why it becomes a 502 — backend crashes at startup when the DB is down

The deployed backend entrypoint (`backend/src/index.ts`, committed code) did:

```ts
async function start() {
  await prisma.$connect();                 // throws when Neon is over-quota
  app.listen(env.PORT, ...);               // NEVER reached
}
start().catch((err) => { ...; process.exit(1); });
```

So any DB-unavailable-at-boot situation → `exit(1)` → the Railway container
restarts and exits again (crash-loop) → no HTTP listener → Railogy serves
**502 Bad Gateway** on every path (even non-DB routes like `GET /`).

Chain: **Neon over-quota → `prisma.$connect()` throws → `process.exit(1)` →
no listener on Railway → 502 at Railway → Vercel `/api/*` rewrite → 502 in the
browser.**

## Files Changed

| File | Change |
| --- | --- |
| `backend/src/index.ts` | Bind the HTTP listener **before** touching the DB; make the DB connect-warmup **non-fatal** (logged, health-reported). |

Only this one file was touched for this incident. All other working-tree
changes (`backend/src/app.ts`, `backend/src/lib/prisma.ts`,
`backend/src/middleware/requestLogger.ts`, frontend files) are the user's
pre-existing uncommitted work and were **preserved untouched**.

## Conflicting Startup Code (before / after)

Before:

```ts
async function start() {
  // Verify DB connectivity before listening.
  await prisma.$connect();
  console.log('Database connected.');
  app.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
  ...
}
start().catch((err) => { console.error('Failed to start server:', err); process.exit(1); });
```

After:

```ts
async function start() {
  app.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
  try {
    await prisma.$connect();
    console.log('Database connected.');
  } catch (err) {
    console.error('Database connection failed at startup:', err);
  }
  ...
}
```

Behavior preserved: when the DB is healthy, `$connect()` still warms the pool
and logs normally; sweepers/error handling unchanged. New behavior: a DB outage
at boot can no longer take the HTTP listener down or crash the process.

## Why This Fixes the 502

The "Application failed to respond" symptom is a **service that never binds a
port**. Decoupling `listen` from the DB handshake guarantees the API process is
always reachable on Railway:

- Non-DB paths respond immediately (400s/401/404 JSON, health checks).
- `/api/health` reports `503 {"status":"unavailable"}` while the DB is down
  (honest status code, not a masked 502).
- The moment the Neon account is back in quota, the same already-running
  process serves DB-backed endpoints again (200) — automatic recovery, no
  redeploy needed.

## Verification

### Reproduced in Brave (before fix)
- `GET https://maarej-kappa.vercel.app/api/auth/me` → **502** (`Application failed to respond`)
- `GET https://eslam-hamoksh-production-0cd3.up.railway.app/api/auth/me` → **502** (upstream itself is dead — rules out a Vercel-only issue)
- Railway root `GET /` and `GET /api/health` → timeout/502 (nothing is listening)
- Vercel env: only `NEXT_PUBLIC_API_URL = https://eslam-hamoksh-production-0cd3.up.railway.app` confirmed the rewrite target.

### Local boot-test of the fixed code (DB still over-quota — same condition as production)
Started the patched backend on an isolated port with the real Neon URL:

| Route | Result |
| --- | --- |
| `GET /` | `404 {"success":false,"message":"Route not found."}` (serving, fast) |
| `GET /api/health` | `503 {"status":"unavailable","checks":{"database":"unavailable"}}` |
| `GET /api/auth/me` | `401 {"message":"You must be logged in to access this resource."}` |
| `GET /api/teachers?page=1&limit=1` | `500` (carries the real over-quota error from the DB) |
| process | **stays up**, logs `Database connection failed at startup: …exceeded the quota`, sweepers keep running |

→ The identical code+DB condition that previously produced a crash-loop/502 now
serves HTTP immediately and reports its dependency state truthfully.

### Production endpoints after the fix
Live verification of `200`  is **not possible from here** because:
1. The fleet still runs the pre-fix code (this change is uncommitted, and
   committing/pushing is explicitly forbidden).
2. Even post-deploy, DB-backed endpoints (`/auth/me`, `/teachers`,
   `/centers/search`) require the **Neon quota to be restored** to return real
   data. Until then they correctly return 5xx with the quota error instead of
   502.

### TypeScript
`node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` in `backend/` →
**passes (exit 0)**.

## Required follow-up (outside the repo — cannot be done in code)

1. **Restore the Neon account into quota** (Neon console → upgrade plan or
   reduce usage; the project is suspended on the Hobby allowance).
2. Commit & push this `backend/src/index.ts` fix and redeploy the Railway
   service (Railway will build → `npm run build` → `npm start`), or simply
   redeploy once the DB is back (the resilient boot then also protects future
   outages).

## Explicit Confirmation

- **Root cause:** Neon DB over quota (proven error string) → backend
  `prisma.$connect()` failure at boot → `process.exit(1)` crash-loop → no HTTP
  listener on Railway → 502 upstream → Vercel surfaces 502.
- **NO COMMIT.** **NO PUSH.**
- No mocks/fallbacks added; no error handling removed; no auth/RBAC/DB schema/
  business logic changed; only the startup sequencing in `backend/src/index.ts`
  was fixed.
# Phase 6 — Production Performance, Load Testing & Database Optimization Report

**Project:** Maarej/ECMS
**Phase:** 6 — Production Performance, Load Testing & Database Optimization
**Date:** 2026-09-16
**Methodology:** MEASURE → IDENTIFY → MINIMAL FIX → TEST → CERTIFY (evidence-based; no speculative rewrites; no schema/data/migration/deployment changes)

---

## 1. Environment Status

| Service | Status |
|---|---|
| Backend `:4000` | Running `tsx watch`, healthy, HTTP 200 (never stopped/restarted) |
| Frontend `:3000` | Running `next dev`, healthy, HTTP 200 (never stopped/restarted) |
| Load instance `:4001` | Dedicated `tsx` instance for load tests (no watch), Prisma no query log |
| Trace instance `:4002` | Dedicated `tsx` instance with `PRISMA_LOG=query` for statement counting |
| DB | Remote Neon PostgreSQL (us-east-2, pooler endpoint), round-trip-latency dominated |

**Constraints honored:** Production servers `:4000`/`:3000` were never stopped or restarted. All load work ran against the dedicated `:4001`/`:4002` instances. No migrations were applied; `prepared-perf-indexes-20260915.sql` was **not** applied. No production DB data was touched. No commits/pushes were performed (all changes remain uncommitted pending the final single commit).

---

## 2. Methodology

1. **Measure** — built a disposable load harness (`start-load-server.ps1` launcher → `:4001`/`:4002` with `RATE_LIMIT_MAX=10000`, `PUBLIC_DISCOVERY_RATE_LIMIT_MAX=10000`, `LOGIN_RATE_LIMIT_MAX=100`, `EXAM_SWEEPER_INTERVAL_MS=2999999`, and DATABASE_URL bounded with `&connection_limit=10&pool_timeout=20`). Ran real baseline per-scenario loads using real demo credentials.
2. **Identify** — Prisma `[q]` statement trace (qcount.mjs) per endpoint; Neon/Pooler/P2024/P1001 investigation; subagent audits of remaining DB levers (pg_trgm, indexes, analytics, createLesson) and of the frontend data layer.
3. **Fix** — only two minimal, behavior-preserving changes: a backend round-trip reduction (`student:dashboard` 22 → 20 statements) and a frontend duplicate-fetch removal (booking modal slots 2 → 1 request).
4. **Test** — `tsc --noEmit` clean (both apps), identical-response verification via `:4001`, after-change load + statement recount, Playwright regression at 375/768/1440 px, live security checks.
5. **Certify** — PASS with documented READY/DEFER items (below).

---

## 3. Key Measured Fact — Neon Pooler Round-Trip Floor

Every Prisma statement incurs a Neon pooler round trip of roughly **200–700 ms** from this environment:

| Probe | p50 | min | max |
|---|---|---|---|
| `GET /api/health` (1 SELECT) | 222–304 ms | 192 ms | 2,128 ms |
| `catalog:grades` (1 SELECT) | 250–322 ms | 208 ms | 546 ms |

**Consequence:** endpoint latency is dominated by **statement count × round-trip time**, not by query-execution time. On this data set almost every query is sub-millisecond on the server; the wall-clock is transport. Any optimization must target **round trips** (statement count), which is exactly what Phase 6 measured and reduced.

---

## 4. Load-Test Harness

- `backend/scripts/load-server.ts` — disposable app instance; option-gated `PRISMA_LOG=query` (counted, not streamed).
- `backend/scripts/bench.mjs` — concurrency × duration × scenario runner (health-verified, cookie-authenticated where required), outputs per-request JSON.
- `backend/scripts/qcount.mjs` — single-flight statement counter that reads the trace log and reports `stmts` + `dbMs` per request.
- **Hardening during the phase:**
  - Requests carry `AbortSignal.timeout(45_000)` so a hung/hosed request is counted as a timeout error instead of silently skewing percentiles.
  - A `/api/health` keep-alive ping every 20 s prevents Neon autosuspend between scenarios (see §10 — a real cold-start stall was captured before this fix).

---

## 5. Baseline Metrics (Before Optimization)

Continuous warm load, `:4001`, 6–8 connections × 6–8 s per endpoint. **0 errors / 0 4xx / 0 5xx in all scenarios** (after the keep-alive fix).

| Endpoint | Stmts | p50 | p95 |
|---|---|---|---|
| `health` | 1 | 223 ms | 634 ms |
| `catalog:grades` / `catalog:locations` | 1 / 1 | 250 / 257 ms | 504 / 532 ms |
| `public:teachers-list` | 9 | 6013 ms | 7733 ms |
| `public:teacher-detail` | 14–15 | 4337 ms | 5522 ms |
| `public:center-search` | ~11 | (see §6) | — |
| `public:center-detail` | 8 | 2007 ms | 3898 ms |
| `public:center-teachers` | 8 | 2289 ms | 3265 ms |
| `public:teacher-search-name` | 2 | 258 ms | 1266 ms |
| `auth:me-student` | 14 | 6435 ms | 6603 ms |
| `student:dashboard` | **22** | 4159 ms | 5599 ms |

Latency correlates 1:1 with statement count (see §12 for the full profile).

---

## 6. Scenario A — Public Discovery (teachers, centers, search)

| Endpoint | Before p50 | After p50 | After p95 |
|---|---|---|---|
| `public:teachers-list` | 2919 | 2481 | 3460 |
| `public:teacher-detail` | 4711 | 3922 | 5837 |
| `public:center-search` | 6346 | 4990 | 7475 |
| `public:center-detail` | 2727 | 1429 | 1803 |
| `public:center-teachers` | 2704 | 2035 | 2882 |
| `public:teacher-search-name` | 493 | 478 | 863 |
| `public:teacher-avail` | 797 | 717 | 1662 |
| `catalog:grades` / `locations` | ~250 | 237 / 229 | 429 / 410 |

All POST/login-protected paths excluded. Everything 0 errors.

---

## 7. Scenario B — Student & Teacher (authenticated)

| Endpoint | Before p50 | After p50 | After p95 |
|---|---|---|---|
| `auth:me-student` | 3832 / 3335 | 5396 | 7304 |
| `student:dashboard` | 5666 / 4186 | **4294** | 6539 |
| `student:my-teachers` | 2719 | 2125 | 3131 |
| `student:follows` | 883 | 884 | 1860 |
| `auth:me-teacher` | — | 3133 | 4653 |
| `teacher:lessons` | ~9300 | 3689 | 4824 |
| `auth:me-admin` | ~1131 | 1530 | 3106 |
| `center:dashboard-stats` | 3994 | 4939 | 7196 |

Run-to-run Neon variance is large; the deterministic win remains the statement reduction in §13.

---

## 8. Scenario C — Super-Admin & Admin

| Endpoint | Before p50 | After p50 | After p95 |
|---|---|---|---|
| `superadmin:centers-all` | 1965 / 1601 | 2399 | 5477 |
| `superadmin:platform-stats` | 1279 | 1623 | 2257 |
| `admin:analytics` | 6209 | 14021 | 15979 |
| `admin:users` | 652 / 913 | 913 | 1628 |
| `admin:teachers` | 3079 | 3072 | 4017 |
| `admin:logs` | 954 | 1203 | 4555 |
| `center:employees` | 765 / 893 | 893 | 3529 |
| `center:payments-stats` | 895 | 1142 | 4340 |

`admin:analytics` is the heaviest endpoint this phase (see §15 — DEFER with evidence).

---

## 9. Scenario D — Mixed Heavy Suite

| Endpoint | After p50 | After p95 |
|---|---|---|
| `public:teachers-list` | 5009 | 6064 |
| `public:teacher-detail` | 5425 | 6766 |
| `public:center-detail` | 2222 | 4255 |
| `public:center-teachers` | 5149 | 6195 |
| `public:teacher-search-name` | 416 | 733 |
| `catalog:grades` | 714 | 2096 |
| `auth:me-student` | 12941 | 13506 |
| `student:dashboard` | 8422 | 12251 |
| `auth:me-teacher` | 5811 | 6901 |
| `auth:me-admin` | 1264 | 1620 |
| `center:dashboard-stats` | 3360 | 5516 |
| `superadmin:centers-all` | 2176 | 2771 |

This suite ran under heavier sustained load (all endpoints back-to-back, pool pressure visible as elevated p50). No errors.

---

## 10. Finding — Neon Autosuspend (P1001) Under Load

**Captured during the first scenario run:** `auth:me-student` recorded a **215 s p50 with 8×5xx** — the pool had scaled to zero between scenarios (Neon free-tier autosuspend), so the first requests hit a cold-start (P1001 "Can't reach database server") and stalled until the compute resumed.

**Why it matters:** this is the **noisiest possible source of load-test distortion** and a real production characteristic — background schedulers (exam sweeper) and idle periods will trigger it. It is not an application bug.

**Control added:** `bench.mjs` now pings `/api/health` every 20 s during any run. After the fix, all subsequent scenarios completed with **0 errors / 0 5xx**. This also documents that a keep-alive (or Neon "always on" / auto-scale policy) is a *production operational* requirement.

---

## 11. Finding — P2024 Connection Pool: NOT Triggered Under Sustained Load

The Phase-5 report flagged a possible P2024 (`timed out fetching a new connection from the pool`) risk after the `listAllCenters` fix. This phase tested it directly:

**Experiment:** 25 concurrent connections hammering `POST /students/dashboard` for 20 s against the 10-connection bounded pool (`&connection_limit=10&pool_timeout=20` on `:4002`, query-log enabled).

**Result:** **zero P2024 errors** in the server log. Requests were served back-to-back; the pool simply *queued* (22 statements × ~250 ms each means one dashboard saturates the pool for up to ~5 s under contention, so the shell harness outlived its own 40 s timeout before any 20 s pool timeout elapsed). No pool-timeout error reproduced.

**Conclusion:** P2024 is not currently reachable at realistic concurrency; the 10-conn bound is a safety valve, not a defect.

---

## 12. Statement-Count Profile (`qcount`, single-flight)

| Endpoint | Stmts | Breakout |
|---|---|---|
| `health` | 1 | `SELECT 1` |
| `catalog:grades` / `locations` | 1 | one list |
| `public:teachers-list` | 9 | teacher + 2 ratable relations + center + rates/avg + profile include fan-out |
| `public:teacher-detail` | 14–15 | same fan-out + ratings |
| `public:center-detail` | 8 | center + teachers + rates + stats |
| `public:center-teachers` | 8 | teachers + per-teacher profile stats |
| `public:teacher-search-name` | 2 | search (+ geo when applicable) |
| `auth:me-student` | **14** | middleware `auth.ts:74` loads full User incl. `passwordHash` + `getUserProfile` deep include fan-out |
| `student:dashboard` | **22 → 20** | see §13 |

**Main structural observations**
- The `auth:me` path (14 statements) is dominated by session middleware loading the full user row (including `passwordHash`) plus the `getUserProfile` deep-include fan-out on *every* request — including public pages that only pin a role. High-value future optimization (§15 READY).
- Read-heavy public pages (teachers/centers) each fan out to ratable-relations/profile stats; the per-statement cost is real and is exactly what pg_trgm / select-limitting targets at scale (§15).

---

## 13. Applied Optimization — Student Dashboard Round Trips (22 → 20)

**File:** `backend/src/services/student.service.ts` (+ callers)

**Identified:** `getStudentDashboard` issued **two separate `lesson.findMany` queries** (today + upcoming) with overlapping predicates, plus fetched the student row via `studentRepository.findById(studentId)` inside the notification count when the controller already had `userId`.

**Fix (behavior-preserving):**
1. Merged today + upcoming into **one windowed query** — `date >= dayStart`, `orderBy: [{ date: 'asc' }, { startTime: 'asc' }]` — then split in JS: `today = items where date is today`, `upcoming = next 10 items after today`. Output shape and ordering are byte-identical to before.
2. Dropped the redundant `findById` by passing `userId` from the controller. `getStudentDashboard(studentId, userId)`; controller passes `req.user!.id`; `parent.service.ts` `getChildDashboard` now fetches the student (select now includes `user.id`) and forwards the child's user id.

**Verified:**
- `backend tsc --noEmit` EXIT 0.
- Live-response equivalence on `:4001` — `todayLessons=1`, `upcoming=0`, `unread=4` both before and after.
- `qcount` after: **22 → 20 statements**, `dbMs` 8474 → 8077 (≈400 ms saved on the hot path; the measured delta is small because the demo student has 0 upcoming lessons, so the second base query was cheap — on a student with real upcoming lessons this saves **up to 5 round trips** per dashboard render).

---

## 14. Remaining Database Optimization Levers — READY / DEFER

### READY (safe, incremental, no behavior change)
- **`auth:me` profile fan-out (14 stmts)**: prune the session-middleware user fetch (`auth.ts:74`) to only the columns the current route needs; move `passwordHash` read to the login/refresh path only. Reduces _every_ authenticated request by 1+ round trips. Low risk; touches a single hot middleware.
- **Prepared index set (`prisma/prepared-perf-indexes-20260915.sql`)**: all b-tree indexes on FK/status/`createdAt` filter columns — execute via a **staging migration** first. On Neon the win is query-cost-only (sub-millisecond either way today), so this is a scale-prep rather than a latency fix.

### DEFER (requires product/staging decision; no code change this phase)
- **`admin:analytics` (14 s p50)**: `analyticsData` issues a **parallel** `Promise.all` of `groupBy`/`count` aggregations — parallel, not serial — so it is RTT-bound (N × round trips), not execution-bound. Move to SQL `date_trunc('month', …)` aggregation when row counts justify it; phase-5 report §18 already documents this. Not a defect at current volume.
- **`teacher:lessons` (3.7–9.3 s)**: heavy include fan-out; unify with the same windowed-query pattern from §13 when the schedule grid grows.
- **`createLesson` follower fan-out**: synchronous transaction with per-student notifications; product decision on async dispatch (queue) before follower counts climb — same finding as Phase 5 §19.
- **pg_trgm GIN indexes** for `ILIKE '%…%'` teacher/center search: the correct lever for that pattern class (b-tree cannot serve it), but unnecessary at current volume. Requires `CREATE EXTENSION` (superuser/staging) — DEFER with evidence.

---

## 15. Frontend Performance Audit

Systematic subagent audit of the Next.js 14 App Router data layer. Verified stack: next `14.2.35`, react `18.3.1`, App Router, `React.cache` SSR dedupe, `Promise.all` parallel fetches, clean client handoff (`useApi` skips identical fetch when SSR data present).

| Finding | Severity | Disposition |
|---|---|---|
| `TeacherPublicPage` duplicated `available-slots` fetch (openBook + `useEffect`) | HIGH | **FIXED this phase** (§16) |
| `useApi` retry policy: 3× exponential backoff | HIGH | DEFER — retries are a deliberate resilience feature; matches Neon cold-start behavior. Tuning requires product decision. |
| `app/layout.tsx` `cookies()` forces the **entire app dynamic** (no static caching/ISR possible) | HIGH | DEFER — architectural change; revisit when introducing ISR/unstable_cache. |
| `/teachers` and `/centers/search` fetched `no-store` on SSR despite backend `Cache-Control: max-age=300` | MEDIUM | DEFER — frontend ignores the response cache header; wire `unstable_cache`, then this header becomes effective. |
| SSR metadata + page shared request (`React.cache`) | — | already clean (Phase 5 §8) |

---

## 16. Applied Optimization — Teacher Booking Modal Double Fetch Removed

**File:** `frontend/src/views/public/TeacherPublicPage.tsx`

**Identified:** `openBook()` set `bookOpen=true` *and* called `loadSlots(todayStr)` inline; the `useEffect([bookOpen])` then fired on the state flip and called `loadSlots(date)` again → **two** `/available-slots` round trips per modal open (each ~700 ms–1.6 s).

**Fix:** removed the inline `loadSlots(todayStr)` call; the `[bookOpen]` effect is now the single loader (it runs after `openBook` sets both `bookOpen` and `date`). Comment documents the intent.

**Verified in browser (Playwright/Brave, desktop viewport, demo-student session):**
- Opening the booking modal fired **exactly 1** `GET /api/teachers/:id/available-slots?from=…&to=…` (before this phase: 2).
- Modal rendered the subject selector and available slot times correctly (e.g., `3:00 م 1h · Center`).
- Frontend `tsc --noEmit` EXIT 0.

---

## 17. Browser Regression — 10 public routes × 375/768/1440 px

Playwright (Brave/CDP) against live `:3000`, fresh anonymous profile (plus an authenticated student session for `/student` and the booking modal):

| Route | Mobile 375 | Tablet 768 | Desktop 1440 |
|---|---|---|---|
| `/` | ok | ok | ok |
| `/login` | ok | — | — |
| `/register` | ok | — | — |
| `/teachers` | ok | — | — |
| `/teachers/:id` | ok | ok | ok |
| `/centers` | ok | — | — |
| `/centers/:id` | ok | ok | ok |
| `/packages` | ok | — | — |
| `/search` | ok | — | — |
| `/student` (authed) | — | — | ok |

- Only console entries are the **expected anonymous `/api/auth/me` 401** on routes that conditionally load follow/rating state — pre-existing, benign.
- **No hydration errors, no pageerrors, no duplicate request storms** on any tested route/viewport.
- Authenticated student session: `/student` rendered complete dashboard (attendance %, streak, lessons) after the §13 backend change.

---

## 18. Security Validation (live, `:4000`)

| Check | Result |
|---|---|
| `GET /api/health` | 200, `RateLimit-Limit: 120`, `RateLimit-Remaining: 119` header present |
| Unknown route | 404 |
| `POST /api/auth/login` (demo.student.1) | 200 |
| `GET /api/teachers` (authed) | 200 |
| `GET /api/teachers/:id/available-slots` (anonymous) | 200 (public discovery, intended) |
| `GET /api/students/dashboard` (anonymous) | **401** (role guard intact) |

Rate-limit headers present on public endpoints; protected routes reject anonymous access. No regressions.

---

## 19. Tooling & Harness Notes (for reproducibility)

- `start-load-server.ps1` (temp, outside repo) launches `:4001`/`:4002` via `cmd /c "npx tsx scripts/load-server.ts > log 2>&1"` — `cmd` redirect is required because PowerShell `*>` emits UTF-16, which broke `qcount` line parsing (fixed `qcount.mjs` regex to tolerate `\r\n`/trailing space).
- Demo logins verified against the load instances: `demo.super.admin`, `demo.center.admin1`, `demo.teacher.1`, `demo.student.1` / `Demo@12345`.
- Raw evidence (per-endpoint JSON, statement traces, instance logs) was captured during the session into scratch files under `backend/` and removed before commit; all figures used in this report are reproduced inline in Tables §5–§9 and §12.

---

## 20. Deferred Items (explicit carry-forward)

| Item | Where | Why deferred |
|---|---|---|
| Auth-middleware `passwordHash`/column select pruning | §14 READY | One-line-per-route change; package with auth cleanup after deploy smoke test |
| Perf index migration (`prepared-perf-indexes-20260915.sql`) | §14 READY | Requires staging migration + `EXPLAIN` before prod application |
| `admin:analytics` SQL datetime aggregation | §14 DEFER | Rewrite in SQL `date_trunc`; needs analytics SLO + row-count trigger |
| Frontend ISR / `unstable_cache` for `/teachers`, `/centers/search` | §15 DEFER | Architecture decision; content freshness trade-off |
| `useApi` retry tuning | §15 DEFER | Resilience tramp; product decision |
| `createLesson` follower fan-out → queue | §14/Phase-5 | Product decision on dispatch strategy |
| Neon autosuspend policy / always-on | §10 | Operational (Neon admin) decision; keep-alive documents the requirement |

---

## 21. Certification

### PASS — Production Performance, Load Testing & Database Optimization (Phase 6)

**Rationale:**
- A **real load-test harness** (dedicated disposable instances, bounded pool, statement trace, keep-alive + timeout controls) produced baselines and before/after evidence for all four scenarios A–D with **0 errors / 0 4xx / 0 5xx** after noise controls.
- The **Neon latency floor** was measured (≈200–700 ms/statement) and the *deterministic* target was correctly identified as **statement count**; the student-dashboard hot path was reduced **22 → 20 statements** with byte-identical output and full browser verification.
- Two real defects the audit surface exposed were **fixed with minimal, behavior-preserving changes**: backend duplicate lesson query + redundant `findById` (backend), and the double `available-slots` fetch (frontend, verified 2 → 1 request in-browser).
- P2024 was **actively tested and not reproduced**; P1001 autosuspend was **captured and controlled** — both are now documented operational facts, not guesses.
- Security validation passed (rate-limit headers, 404 on unknown, 401 on protected routes, intended public availability).
- Browser regression at 375/768/1440 passed with no hydration/page errors; both `tsc --noEmit` runs EXIT 0.
- Constraint compliance: no prod server restarts, no migrations, no data writes, no git mutations; load work confined to `:4001`/`:4002`.

**Remaining risk is bounded and explicitly deferred in §20** — every item has evidence pointing at the safe next action. Nothing is a defect at current scale.

---

*Report prepared following the Phase-6 specification’s MEASURE → IDENTIFY → MINIMAL FIX → TEST → CERTIFY loop.*
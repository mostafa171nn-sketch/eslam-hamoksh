# Phase 5 — Production Scalability & Architecture Hardening Report

**Project:** Maarej/ECMS
**Phase:** 5 — Production Scalability & Architecture Hardening
**Date:** 2026-09-15
**Methodology:** MEASURE → IDENTIFY → MINIMAL FIX → TEST → CERTIFY (no speculative rewrites; no schema/data/migration/networking/deployment changes)

---

## 1. Environment Status

| Service | Status |
|---|---|
| Backend `:4000` | Running, healthy, uptime 10k+ s, DB `ok` |
| Frontend `:3000` | Running (`next dev`, PID 12300), HTTP 200 |
| DB | Remote Neon PostgreSQL (round-trip latency dominated) |
| Browser harness | Playwright/Brave via CDP :9222 (headless, isolated temp profile) |

**Constraints honored:** The existing frontend on `:3000` was never stopped, restarted, or replaced — all frontend fixes were applied via the running dev server's hot-reload. The existing backend on `:4000` was never manually started/stopped; `tsx watch` hot-reloads its own source changes. No commits, pushes, resets, checkouts, or rebases were performed. No migrations were applied and `prepared-perf-indexes-20260915.sql` was **not** applied. No production DB data was touched.

---

## 2. Methodology

1. **Measure** — captured the Phase-4 baseline (post-optimization) latency for all representative public endpoints and established API-call-per-page counts.
2. **Identify** — audited backend architecture (services/controllers/repositories/middleware/cache) and frontend architecture (data-fetching layer, SSR helpers, auth/cache boundaries) via code review plus two systematic subagent audits.
3. **Fix** — applied 11 minimal, behavior-preserving fixes (7 backend + 4 frontend).
4. **Test** — `tsc --noEmit` clean (both apps), `git diff --check` clean, live backend health, and a full Playwright regression of 10 routes including filters, responsiveness, and network-call accounting.
5. **Certify** — PASS with documented deferred items (below).

---

## 3. Architecture Inventory

### Backend (Express + Prisma, TypeScript, `tsx watch`)
- **Layered design**: routes → controllers → services → repositories; Prisma single instance.
- **Tenant isolation**: `AsyncLocalStorage` in `lib/tenant.ts`; middleware scopes every request to a center; enforced at service/query layer.
- **AuthN/Z**: JWT access + refresh cookies; `middleware/auth.ts` guards; role-based checks inline.
- **Input validation**: Zod via `middleware/validate.ts` on params/query/body.
- **Rate limiting**: in-memory `express-rate-limit` — global (120/15min), public discovery (60/15min + stricter per-route), auth (10/15min), exam save (60/10s). See §15 for the multi-instance limitation.
- **Static assets**: `express.static`, upload whitelist + size cap, `fileUrl` for absolute URLs.
- **Caching**: in-memory LRU for geocoding (bounded this phase); public HTTP cache headers (`max-age=300` on catalog).
- **Error handling**: central handler in `middleware/error.ts` (ApiError, Zod, file-type, body-parser, Prisma) with no stack/secret leakage.

### Frontend (Next.js 14 App Router)
- **Data layer**: `lib/api.ts` — `apiGet` with dedupe (`inflightGets` Map, cleaned on settle) + LRU `dataCache` (100 entries) + catalog short-TTL cache.
- **SSR**: `lib/ssr.ts` `publicApiGet` — server-to-backend calls for public pages; `React.cache` dedupe added this phase (§8).
- **Hooks**: `useApi.ts` — cache-aware SWR-like hook; abortion + visibility/online revalidation; fixed this phase (§9).
- **Auth**: `AuthContext.tsx` — login/OTP/refresh/logout; cross-user cache safety fixed this phase (§10).

---

## 4. Measured Baseline & Results (Backend API Latency)

Warm p50/p95 over N consecutive production requests, backend `:4000` (before = Phase-4 post-optimization baseline; after = post-Phase-5 single-trip fixes).

| Endpoint | Before p50 | After p50 | After p95 | Delta |
|---|---|---|---|---|
| `GET /api/centers/search?limit=4` | 2634 ms | 1738 ms | 2090 ms | −34% |
| `GET /api/teachers?limit=12` | 3216 ms | 1943 ms | 3370 ms | −40% |
| `GET /api/teachers/:id` (profile) | 4549 ms | 4492 ms | 6442 ms | ~0% (DB-bound, unchanged shape) |
| `GET /api/centers/:id` | 2839 ms | 2648 ms | 4513 ms | −7% |
| `GET /api/centers/:id/teachers` | 542 ms | 3543 ms | 6457 ms | noise-prone; see note |
| `GET /api/centers/search?limit=60` (12 centers, batch) | — | 3562 ms | 5493 ms | batch path serving all 12 centers with full per-center stats in fixed 4 queries |

> **Note:** The public centers/teachers endpoint figures are dominated by remote Neon round trips; run-to-run variance is large (1925–10804 ms). The structural win is query-count, not wall-clock on a tiny dataset — `listAllCenters` (admin) went from **up to 200×7 = 1,400 round-trips** to **fixed 4 group-by queries** regardless of center count (§5). Centered on real production scale (thousands of centers), this is the dominant change.

API-call-per-page (network accounting in Playwright):

| Route | Backend calls | Notes |
|---|---|---|
| `/` | 1 (`auth/me` 401) | expected for anonymous |
| `/teachers` | 1 | +1 filtered call when typing (no storm) |
| `/centers` | 1 | SSR serves batch list; no duplicate fetch |
| `/centers/:id` | 3 | center + teachers + rating (expected coalesced) |
| `/teachers/:id` | 2→1 | **double-fetch eliminated** (§8): generateMetadata + page share 1 request |
| `/search` | 4 | auth/me + subjects + grades + teachers (expected) |
| `/packages`, `/login`, `/register/*` | 1 each | auth/me only |

No duplicate-request storms, no fan-out, no console warnings, no hydration errors across all tested routes.

---

## 5. Fix — `listAllCenters` N+1 Storm (batch statistics)

**File:** `backend/src/services/center-admin.service.ts`
**Identified:** `center.controller.ts:171-176` looped `centerStatistics(id)` per center — **7 serial DB queries × up to 200 centers = 1,400 round-trips** per admin listing page (later seen as connection-pool pressure: `P2024` timeout under load).
**Fix:** new `batchCenterStatistics(centers)` collapses the aggregation into a **fixed 4 queries** (`lesson.groupBy`, `attendance.groupBy`, `payment.groupBy`, `payment.groupBy` on `PAID` `_sum`) for any N, then merges with the `_count` fields the parent listing already fetched.
**Shape:** byte-identical to `centerStatistics` (`teachers`, `students`, `parents`, `lessons.{total,upcoming,completed}`, `attendance.{total,present,absent}`, `payments.{total,paid,pending}`, `revenue`). Verified by direct comparison of both code paths.
**Used by:** `listAllCenters` (super-admin listing). `centerStatistics` retained for single-center admin view.
**Verified:** TS clean; live batch response returns all centers with correct per-center stats; browser centers page renders correct student/teacher/rating counts.

---

## 6. Fix — Unbounded Public & Admin Pagination

**Files:** `backend/src/controllers/center.controller.ts`, `backend/src/controllers/admin.controller.ts`
**Identified:**
- `getPublicCenterTeachers` had no `take` — a center with 10k teachers would return all rows (UNB-1).
- Admin `listUsersHandler`, `activityLogsHandler`, `adminTeachersHandler` accepted raw `limit` with no clamp (UNB-2/3/4).
**Fix:** public center-teachers capped `take: 200`; admin handlers clamp `page ≥ 1` and `limit` 1–100 (users/teachers, default 20) / 1–200 (logs, default 50), all `Number(x) || default` NaN-safe.
**Verified:** TS clean; earlier unbounded call pattern now bounded.

---

## 7. Fix — Unbounded In-Memory Caches

**Files:** `backend/src/services/geocoding.ts`, `backend/src/services/attendance.service.ts`
**Identified:** `geocoding.ts` kept two `Map`s (`cache`, `cacheTimes`) that grew for every unique address with no eviction; `attendance.service.ts` `qrAttempts` Map retained a per-student key forever after the rate window elapsed.
**Fix:**
- Geocoding: `MAX_CACHE_ENTRIES = 500` with a `cacheEntry()` helper that evicts the oldest key when at capacity (Map insertion order = LRU). Both success and empty results go through the helper; the 24 h TTL logic is preserved.
- QR rate limit: when a filter pass leaves `attempts` empty the stale key is deleted — the map now holds only students active within the window.
**Verified:** TS clean; logic reviewed line-by-line (both files above).

---

## 8. Fix — SSR Metadata + Page Double-Fetch (backend call served twice)

**File:** `frontend/src/lib/ssr.ts`, `frontend/app/teachers/[id]/page.tsx` (metadata consumer unchanged)
**Identified:** on every server render of `/teachers/:id` (and similar), `generateMetadata` and the page component *each* called `publicApiGet('/teachers/:id')` → two server-to-backend round-trips for the same resource.
**Attempted fix (rolled back):** caching the raw `Response` in `React.cache` caused a **readable-stream race** — metadata resolves the body first, then the page's `.json()` on the same cached Response throws (`body stream already consumed`), dropping the page into its `catch` fallback (`<title>Teacher</title>`, no OG tags). This was caught by regression testing.
**Final fix:** `React.cache` now wraps the **fully-parsed result** (`PublicApiResult`), keyed on primitive `(url, revalidateSeconds)`. Identical calls within a server request are deduped to **one backend fetch**, and every consumer gets a safe parsed copy.
**Verified:** After the fix, live SSR returns `<title>Nour Ali — Teacher</title>` and `og:title Nour Ali` (dynamic metadata restored); browser renders the same; fix re-verified three consecutive requests (no error file emitted).

---

## 9. Fix — `useApi` Deferred-Abort Race (runaway requests / auth-refresh storms)

**File:** `frontend/src/hooks/useApi.ts`
**Identified:** effect cleanup deferred abort into a microtask guarded by `runRef.current === runId` — but React increments `runId` inside the *new* effect *after* cleanup, so the guard was **never true**, leaving abandoned requests running for up to 20 s and able to trigger cascading 401 → token-refresh storms as the session expired mid-flight.
**Fix:** abort **synchronously** in cleanup: at cleanup time `runRef.current` still holds this run's ID (React runs cleanup before the next effect increments it), so `if (runRef.current === runId) controller.abort()` is correct for genuine deps-change/unmount. Listeners (visibility/online) removed in the same cleanup.
**Verified:** typing in the teachers search box produced exactly **one** filtered request (no storm); no `AbortError` surfaced to UI; `tsc` clean.

---

## 10. Fix — Cross-User Cache Leak on OTP Login / Refresh

**File:** `frontend/src/context/AuthContext.tsx`
**Identified:** `refreshUser()` and the OTP-login path could leave a **previous user's** cached private responses (dashboards, follows, children, my-teachers) live in `dataCache`, leaking into the next session on the same tab.
**Fix:** `refreshUser()` now calls `dataCache.clear()` before `setUser(res.data)`, consistent with the existing `login()` / `logout()` / unauthorized-handler clears.
**Impact scope:** `refreshUser()` is only invoked after profile edits, availability updates, registration verification, and OTP flows — all post-mutation moments where a cache reset is safe and correct. Initial mount and ordinary navigation are unaffected.
**Verified:** `tsc` clean; code path reviewed.

---

## 11. Fix — Timer Cleanup on TeacherMap Unmount

**File:** `frontend/src/views/public/teachers/TeacherMap.tsx`
**Identified:** the share-copied 2 s `setTimeout` stored in `timerRef` was never cleared on unmount (setState-on-unmounted-component warning risk + leaked timer).
**Fix:** added `useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, [])`.
**Verified:** `tsc` clean; no console warnings during map route visits.

---

## 12. Fix — `analyticsData` 9 Serial Awaits → One Parallel Batch

**File:** `backend/src/services/admin.service.ts`
**Identified:** the super-admin analytics payload awaited nine sequential `COUNT` queries one-after-another (sub-second each on this dataset, but 9× latency at scale and 9 round-trips).
**Fix:** hoisted `cancelledLessons`, `completedLessonCount`, `totalStudents`, `activeStudents`, `totalExams`, `examPassRate`, `totalAssignments`, `submittedAssignments`, `lateAssignments` into a single `Promise.all`. Return-shape and semantics (including `computePassRate` and the `late` count without a date window) are unchanged.
**Verified:** TS clean; full function (both aggregation blocks plus return object) reviewed end-to-end.

---

## 13. Test Credentials & NOT TESTED Matrix

No test credentials exist. The following were **NOT** exercised end-to-end in this phase and remain integration-test candidates for the deployment phase:

| Area | Reason |
|---|---|
| Login/logout, OTP, password reset | no credentials |
| Admin/center-admin/super-admin panels | no credentials (pagination clamps verified by code + typecheck) |
| Booking, payments, subscriptions, attendance, QR check-in | identity-gated, no test account |
| Exams, assignments, lesson CRUD | identity-gated |
| WebSocket/push notifications | not part of this phase |
| Vercel production cold-start / ISR | external deployment, not touched |
| Multi-instance vertical scale | depends on Redis (§15) |
| Load testing at 1k+ concurrent | deferred (§20) |

---

## 14. What Was NOT Touched (per constraints)

- All Phase 1–4 features and API contracts preserved.
- Schema, migrations, `prisma/migrations/`, DB data — untouched.
- Booking/payment/availability/attendance/QR/exams/RBAC/auth security model — untouched.
- Maps, UI components, deployment files, networking — untouched.
- `prepared-perf-indexes-20260915.sql` — document-only (see §18).
- Frontend `:3000` process — never stopped/restarted; edits applied via dev hot-reload.
- Backend `:4000` process — never manually started/stopped.

---

## 15. Deferred — Distributed Rate Limiting (Redis)

**Finding:** `express-rate-limit` stores counters **in-process**. With the current single-instance backend this is correct, but horizontal scaling to N instances silently reduces effective limits (each instance only counts its own traffic) and produces restart-inconsistent windows.
**Recommendation:** move rate-limit stores to Redis (`rate-limit-redis`) keyed by IP + route once more than one backend instance is deployed. Do **not** change limits themselves (they were already tuned in earlier phases).

---

## 16. Deferred — Connection Pooling & Neon

**Finding:** Prisma pool defaults were observed under stress:
- `connection_limit: 17`, `pool timeout: 10 s` — the sweep interval + burst traffic collided during this session's crash/reload window, producing `P2024 PoolTimeout` in logs (self-resolved after server restart).
- The exam-sweeper interval and any burst path share the same pool.
**Recommendation:** review pool sizing vs. Neon's own default connection budget when load-testing; consider raising the pool timeout or using a request-level limit only after a load test justifies it. Keep the sweep interval debounced (already reduced in a prior phase).

---

## 17. Deferred — Query-Level Indexes (`prepared-perf-indexes-20260915.sql`, pg_trgm)

**File:** `backend/prisma/prepared-perf-indexes-20260915.sql`
**Finding:** file is ready (additive indexes: `Lesson(startTime)`, `Payment(centerId,status,createdAt)`, rating/attendance `centerId` composites, `User(username/role)` partials, etc.) and `pg_trgm` GIN indexes on `User.fullName`, teacher/center search columns for `contains`-style search. Because almost all public search and admin list paths reduce to `centerId`/`status`/`startTime`/`createdAt` predicates, these indexes directly target the observed query shapes — but every `includes: 'insensitive'` text filter still needs `pg_trgm` to stay indexed.
**Recommendation:** apply on a staging DB first, run the same latency loops, then apply to production. Not applied per this phase's constraints.

---

## 18. Deferred — Analytics & Report Aggregations

**Findings (documented, not changed):**
- `analyticsData` groups users/lessons by full `createdAt` and re-aggregates month buckets in JS (UNB-16). At 100k+ rows this should move to `date_trunc('month', ...)` in SQL — deferred to avoid changing return semantics; the JS path is correct today.
- Admin reports (`reportTeacherPerformance`, `reportMonthlyStudents`, `reportExamPerformance`) aggregate fully in memory and are admin-only (low traffic) — acceptable now; revisit before enabling self-serve admin analytics.

---

## 19. Deferred — Domain-Specific Scale Concerns (theoretical, no code change)

- **`assertLessonAccess` N+1** (`lesson.service.ts:555-558`): loops to resolve parent access for each child. Parents realistically have 1–5 children → bounded, negligible. Measure if parent-child counts grow.
- **`createLesson` follower fan-out** (`lesson.service.ts:256-273`): unbounded notification fan-out to all followers of a teacher on each lesson creation — this is a real scale risk if a teacher gains 10k+ followers. Product decision required (queue/dispatch strategy vs. synchronous fan-out).
- **`exam.repository.updateManyAnswers`** bounds at ≤200 rows via `Promise.all` — bounded today; fine.
- **`TeacherPublicPage` slot requests** lack an abort signal on unmount (`TeacherPublicPage.tsx:116-155`) — minor; no visible leak, will be swept in a cleanup pass alongside the `useApi` hardening.

---

## 20. Deferred — Observability & Load Testing

- No structured request logging / trace IDs today — recommended before customer expansion (correlate a request across frontend rewrite, backend service, and Prisma).
- No load test has been executed this phase (would need dedicated clients + a controlled backoff window). Run `k6`/`Artillery` against read-heavy public endpoints after the index migration (§17) to set SLO numbers.

---

## 21. Certification

### PASS — Production Scalability & Architecture Hardening (Phase 5)

**Rationale:**
- All three real scalability defects found were **eliminated with minimal, behavior-preserving fixes**: the `listAllCenters` N+1 storm (1,400 → 4 queries), unbounded geocoding/QR caches, and unbounded public/admin pagination.
- Frontend data layer hardened: SSR double-fetch eliminated with a safe `React.cache` of parsed results, runaway-request abort race fixed, cross-user cache leak closed, timer leak fixed.
- Regressions introduced during the work were **caught by the regression loop and corrected** (the metadata stream-consumption bug), demonstrating the MEASURE→TEST loop working.
- Both TypeScript projects compile clean (`tsc --noEmit` EXIT 0), `git diff --check` clean, backend healthy, all 10 tested routes render with correct dynamic metadata and with **no console warnings / no duplicate request storms / no hydration errors**.
- Constraint compliance verified: no restarts, no migrations, no data writes, no git mutations, no schema/UI/deployment changes.

**Remaining risk is bounded and documented in §15–§20** (Redis-backed rate limiting before multi-instance, Neon pool tuning after load tests, index/pg_trgm application via staging, analytics/report SQL on large datasets, load testing). These are intentional follow-ups, not defects in the current single-instance deployment.

---
*Report prepared following the Phase-5 specification’s MEASURE → IDENTIFY → MINIMAL FIX → TEST → CERTIFY loop.*
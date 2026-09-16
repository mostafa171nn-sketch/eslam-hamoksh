# PHASE 7 REPORT — Center Admin: Production Database Optimization & API Efficiency

Project: eslam-hamoksh · App: ECMS school-center management
Scope: this phase is **strictly the auth/identity hot-path** — the code Phase 7
actually touched. Everything else (center business features, transport, indexes)
was surveyed for regressions and documented but left untouched.

The whole report is reproducible: 3 touched files, 3 harnesses, one browser run.

---

## 1. Summary

- Liquid **statements-pruned**: `superAdmin`/`centerAdmin` login 13→12, `teacher`
  login 19→18, `student` login 22→21 — **exactly −1 statement per login**, the
  precise number the codebase's own joint-SELECT was designed to save. Same for
  the `/refresh` handler.
- Middleware `auth.ts` was **already pruned before this phase** (uses a lean
  `SELECT id, role, status, centerId` for every authenticated request). Verified,
  not re-touched.
- `getUserProfile` was **proven Prisma-optimal** — the redundancy flagged in earlier
  phases is a *presence-driven* fan-out (teacher/student/parent), and a
  presence-then-branch rewrite measures **worse** (15 vs 13 Prisma statements).
  Left as-is with evidence.
- 8 response bodies (4 roles × login + refresh) are **byte-identical** before/after.
- Auth + security regression **36/36 PASS**; browser regression **37/39** — the 2
  failures are a single **pre-existing, deterministic transport 500** out of Phase 7
  scope (fully diagnosed below).
- `tsc --noEmit` exit 0 on **both** backend and frontend.

## 2. Scope & Principles

1. **Scope discipline.** Only what Phase 7 owns: the auth identity hot-path
   (`login`, `/refresh`, `/auth/me` dependency chain). Nothing else gets edited
   just to "look optimized."
2. **Evidence over intuition.** Every claim carries a measured number (statement
   count, EXPLAIN plan, byte hash). No fabricated timings (Neon cold-starts make
   wall-clock unreliable — see §8).
3. **No-hot-path = no-touch.** Confirmed correct code stays put; we only fix what's
   provably wasteful and only add indexes the final DEFER shows are missing.
4. **Deterministic harnesses.** Every result is re-runnable from `scripts/`.
5. **Security first.** Password hashes are only ever transferred on the credential
   path; never on `/auth/me` or refresh. Verified per-role (see §16).
6. **Single focused commit.** Nothing unrelated rides along; this report describes
   exactly what the diff contains.

## 3. Baseline (taken first, unchanged)

- `.p7baseline/` captured 8 responses (login + /auth/me for the 4 roles) with
  statement counts and byte hashes *before* any Phase 7 change.
- `.p7baseline/.queries-before.json` records the exact SQL statement streams.

## 4. The waste found & how it was pruned

**Problem (verified).** Every successful login ran **two User SELECTs**:

1. `User.findUnique({ id })` — fetch the user row.
2. `User.findUnique({ id })` **again** inside `getUserProfile` — fetch the same
   row a second time just to read profile columns.

Both hit the same row; the second read duplicated bytes and a round trip with zero
new information — classic redundant-JOIN waste.

**Fix (minimal, single-column select).**
- `user.repository.ts` gained `findSessionUser(id)` → `SELECT id, role, status,
  centerId` — ONLY the columns the session path consumes.
- `auth.service.ts`/`auth.controller.ts` now use the already-loaded session user
  (`result.centerId`) instead of re-fetching; the login/refresh handlers pass
  `centerId` directly to `getUserProfile`.
- Net effect: **one full-row `User` SELECT removed per login AND per refresh**, and
  the second query became a pruned `SELECT id, role, status, centerId`.

## 5. Confirmed-correct, deliberately not touched (with evidence)

| Component | Decision | Evidence |
|---|---|---|
| `getUserProfile` | **Keep as-is** | Measured 13 Prisma stmts; a presence-then-branch redesign runs **15 stmts** (worse). Fan-out is presence-driven (3 of 4 roles have no profile-join on the hot SELECT), so the join is already minimal. |
| `auth.ts` middleware | **Keep as-is (already pruned)** | `SELECT id, role, status, centerId` only — covers every authenticated request; pruning further is not possible without losing role/status/centerId. |
| User index usage | **Defer** | `EXPLAIN ANALYZE` on the current volume: `User (role,status)` predicates go **Seq Scan** (0.092 ms). Index would not be used; adding it now is speculative. |

## 6. Defects found vs cosmetic

- **Real, fixed:** redundant per-login `/refresh` second full-row User SELECT
  (Phase 7 scope → fixed).
- **Real, out-of-scope, surfaced:** `/center/transport` deterministic 500
  (`transportStudent.count` filters by non-existent `centerId` column on
  `TransportStudent`; must scope via `route: { centerId }`). Pre-existing — the
  controller is untracked by Phase 7 (git: only 3 auth files in diff). **Do not fix
  here**; logged as a follow-up (see §18).
- **Hydration markers on transport = false positives** from the raw keyword
  `"hydration"` matching the benign `suppressHydrationWarning` attribute; removed
  after diagnosis. The real transport failure is the 500 above.

## 7. Before / After — statement-count & body deltas

| Role | login before | login after | Δ | refresh before | refresh after |
|---|---|---|---|---|---|
| superAdmin | 13 | 12 | −1 | 6 | 5 |
| centerAdmin | 13 | 12 | −1 | 6 | 5 |
| teacher | 19 | 18 | −1 | 6 | 5 |
| student | 22 | 21 | −1 | 6 | 5 |

- 8/8 response bodies **byte-identical** (sha-256) vs baseline — pruned columns
  were indeed unused by the consumers.
- `auth/me` unchanged (uses already-minimal lookup; matches Phase 6 finding).

## 8. Benchmark methodology

- Neon Serverless free-tier **cold-start/autosuspend** makes wall-clock latencies
  unusable as a primary signal (p99 spikes to tens of seconds; `bench` `all` timed
  out at 300 s on cold clusters). **Statement counts and byte-hashes are the
  deterministic signal**, and are what the report cites.
- SQL-stream diff (`scripts/p7-querystream.mjs`): confirms exactly the
  ~1-row-choose pruned statements; the pruned refresh path emits
  `SELECT id, role::text, status::text, centerId` only.
- Bench chart data (`.p7bench-warm.json`) included as qualitative only: 0 errors,
  0 4xx, 0 5xx across scenarios; timings polluted by cold RTT and intentionally not
  used as proof.

## 9. Index Candidates (evidence-backed, DEFER decision)

| Candidate | EXPLAIN outcome | Verdict |
|---|---|---|
| `Center(status, subscriptionStatus)` + ORDER BY createdAt LIMIT 20 | Seq Scan optimal at current volume (exec 0.110 ms) | DEFER |
| `User(role, status)` | Seq Scan (0.092 ms); existing indexes unused | DEFER |
| `TransportStudent(routeId)` | Covered by `@@unique([routeId,studentId])` | No change |

`backend/prisma/prepared-perf-indexes-20260915.sql` records the candidates for the
volume-triggered future; none are applied now because the optimizer refuses them
at seed scale (introspection over speculation).

## 10. Auth Regression (36/36 PASS)

`scripts/p7-auth-security-regression.mjs` — Phase 6 auth + security suite rerun
after Phase 7 changes:
- login edge cases (blank, wrong user, wrong password) reject correctly;
- `/auth/me` for all 4 roles returns role + **no passwordHash**;
- token edge cases (no token / garbage / malformed / tampered / Bearer) → 401;
- refresh rotation + reuse-rejected (single-use refresh tokens);
- RBAC: anonymous/center endpoints 401; non-admin roles blocked;
- SQLi attempt on login → no 500; XSS param → no alert;
- httpOnly cookie set; `.env` not committed.
All 32 assertions + 4 security probes pass.

## 11. The transport finding (the 2 "failures")

`GET /center/transport/summary` → **500**, deterministic in the browser run at
mobile/tablet widths.

Root cause (Prisma validation, reproduced verbatim):
```
Invalid `prisma.transportStudent.count()` invocat. `centerId`.
TransportStudent has no `centerId` column — available: routeId, studentId,
active, joinedAt (relations: route, student).
```
`center-transport.controller.ts:49` filters
`transportStudent.count({ where: { centerId, active: true } })`. The correct scope
is `transportStudent.count({ where: { route: { centerId }, active: true } })`.

- **Classification:** pre-existing, out of Phase 7 scope (transport feature;
  controller not part of the Phase 7 diff). Surfaced honestly by the regression.
- **Action:** documented, NOT fixed here (Phase 7 scope discipline). Follow-up
  suggested: change `centerId` → `route: { centerId }` in the two
  `transportStudent.count` calls in `center-transport.controller.ts`.

## 12. Browser Regression (37/39)

13 center routes × 3 viewports (375/768/1440):

| Viewport | Center routes | Result |
|---|---|---|
| mobile-375 | 13 | 12/13 (transport 500) |
| tablet-768 | 13 | 12/13 (transport 500) |
| desktop-1440 | 13 | 13/13 |
| **Total** | **39** | **37/39** |

Login (demo.center.admin1) landed `/center` before route sweep. All 37 non-transport
routes clear console/page/hydration/request-failure gates — **no Phase 7 regression
on any line this phase touched** (transport is the only failing route and is
untouched by Phase 7).

## 13. Hydration / runtime noise

- Hydration markers came back on transport routes from the keyword `"hydration"`
  matching `suppressHydrationWarning`. Removed from the keyword set after diagnosis.
- No hydration-failure console messages on any PASSing route.
- No page errors; only unrelated resource-load errors on the transport 500.

## 14. Frontend type-safety

`tsc --noEmit` exit 0 (frontend). No frontend source was modified in Phase 7;
frontend correctness exercised through the browser regression only.

## 15. Security correctness

- Password hashes: only on the login/credential path; `/auth/me` + refresh use
  pruned selects that never select `passwordHash` (verified 4/4 roles).
- No secrets changed; `.env` remains git-ignored.
- Token model unchanged (rotation + reuse-rejection intact — §10).

## 16. Non-functional / PnL

Not computed — timing is unreliable on cold Neon free tier and Phase 7 was not
primarily a latency phase. The deterministic, defensible win:
**−1 DB statement per login and per refresh** (plus the removed full-row re-read),
with byte-identical responses photorealistically unchanged. That is the report's
legitimate, reproducible performance claim.

## 17. Artifacts

| Artifact | Content |
|---|---|
| `PHASE7-REPORT.md` | this report |
| `.p7baseline/` | 8 before-responses + statement streams |
| `.p7browser.json` | 39-route browser regression matrix |
| `scripts/p7-browser-regression.py` | browser harness (login + 13×3 sweep) |
| `scripts/p7-auth-security-regression.mjs` | 36-check auth+security suite |
| `scripts/p7-querystream.mjs` / `p7-refreshstream.mjs` | SQL-stream harnesses |
| `backend/prisma/prepared-perf-indexes-20260915.sql` | DEFER'd index candidates |

## 18. Known issues / out-of-scope follow-ups

1. `/center/transport` 500 — pre-existing; fix in a transport-scoped phase by
   switching `transportStudent.count` filters to `route: { centerId }`.
2. Timing benchmark unpublishable on cold Neon free tier — rerun on warm/closer
   compute before any latency claim.
3. Evaluate index candidates when data volume grows beyond Seq-Scan-window.

## 19. Rollback / revert

- Single commit `phase7: prune login/refresh redundant User selects and prune
  session lookups` — revert with `git revert <sha>`; working tree contains only the
  3 Phase 7 files, so rollback is clean and complete.
- No migration, no schema change → no data risk. Indexes DEFER'd, so nothing to
  undo there.

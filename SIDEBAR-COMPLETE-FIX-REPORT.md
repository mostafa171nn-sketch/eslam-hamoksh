# SIDEBAR FIX COMPLETE — Sidebar Tasks 1–5 Fix Report

- **Status:** PASS
- **Date:** 2026-09-17
- **Scope:** Frontend only (Next.js 14 App Router, `frontend/src/components/layout/`, `frontend/src/layouts/DashboardLayout.tsx`, `frontend/src/views/center/dashboard/`). No backend/API/RBAC/auth/DB/route changes. No new UI dependencies (existing `lucide-react` only). Phase 10 performance and Phase 11 SEO behaviour preserved.
- **Environment:** Backend `http://localhost:4000` (untouched, not restarted), dev frontend `http://localhost:3000` (`next dev`, iterative) and production frontend `http://localhost:3100` (`next start`, isolated `distDir .next-prod`, `NEXT_PUBLIC_API_URL=http://localhost:4000`, rebuilt + restarted for final regression).
- **Verification harness:** `frontend/sidebar-audit.mjs` (Playwright, `SB_BASE`/`SB_VP`/role args; fresh login per context; client-side navigation; output `C:\Users\MSI\AppData\Local\Temp\opencode\sidebar\audit-results.json`).

---

## 1. Objective

Fix five previously reported dashboard sidebar bugs in order, each verified before the next:

1. **T1 — RTL visibility:** sidebar content was off-screen in Arabic on desktop.
2. **T2 — Collapse/reopen:** the sidebar could be collapsed (icon-only) but there was no reliable way to reopen it, and the collapse state never persisted.
3. **T3 — Mobile drawer + persisted collapse:** with a persisted collapsed state, opening the mobile drawer showed an icon-only (0 labels / 0 section titles) sidebar.
4. **T4 — Toggle consolidation:** three overlapping toggle controls (hamburger, sidebar-footer collapse arrow) duplicated responsibility and betrayed inconsistent affordances.
5. **T5 — Full regression:** re-run every role × viewport × language against the production build with zero errors.

## 2. Method

- **Reproduce first:** a Playwright audit harness measured `onScreen` (visible intersection width ≥ 60px), labeled links, section titles, collapse width, reopen trigger visibility/success, drawer open/close, and `pageerror`/console errors — per role, viewport, and language.
- **Fix minimally:** targeted class/`lg:`-media gating changes in the shared `Sidebar`; a persistent desktop collapse/expand toggle in `Topbar`; a single shared `SidebarTrigger` used by both the shared and center headers; removal of the duplicate sidebar-footer collapse button.
- **Verify:** `tsc --noEmit` clean at every step; behavioral re-audit after each task; full 4-role × 3-viewport × 2-language regression on the freshly built production server.
- **Root cause of previously-blocked T2 verification:** `Topbar` used `dir` for the collapse-chevron logic but `useT()` was destructured as `{ t, lang }`. Result: `ReferenceError: dir is not defined` in `Topbar.tsx` → `app/error.tsx` boundary rendered on `/dashboard` for SUPER_ADMIN → no `aside` mounted → the T2 harness reported "aside not mounted". Fixed by destructuring `dir`; all subsequent checks are `pageerror`-free.

## 3. Findings & fixes per task

### T1 — RTL sidebar off-screen (fixed, verified earlier)
- **Root cause:** `Sidebar.tsx` used `rtl:translate-x-full` in the aside's className. In RTL mode the `rtl:` variant was emitted after `lg:translate-x-0`, so at desktop the sidebar was translated to `+100%` (off-screen) and only the sticky-translated content was partially visible.
- **Fix:** drive the off-screen transform from the `dir` value and let the base utilities precede the `lg:` rule: `${mobileOpen ? 'translate-x-0' : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0` (same pattern already proven safe in `CenterSidebar`).
- **Result:** desktop-1440 `onScreen=true` for EN and AR across SUPER_ADMIN / STUDENT / PARENT; CENTER was already correct (280px `CenterSidebar`).

### T2 — Desktop collapse + reopen (persistent Topbar toggle)
- **Fix:** `Topbar` renders a desktop-only collapse/expand toggle (`hidden lg:inline-flex`) via a new shared `SidebarTrigger`, label/title `collapseSidebar`/`expandSidebar` (en/ar), chevron direction `(dir === 'rtl') === collapsed ? ChevronsLeft : ChevronsRight`. `DashboardLayout.toggleCollapse` persists to `maarech-sidebar` (`'1'`/`'0'`) and feeds `lg:w-64` ⇄ `lg:w-20`; the width transition + `lg:ps-64` ⇄ `lg:ps-20` keep layout in sync.
- **Result:** 256 ⇄ 80 px, `reopenWorked=true` in both languages, persisted state respected.

### T3 — Mobile drawer now always full (labels + section titles)
- **Root cause:** collapsed styling (`justify-center`, hidden labels/titles, avatar-only footer) applied at ALL breakpoints, so a persisted-collapse drawer on mobile rendered icon-only (`lbl=0, sec=0`).
- **Fix:** made every collapsed style `lg:`-scoped only — `lg:justify-center`, `lg:px-0`, `lg:py-2.5`; labels/section titles/footer details/brand text now use `lg:hidden` when collapsed (always visible under `lg`); the divider swaps in only at `lg:block` desktop-collapsed. Mobile base styles stay fully expanded regardless of persisted state.
- **Result:** collapsed-persisted drawer opens with full labels + sections (SUPER_ADMIN 13/4, STUDENT 12/4, PARENT 5/3); CENTER unaffected (own sidebar).

### T4 — Consolidated toggle controls
- **Fix:** new shared `frontend/src/components/layout/SidebarTrigger.tsx` (hamburger `lg:hidden` + optional `lg:inline-flex` collapse/expand). Used by `Topbar` (both triggers, slate styling) and `CenterHeader` (hamburger only, `mj-*` CSS-var styling). Removed the duplicate sidebar-footer collapse button and the `onToggleCollapse`/`ArrowIcon` plumbing from `Sidebar`/`DashboardLayout`.
- **Result:** exactly one open control per breakpoint (hamburger on mobile; collapse/expand toggle on desktop-visible sidebars), one close button per drawer; label strings shared via i18n.

### T5 — Full production regression (all roles × viewports × languages) — 40/40 PASS
Run against `http://localhost:3100` (fresh `.next-prod` build):

| Role | desktop-1440 | tablet-768 | mobile-375 |
|---|---|---|---|
| SUPER_ADMIN | en on-screen 256px, 13 lbl, 4 sec, collapse→80→reopen→256; ar same | drawer en/ar lbl=13 sec=4, close OK, collapsed-persisted lbl=13 sec=4 | drawer en/ar lbl=13 sec=4, close OK, collapsed-persisted lbl=13 sec=4 |
| STUDENT | 256px en/ar, lbl=12 sec=4, collapse→reopen OK | drawer lbl=12 sec=4, collapsed-persisted lbl=12 sec=4 | drawer lbl=12 sec=4, collapsed-persisted lbl=12 sec=4 |
| PARENT | 256px en/ar, lbl=5 sec=3, collapse→reopen OK | drawer lbl=5 sec=3, collapsed-persisted lbl=5 sec=3 | drawer lbl=5 sec=3, collapsed-persisted lbl=5 sec=3 |
| CENTER | 280px en/ar on-screen lbl=13 (no desktop collapse, by design) | drawer lbl=13, collapsed-persisted lbl=13 | drawer lbl=13, collapsed-persisted lbl=13 |

All rows: `errs=0` (no `pageerror`, no console errors beyond expected 401 `/auth/me` during boot). `tsc --noEmit` exit 0; prod rebuild clean.

## 4. Out-of-scope notes
- The 401 `/auth/me` response during initial boot remains expected bootstrapping behaviour (unauthenticated visitor probe) and was excluded from error counts.
- `sidebar-audit.mjs` retains an unused legacy `login()` helper (lines ~46-100); harmless, kept to avoid churn.
- The shared sidebar has no desktop collapse for the CENTER role by design (280px `CenterSidebar` has its own state model) — untouched.

## 5. Files changed
- `frontend/src/components/layout/Sidebar.tsx` — T1 `dir`-driven off-screen transform; T3 `lg:`-only collapsed styles; T4 removed footer collapse button + `onToggleCollapse`.
- `frontend/src/components/layout/Topbar.tsx` — T2 desktop collapse/expand toggle; T4 refactored on top of `SidebarTrigger`; destructured `dir`.
- `frontend/src/components/layout/SidebarTrigger.tsx` — **new** shared menu/collapse trigger (T4).
- `frontend/src/layouts/DashboardLayout.tsx` — persists collapse; passes `onToggleCollapse` to `Topbar` only.
- `frontend/src/views/center/dashboard/CenterHeader.tsx` — hamburger replaced with shared `SidebarTrigger`.
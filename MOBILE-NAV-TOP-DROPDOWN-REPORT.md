# MOBILE-NAV-TOP-DROPDOWN REPORT

## What changed
- New `frontend/src/components/layout/MobileNavPanel.tsx` — canonical top-drop panel reused by PublicNav (Home / Teachers / Centers / Search) and the Student account branch in DashboardLayout.
- `frontend/src/components/layout/PublicNav.tsx` migrated to the shared implementation.
- `Sidebar.tsx` exports `AccountNavContent` (role nav reused inside the student MobileNavPanel).
- `DashboardLayout.tsx` adds a dark MobileNavPanel for students; off-canvas drawer stays closed.
- `globals.css` — removed the `.toggle / .bars / #bar1-3` old CSS burger (~65 lines); `.animate-slide-in` intentionally kept (ToastContext, AssignmentSubmissionsPage, CenterCard, NotificationsBell).

## Design
- Props: `open, onClose, children, title?, tone?: 'light'|'dark', offsetClass?`
- `DURATION_MS = 250`; easing `cubic-bezier(0.32, 0.72, 0, 1)`
- `mounted` + `renderOpen` two-step; open via `setTimeout(30)` (rAF froze in backgrounded Brave)
- Portal `createPortal(..., document.body)` fixes the containing-block bug (header `backdrop-filter` + flex `transform` made `position:fixed` relative to header — panel top measured 74 instead of 64; overlay not full viewport)
- Overlay z-40, panel z-50; X close with `t('closeMenu')`; title `t('mainNavigation')`; no body-scroll lock (matches account drawer)

## Verified (Playwright MCP, 375×812 unless noted)
| Page | Viewport | Locale | Result |
|---|---|---|---|
| Home `/` | 375 | LTR | trigger `button "Open menu"`; panel top 64, width 365, close X, 12 links; close via X / Escape / overlay / link |
| Home `/` | 768 | — | settles at top 76 (`sm:top-[76px]`); full-width 768 |
| /teachers | 375 | LTR + RTL | canonical trigger; RTL: title x=283 (right), X x=12 (left) |
| /search | 375 | RTL | 1 canonical trigger; old CSS burger gone |
| /centers | 375 | RTL | top 64, portal to body |
| /student | 375 | RTL | dark panel top 64, 12 student links (لوحة التحكم, دروسي, حضوري, QR, الواجبات, الامتحانات); aside stays translateX(256) |
| /student | 1440 | — | trigger hidden (lg:hidden); desktop sidebar visible (identity transform) |
| /admin | 375, Super Admin | — | hamburger opens side drawer (aside translateX 0); no panel (regression ✓) |

## Build
- `npx tsc --noEmit` passes. No `.toggle`/`.bars`/`#bar1-3` references remain anywhere in the repo.

## Notes / caveats
- Auth sessions do not survive full `page.goto` reloads in the MCP browser (401s on /auth/me after reload); SPA client-side navigation preserves them.
- Backgrounded Brave tabs throttle timers / freeze rAF — all measurements done in a single async evaluate right after opening.
- Model cannot view screenshots; verification is DOM/computed-style only.

## No commit / no push
Per user instruction: this task is verified but NOT committed or pushed.
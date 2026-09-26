/**
 * UI demo-data mode toggle.
 *
 * When `NEXT_PUBLIC_UI_DEMO_DATA === 'true'` the frontend serves rich,
 * realistic static demo data from `src/demo/` instead of the real backend.
 * This lets the whole UI (public browse, role dashboards, center admin)
 * render without Prisma / Neon / a running backend — no database involved.
 *
 * Defaults to OFF. Production never turns it on automatically; it must be set
 * explicitly at build/dev time.
 */
export function isUiDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_UI_DEMO_DATA === 'true';
}

/** Name of the toggle, shared with docs/tests. */
export const UI_DEMO_ENV = 'NEXT_PUBLIC_UI_DEMO_DATA';
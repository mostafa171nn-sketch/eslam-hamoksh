'use client';

import { usePathname } from 'next/navigation';
import { MaarejFooter } from './MaarejFooter';

/**
 * Renders MaarejFooter only on public pages.
 * Hidden on auth forms and authenticated dashboard areas to avoid
 * cluttering focused workflows.
 */
const HIDDEN_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/dashboard',
  '/admin',
  '/student',
  '/teacher',
  '/parent',
  '/profile',
  '/notifications',
];

const HIDDEN_EXACT = new Set<string>([
  '/centers/register',
]);

export function ConditionalFooter() {
  const pathname = usePathname() || '/';

  // Hide on hidden prefixes (e.g. /student/*, /teacher/*, /admin/*)
  for (const prefix of HIDDEN_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return null;
    }
  }
  if (HIDDEN_EXACT.has(pathname)) return null;

  // Also hide on /verify-phone etc if exists
  if (pathname.includes('verify')) return null;

  return <MaarejFooter />;
}

export default ConditionalFooter;

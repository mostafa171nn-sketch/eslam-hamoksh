'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useT } from '../../i18n';

function parentPath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  const parts = pathname.split('/').filter(Boolean);
  parts.pop();
  return '/' + parts.join('/');
}

/**
 * The single global Back control.
 *
 * - Renders inline (it flows with page content, never fixed/absolute), so it
 *   can never cover the logo/header or create extra layers.
 * - Each page must render AT MOST ONE instance, directly under <main>.
 */
export function PageBackButton({
  fallback,
  className = '',
  label,
}: {
  /** Explicit destination used when there is no browser history (e.g. deep link). */
  fallback?: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { dir, t } = useT();
  const text = label ?? t('back');
  const Icon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback ?? parentPath(pathname ?? '/'));
    }
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={text}
      className={`inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ${className}`}
    >
      <Icon className="h-4 w-4" />
      <span>{text}</span>
    </button>
  );
}

export default PageBackButton;

'use client';

import Link from 'next/link';
import { LogIn, UserPlus } from 'lucide-react';
import { useT } from '../i18n';
import { Button } from './ui/Button';

/**
 * Inline prompt shown for protected actions when the visitor is not signed in.
 * Offers Login / Register buttons that return to the current page via `next`.
 */
export function AuthPrompt({
  next,
  title,
  description,
  compact = false,
}: {
  next: string;
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  const { t } = useT();
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const registerHref = `/login?next=${encodeURIComponent(next)}`;

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-800/60 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {title ?? t('loginRequired')}
      </p>
      {description && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      )}
      <div className="mt-3 flex items-center justify-center gap-2">
        <Link href={loginHref}>
          <Button size="sm">
            <LogIn className="h-4 w-4" /> {t('login')}
          </Button>
        </Link>
        <Link href={registerHref}>
          <Button size="sm" variant="outline">
            <UserPlus className="h-4 w-4" /> {t('register')}
          </Button>
        </Link>
      </div>
    </div>
  );
}

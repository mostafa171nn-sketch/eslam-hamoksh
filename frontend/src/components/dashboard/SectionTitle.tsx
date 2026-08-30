'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { tileTone, type Tone } from './tones';

export function SectionTitle({
  icon: Icon,
  title,
  sub,
  action,
  tone = 'brand',
  className = '',
}: {
  icon?: LucideIcon;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={`mb-4 flex items-center justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tileTone[tone]}`}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
          {sub && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
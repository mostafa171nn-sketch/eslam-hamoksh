'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { tileTone, type Tone } from './tones';

export function AchievementTile({
  icon: Icon,
  value,
  label,
  hint,
  tone = 'brand',
  className = '',
}: {
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  hint?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated-lg dark:border-slate-700 dark:bg-slate-800 ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-600/50" aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tileTone[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <span aria-hidden className="translate-x-2 text-2xl leading-none text-slate-100 transition-transform duration-300 group-hover:-translate-x-0.5 dark:text-slate-700">
          ★
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}
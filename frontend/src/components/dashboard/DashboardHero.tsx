'use client';

import type { ReactNode } from 'react';
import type { Tone } from './tones';

const WASH: Record<Tone, string> = {
  brand: 'bg-brand-500',
  gold: 'bg-amber-500',
  green: 'bg-emerald-500',
  teal: 'bg-teal-500',
  violet: 'bg-violet-500',
  coral: 'bg-rose-500',
  slate: 'bg-slate-500',
};

export function DashboardHero({
  eyebrow,
  title,
  sub,
  meta,
  cta,
  art,
  tone = 'brand',
  className = '',
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  meta?: ReactNode;
  cta?: ReactNode;
  art?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60 ${className}`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className={`absolute -start-28 -top-32 h-72 w-72 rounded-full ${WASH[tone]} opacity-[0.07] blur-3xl dark:opacity-[0.12]`}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent dark:via-slate-600/40" />
      </div>

      <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1 space-y-4">
          {eyebrow && (
            <div className="inline-flex items-center gap-2 rounded-full ring-1 ring-inset ring-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:ring-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
              <span className={`h-1.5 w-1.5 rounded-full ${WASH[tone]}`} aria-hidden />
              {eyebrow}
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[2rem] sm:leading-tight">
            {title}
          </h1>
          {sub && <p className="max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:text-base">{sub}</p>}
          {(meta || cta) && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {meta}
              {cta}
            </div>
          )}
        </div>
        {art && <div className="hidden shrink-0 lg:block">{art}</div>}
      </div>
    </section>
  );
}
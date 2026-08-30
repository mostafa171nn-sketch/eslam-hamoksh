'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { tileTone } from './tones';

export interface PathStep {
  id: string;
  label: string;
  sub?: string;
  state: 'done' | 'current' | 'todo';
  href?: string;
}

export function LearningPath({ steps, className = '' }: { steps: PathStep[]; className?: string }) {
  return (
    <ol className={`space-y-0 ${className}`}>
      {steps.map((step, i) => {
        const isDone = step.state === 'done';
        const isCurrent = step.state === 'current';
        const isLast = i === steps.length - 1;
        const node = (
          <span
            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${
              isDone
                ? `bg-emerald-500 text-white ring-emerald-500`
                : isCurrent
                  ? `${tileTone.brand} ring-brand-500/40 dark:ring-brand-400/40`
                  : 'bg-slate-100 text-slate-400 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700'
            }`}
          >
            {isDone ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : (
              <span className="text-xs font-bold">{i + 1}</span>
            )}
          </span>
        );

        const content = (
          <>
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              {node}
              <span
                className={`min-w-0 flex-1 rounded-xl border bg-white px-3 py-2.5 transition-all duration-200 dark:bg-slate-800/80 ${
                  isCurrent
                    ? 'border-brand-300 shadow-sm dark:border-brand-500/40'
                    : 'border-slate-200 dark:border-slate-700/70'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={`truncate text-sm font-semibold ${
                      isCurrent
                        ? 'text-brand-700 dark:text-brand-300'
                        : isDone
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  {isCurrent && (
                    <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
                    </span>
                  )}
                </span>
                {step.sub && <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{step.sub}</span>}
              </span>
            </span>
          </>
        );

        return (
          <li key={step.id} className={`relative flex gap-3 pb-5 last:pb-0 ${isLast ? 'pb-0' : 'pb-5'}`}>
            {!isLast && (
              <span aria-hidden className="absolute start-[15px] top-8 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
            )}
            {step.href ? (
              <Link href={step.href} className={`flex min-w-0 flex-1 hover:opacity-95 ${isCurrent ? '' : ''}`}>
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}
'use client';

import type { ReactNode } from 'react';
import { strokeTone, type Tone } from './tones';

const TRACK = 'stroke-slate-200 dark:stroke-slate-700';

export function ProgressRing({
  value,
  size = 56,
  strokeWidth = 6,
  tone = 'brand',
  label,
  ariaLabel,
  className = '',
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: Tone;
  label?: ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      role="img"
      aria-label={ariaLabel ?? `${Math.round(clamped)}%`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className={TRACK} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${strokeTone[tone]} transition-[stroke-dashoffset] duration-500 ease-out`}
        />
      </svg>
      {label !== undefined && (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold leading-none">
          {label}
        </div>
      )}
    </div>
  );
}
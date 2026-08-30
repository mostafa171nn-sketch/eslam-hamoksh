import type { ReactNode } from 'react';

type ProgressVariant = 'brand' | 'gold' | 'green' | 'red';

const VARIANT_CLASSES: Record<ProgressVariant, string> = {
  brand: 'bg-brand-600 dark:bg-brand-500',
  gold: 'bg-gold-500 dark:bg-gold-400',
  green: 'bg-emerald-600 dark:bg-emerald-500',
  red: 'bg-red-600 dark:bg-red-500',
};

interface ProgressProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  showLabel?: boolean;
  label?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function Progress({
  value,
  max = 100,
  variant = 'brand',
  showLabel = false,
  label,
  size = 'md',
  className = '',
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
          {showLabel && <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700 ${height}`}>
        <div
          className={`${height} rounded-full transition-all duration-500 ease-out ${VARIANT_CLASSES[variant]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

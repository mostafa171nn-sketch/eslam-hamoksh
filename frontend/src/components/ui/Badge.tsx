import type { ReactNode } from 'react';

type Tone = 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'violet' | 'gold' | 'brand';

const TONES: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25',
  red: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/25',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/25',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/25',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-700/60 dark:text-slate-300 dark:ring-slate-400/20',
  gold: 'bg-gold-50 text-gold-700 ring-gold-600/20 dark:bg-gold-500/10 dark:text-gold-300 dark:ring-gold-400/25',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-400/25',
};

export function statusTone(status: string | undefined | null): Tone {
  switch ((status ?? '').toLowerCase()) {
    case 'active':
    case 'completed':
    case 'present':
    case 'submitted':
    case 'graded':
    case 'scheduled':
    case 'rescheduled':
      return 'green';
    case 'cancelled':
    case 'absent':
    case 'late':
    case 'not_submitted':
    case 'not_started':
    case 'suspended':
    case 'inactive':
      return 'red';
    case 'in_progress':
    case 'pending':
    case 'excused':
      return 'amber';
    case 'upcoming':
      return 'blue';
    default:
      return 'slate';
  }
}

export function Badge({ children, tone = 'slate', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string | undefined | null }) {
  return <Badge tone={statusTone(status)}>{status?.replace(/_/g, ' ') ?? '—'}</Badge>;
}

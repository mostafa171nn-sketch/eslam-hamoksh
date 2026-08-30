import type { LucideIcon } from 'lucide-react';

type Tone = 'brand' | 'gold' | 'violet' | 'teal' | 'coral' | 'slate';

const TONES: Record<Tone, { chip: string; dot: string; blob: string }> = {
  brand: { chip: 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300', dot: 'bg-brand-500', blob: 'text-brand-500' },
  gold: { chip: 'bg-gold-100 text-gold-600 dark:bg-gold-500/15 dark:text-gold-300', dot: 'bg-gold-500', blob: 'text-gold-500' },
  violet: { chip: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300', dot: 'bg-violet-500', blob: 'text-violet-500' },
  teal: { chip: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300', dot: 'bg-teal-500', blob: 'text-teal-500' },
  coral: { chip: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500', blob: 'text-rose-500' },
  slate: { chip: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300', dot: 'bg-slate-500', blob: 'text-slate-500' },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  tone = 'brand',
  badge,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  sub?: string;
  tone?: Tone;
  badge?: string;
}) {
  const t = TONES[tone];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated-lg dark:border-slate-700 dark:bg-slate-800">
      <div className={`pointer-events-none absolute -end-8 -top-8 h-20 w-20 rounded-full bg-current opacity-[0.06] transition-transform duration-300 group-hover:scale-150 ${t.blob}`} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
        </div>
        {Icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${t.chip}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {badge && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
          {badge}
        </div>
      )}
    </div>
  );
}
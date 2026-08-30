import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  art,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  art?: ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-16 text-center transition-colors dark:border-slate-600/70 dark:bg-slate-800/40">
      {/* Soft glow */}
      <div className="pointer-events-none absolute -top-16 start-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-brand-100/50 blur-3xl dark:bg-brand-500/10" aria-hidden />
      {art ? (
        <div className="relative">{art}</div>
      ) : (
        <div className="relative">
          <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-white blur-sm dark:bg-slate-800" aria-hidden />
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-elevated dark:border-slate-700 dark:bg-slate-700">
            <Icon className="h-7 w-7 text-slate-400 dark:text-slate-400" />
          </div>
        </div>
      )}
      <h3 className="relative mt-5 text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      {description && (
        <p className="relative mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}
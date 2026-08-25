import type { ReactNode } from 'react';

export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={bodyClassName || 'p-5'}>{children}</div>
    </div>
  );
}

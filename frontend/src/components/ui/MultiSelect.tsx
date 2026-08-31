import { Check } from 'lucide-react';

export interface MultiOption {
  value: string;
  label: string;
}

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  error,
}: {
  label: string;
  options: MultiOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  error?: string;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="box-border w-full max-w-full min-w-0" style={{ boxSizing: 'border-box' }}>
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div className="box-border grid max-h-52 w-full max-w-full min-w-0 grid-cols-1 gap-1 overflow-y-auto overflow-x-hidden rounded-lg border border-slate-300 bg-white p-2 sm:grid-cols-2 dark:border-slate-600 dark:bg-slate-900" style={{ boxSizing: 'border-box' }}>
        {options.length === 0 && (
          <p className="col-span-full px-2 py-3 text-center text-sm text-slate-400">
            No options available
          </p>
        )}
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-sm transition-colors ${
                active ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  active ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white dark:border-slate-500 dark:bg-slate-900'
                }`}
              >
                {active && <Check className="h-3 w-3" />}
              </span>
              <span className="truncate">{o.label}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

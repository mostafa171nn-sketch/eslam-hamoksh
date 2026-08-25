import type { SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export function Select({ label, options, placeholder, error, className = '', id, ...rest }: Props) {
  const selectId = id ?? rest.name ?? label;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full appearance-none rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:ring-red-900/40'
            : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100 dark:border-slate-600 dark:focus:border-brand-400 dark:focus:ring-brand-900/40'
        } ${className}`}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

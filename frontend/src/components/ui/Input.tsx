import type { InputHTMLAttributes, ReactNode, Ref } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  inputRef?: Ref<HTMLInputElement>;
  icon?: ReactNode;
}

export function Input({ label, error, hint, className = '', id, inputRef, icon, ...rest }: Props) {
  const inputId = id ?? rest.name ?? label;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400 dark:text-slate-500">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          ref={inputRef}
          className={`rounded-lg border bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:ring-red-900/40'
              : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100 dark:border-slate-600 dark:focus:border-brand-400 dark:focus:ring-brand-900/40'
          } ${icon ? 'ps-10' : ''} w-full py-2 ${className}`}
          {...rest}
        />
      </div>
      {hint && !error && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

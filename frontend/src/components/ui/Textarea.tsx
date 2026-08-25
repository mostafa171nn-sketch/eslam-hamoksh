import type { TextareaHTMLAttributes } from 'react';

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', id, ...rest }: Props) {
  const textareaId = id ?? rest.name ?? label;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:ring-red-900/40'
            : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100 dark:border-slate-600 dark:focus:border-brand-400 dark:focus:ring-brand-900/40'
        } ${className}`}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

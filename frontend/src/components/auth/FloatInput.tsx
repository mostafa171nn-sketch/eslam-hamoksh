'use client';

import type { InputHTMLAttributes, Ref } from 'react';

export interface FloatInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  inputRef?: Ref<HTMLInputElement>;
}

export function FloatInput({ label, error, hint, inputRef, id, className = '', ...rest }: FloatInputProps) {
  const inputId = id ?? rest.name ?? label ?? '';
  return (
    <div className={`float-label-group relative ${className}`}>
      <input
        {...rest}
        id={inputId}
        ref={inputRef}
        placeholder=" "
        className="float-label-input w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-transparent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600 dark:focus:border-brand-400 dark:focus:ring-brand-900/40"
      />
      {label && (
        <label
          htmlFor={inputId}
          className="float-label absolute text-sm text-slate-500 dark:text-slate-400 pointer-events-none transition-all duration-180 ease-out bg-white dark:bg-[#0b1122] px-1 rounded-sm start-3 top-[0.65rem] z-10"
        >
          {label}
        </label>
      )}
      {error && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

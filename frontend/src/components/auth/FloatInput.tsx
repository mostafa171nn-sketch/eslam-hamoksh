'use client';

import type { InputHTMLAttributes, Ref } from 'react';
import { useState } from 'react';

export interface FloatInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  inputRef?: Ref<HTMLInputElement>;
}

export function FloatInput({ label, error, hint, inputRef, id, className = '', value: propValue = '', onFocus, onBlur, ...rest }: FloatInputProps) {
  const [focused, setFocused] = useState(false);
  const inputId = id ?? rest.name ?? label ?? '';
  const hasValue = typeof propValue === 'string' ? propValue.length > 0 : false;
  const isFloating = focused || hasValue;

  return (
    <div className={`float-label-group relative ${className} ${isFloating ? 'is-floating' : ''}`}>
      <input
        {...rest}
        id={inputId}
        ref={inputRef}
        value={propValue}
        placeholder=" "
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder:text-transparent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-900/40"
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      />
      {label && (
        <label
          htmlFor={inputId}
          className="float-label absolute text-sm font-medium text-slate-500 dark:text-slate-400 transition-all duration-180 ease-out bg-white dark:bg-slate-900 px-1 rounded-sm pointer-events-none z-10"
        >
          {label}
        </label>
      )}
      {error && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

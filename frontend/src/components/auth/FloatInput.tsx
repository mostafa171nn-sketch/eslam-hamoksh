'use client';

import type { InputHTMLAttributes, Ref } from 'react';
import { useState } from 'react';
import { PasswordVisibilityToggle } from '../ui/Input';

export interface FloatInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  inputRef?: Ref<HTMLInputElement>;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
}

export function FloatInput({ label, error, hint, inputRef, id, className = '', value: propValue = '', onFocus, onBlur, type, showPasswordLabel, hidePasswordLabel, ...rest }: FloatInputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id ?? rest.name ?? label ?? '';
  const hasValue = typeof propValue === 'string' ? propValue.length > 0 : false;
  const isFloating = focused || hasValue;
  // Only password fields get the visibility toggle; other types render exactly as before.
  const isPassword = type === 'password';

  return (
    <div className={`float-label-group relative box-border w-full max-w-full min-w-0 ${className} ${isFloating ? 'is-floating' : ''}`} style={{ boxSizing: 'border-box' }}>
      <input
        {...rest}
        id={inputId}
        ref={inputRef}
        value={propValue}
        placeholder=" "
        type={isPassword && showPassword ? 'text' : type}
        className="box-border w-full max-w-full min-w-0 rounded-[10px] border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-transparent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-900/40"
        style={{ boxSizing: 'border-box', ...(isPassword ? { paddingInlineEnd: '2.75rem' } : null) }}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      />
      {isPassword && (
        <span className="absolute inset-y-0 end-0 z-20 flex items-center pe-1.5">
          <PasswordVisibilityToggle
            visible={showPassword}
            onToggle={() => setShowPassword((s) => !s)}
            showLabel={showPasswordLabel}
            hideLabel={hidePasswordLabel}
            className="h-8 w-8"
          />
        </span>
      )}
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

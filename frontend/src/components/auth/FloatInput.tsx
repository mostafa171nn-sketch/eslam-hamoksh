'use client';

import { Input } from '../ui/Input';

export interface FloatInputProps {
  label?: string;
  error?: string;
  hint?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  id?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  min?: number;
  max?: number;
  step?: string;
}

export function FloatInput({ label, error, hint, inputRef, id, className = '', ...rest }: FloatInputProps) {
  const inputId = id ?? rest.name ?? label ?? '';
  return (
    <div className={`float-label-group relative ${className}`}>
      <Input
        {...rest}
        id={inputId}
        label=""
        inputRef={inputRef}
        className="float-label-input"
        placeholder=" "
      />
      {label && (
        <label
          htmlFor={inputId}
          className="float-label"
        >
          {label}
        </label>
      )}
      {error && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

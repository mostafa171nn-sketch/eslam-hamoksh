import { useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useT } from '../../i18n';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  inputRef?: Ref<HTMLInputElement>;
  icon?: ReactNode;
  /** Accessible label overrides for the password visibility toggle. */
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
}

/**
 * Eye toggle shared by every password field. Rendered as a real button
 * (never submits), mirrors automatically via logical properties.
 */
export function PasswordVisibilityToggle({
  visible,
  onToggle,
  showLabel,
  hideLabel,
  className = '',
}: {
  visible: boolean;
  onToggle: () => void;
  showLabel?: string;
  hideLabel?: string;
  className?: string;
}) {
  const { t } = useT();
  const label = visible ? (hideLabel ?? t('hidePassword')) : (showLabel ?? t('showPassword'));
  const Icon = visible ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className={`flex touch-manipulation items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-600 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:text-slate-500 dark:hover:text-slate-300 ${className}`}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

export function Input({ label, error, hint, className = '', id, inputRef, icon, type, showPasswordLabel, hidePasswordLabel, ...rest }: Props) {
  const inputId = id ?? rest.name ?? label;
  const [showPassword, setShowPassword] = useState(false);
  // Only password fields get the visibility toggle; every other input type
  // renders exactly as before.
  const isPassword = type === 'password';
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
          type={isPassword && showPassword ? 'text' : type}
          className={`rounded-lg border bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:ring-red-900/40'
              : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100 dark:border-slate-600 dark:focus:border-brand-400 dark:focus:ring-brand-900/40'
          } ${icon ? 'ps-10' : ''} ${isPassword ? 'pe-10' : ''} w-full py-2 ${className}`}
          {...rest}
        />
        {isPassword && (
          <span className="absolute inset-y-0 end-0 flex items-center pe-1.5">
            <PasswordVisibilityToggle
              visible={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
              showLabel={showPasswordLabel}
              hideLabel={hidePasswordLabel}
              className="h-8 w-8"
            />
          </span>
        )}
      </div>
      {hint && !error && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

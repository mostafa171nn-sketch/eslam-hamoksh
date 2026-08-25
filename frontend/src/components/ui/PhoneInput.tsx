'use client';
import { COUNTRIES, normalizePhone } from '../../lib/phone';

interface Props {
  label?: string;
  value: string;
  countryCode: string;
  onValueChange: (value: string) => void;
  onCountryChange: (code: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function PhoneInput({ label, value, countryCode, onValueChange, onCountryChange, error, hint, placeholder = '1234567890', disabled }: Props) {
  const handlePhoneChange = (raw: string) => {
    // Keep input digits/spaces only, allow leading +
    // We store raw without country prefix; parent combines for submission
    onValueChange(raw);
  };

  const normalizedPreview = (() => {
    if (!value) return '';
    try {
      return normalizePhone(value, countryCode);
    } catch {
      return '';
    }
  })();

  return (
    <div className="w-full">
      {label && <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <div className="flex gap-2">
        <select
          value={countryCode}
          onChange={(e) => onCountryChange(e.target.value)}
          disabled={disabled}
          className="w-36 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          aria-label="Country code"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code} {c.name}
            </option>
          ))}
        </select>
        <input
          value={value}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          inputMode="tel"
          className={`flex-1 rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60'
              : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100 dark:border-slate-600'
          }`}
        />
      </div>
      {normalizedPreview && !error && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Will be sent as: {normalizedPreview}</p>}
      {hint && !error && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

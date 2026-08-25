'use client';
import { useRef, KeyboardEvent, ClipboardEvent } from 'react';

export function OtpInput({ length = 6, value, onChange, disabled }: { length?: number; value: string; onChange: (v: string) => void; disabled?: boolean; }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const handleChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const arr = value.split('');
    arr[idx] = val.slice(-1);
    const joined = arr.join('');
    onChange(joined.slice(0, length));
    if (val && idx < length - 1) refs.current[idx + 1]?.focus();
  };
  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    // focus last
    const last = Math.min(pasted.length, length - 1);
    refs.current[last]?.focus();
  };
  return (
    <div className="flex justify-center gap-2" dir="ltr">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="h-12 w-10 rounded-lg border border-slate-300 bg-white text-center text-lg font-semibold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white sm:h-14 sm:w-12"
        />
      ))}
    </div>
  );
}
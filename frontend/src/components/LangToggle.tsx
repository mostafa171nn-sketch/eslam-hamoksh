'use client';

import { Languages } from 'lucide-react';
import { useT } from '../i18n';

const OPTIONS: { value: 'ar' | 'en'; label: 'العربية' | 'English' }[] = [
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' },
];

/**
 * Bilingual language switcher. Each option is shown in its own language so the
 * control never depends on the current translation to be usable. Works in both
 * directions; the active language is highlighted.
 */
export function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useT();
  const switchLang = (next: 'ar' | 'en') => {
    if (next !== lang) setLang(next);
  };

  return (
    <div
      role="group"
      aria-label={t('language')}
      className={`inline-flex h-9 shrink-0 items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800 ${className}`}
    >
      <Languages className="ms-1.5 h-4 w-4 text-slate-400" aria-hidden="true" />
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => switchLang(opt.value)}
          aria-pressed={lang === opt.value}
          aria-label={
            opt.value === 'ar'
              ? t('switchToArabic', { language: 'العربية' })
              : t('switchToEnglish', { language: 'English' })
          }
          className={`inline-flex h-7 items-center rounded-md px-2 text-xs font-semibold transition ${
            lang === opt.value
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default LangToggle;
'use client';

import { Languages } from 'lucide-react';
import { useT } from '../i18n';

export function LangToggle({ className = '' }: { className?: string }) {
  const { lang, toggleLang } = useT();
  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label="Toggle language"
      title="Toggle language"
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 ${className}`}
    >
      <Languages className="h-4 w-4" />
      {lang === 'ar' ? 'EN' : 'ع'}
    </button>
  );
}

export default LangToggle;

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { ar, type Dict } from './ar';
import { en } from './en';

export type { Dict };

export type Lang = 'ar' | 'en';

interface I18nContextValue {
  lang: Lang;
  t: (key: keyof typeof ar) => string;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  dir: 'rtl' | 'ltr';
}

const STORAGE_KEY = 'maarech-lang';

const dictionaries: Record<Lang, Dict> = { ar, en };

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'ar';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'ar' || stored === 'en') return stored;
  return 'ar';
}

function applyLang(lang: Lang) {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar');

  useEffect(() => {
    const initial = getInitialLang();
    setLangState(initial);
    applyLang(initial);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    applyLang(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'ar' ? 'en' : 'ar');
  }, [lang, setLang]);

  const t = useCallback(
    (key: keyof typeof ar) => {
      return dictionaries[lang][key] ?? ar[key] ?? String(key);
    },
    [lang],
  );

  return (
    <I18nContext.Provider
      value={{ lang, t, setLang, toggleLang, dir: lang === 'ar' ? 'rtl' : 'ltr' }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used within LangProvider.');
  return ctx;
}

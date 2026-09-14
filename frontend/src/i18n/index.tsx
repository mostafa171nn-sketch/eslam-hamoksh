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
import { setFormatLang } from '../lib/format';

export type { Dict };

export type Lang = 'ar' | 'en';

export type DictKey = keyof typeof ar;

export type TranslateParams = Record<string, string | number | undefined>;

interface I18nContextValue {
  lang: Lang;
  t: (key: DictKey, params?: TranslateParams) => string;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  dir: 'rtl' | 'ltr';
}

export const STORAGE_KEY = 'maarech-lang';

// Arabic is the only static dictionary (the default + SEO locale). English is
// loaded lazily on first use so bilingual users don't pay for the whole en
// bundle at startup.
const dictionaries: Partial<Record<Lang, Dict>> = { ar };
let enPromise: Promise<Dict> | null = null;

function loadEn(): Promise<Dict> {
  if (!enPromise) {
    enPromise = import('./en').then((m) => {
      dictionaries.en = m.en;
      return m.en;
    });
  }
  return enPromise;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const warnedKeys = new Set<string>();

function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'ar';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') return stored;
    const cookie = document.cookie.match(/(?:^|;\s*)maarech-lang=(\w+)/);
    if (cookie && (cookie[1] === 'ar' || cookie[1] === 'en')) return cookie[1] as Lang;
  } catch {
    /* ignore */
  }
  return 'ar';
}

function applyLang(lang: Lang) {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  setFormatLang(lang);
}

function persistLang(lang: Lang) {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.cookie = `${STORAGE_KEY}=${lang}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* ignore */
  }
}

/**
 * Translate a key, interpolating `{token}` placeholders from `params`.
 * Missing keys render as `[MISSING: key]` (both environments) and are logged
 * once to the console so the omission is never silent.
 */
function translate(lang: Lang, key: DictKey, params?: TranslateParams): string {
  const dict = dictionaries[lang];
  let template: string | undefined = dict?.[key];
  if (template === undefined) {
    const fallback: Lang = lang === 'en' ? 'ar' : 'en';
    template = dictionaries[fallback]?.[key];
  }
  if (template === undefined) {
    if (typeof console !== 'undefined' && !warnedKeys.has(key)) {
      warnedKeys.add(key);
      console.warn(`[i18n] missing translation key: ${String(key)}`);
    }
    return `[MISSING: ${String(key)}]`;
  }
  if (params) {
    return template.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = params[name];
      return value === undefined || value === null ? match : String(value);
    });
  }
  return template;
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar');
  const [enReady, setEnReady] = useState(false);

  // Run once on mount: adopt the persisted language and mirror it onto the
  // <html> element. The anti-flash script in the root layout already applied
  // the stored direction before first paint. English is fetched lazily so the
  // initial render stays Arabic-only (same tree shape for SSR + hydration);
  // `enReady` flips once the dictionary is in memory to trigger a re-render.
  useEffect(() => {
    const initial = getInitialLang();
    applyLang(initial);
    if (initial === 'en') {
      void loadEn().then(() => {
        setLangState('en');
        setEnReady(true);
      });
    }
  }, []);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      applyLang(next);
      persistLang(next);
      if (next === 'en' && !dictionaries.en) {
        void loadEn().then(() => setEnReady(true));
      }
    },
    [],
  );

  const toggleLang = useCallback(() => {
    setLang(lang === 'ar' ? 'en' : 'ar');
  }, [lang, setLang]);

  const t = useCallback(
    (key: DictKey, params?: TranslateParams) => translate(lang as Lang, key, params),
    [lang, enReady],
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

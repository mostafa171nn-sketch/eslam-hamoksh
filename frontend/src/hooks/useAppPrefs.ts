'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Small client-side app preferences (notification indicator, reduced motion,
 * larger text). Persisted in localStorage — no backend involved — and synced
 * across hook instances in the same tab via a window event.
 */
export const PREF_NOTIF = 'maarej-pref-notif';
export const PREF_MOTION = 'maarej-pref-motion';
export const PREF_TEXT = 'maarej-pref-text';

const PREF_EVENT = 'maarej:prefs-changed';

export function readPref(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === '1';
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREF_EVENT));
}

/** Applies the motion/text prefs to <html> (idempotent). */
export function applyPrefs() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('reduce-motion', readPref(PREF_MOTION, false));
  root.classList.toggle('font-large', readPref(PREF_TEXT, false));
}

export function usePref(key: string, fallback: boolean): [boolean, (next: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => readPref(key, fallback));
  useEffect(() => {
    const sync = () => setValue(readPref(key, fallback));
    window.addEventListener(PREF_EVENT, sync);
    return () => window.removeEventListener(PREF_EVENT, sync);
  }, [key, fallback]);
  const set = useCallback(
    (next: boolean) => {
      writePref(key, next);
      setValue(next);
      applyPrefs();
    },
    [key],
  );
  return [value, set];
}

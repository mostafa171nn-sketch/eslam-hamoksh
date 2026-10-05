'use client';

import { useEffect } from 'react';
import { applyPrefs } from '../hooks/useAppPrefs';

/** Applies persisted accessibility prefs app-wide on boot (motion/text). */
export function PrefsApplier() {
  useEffect(() => {
    applyPrefs();
  }, []);
  return null;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useT } from '../../i18n';

const DURATION_MS = 250;

const TONES = {
  light: {
    card: 'border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/95',
    header: 'border-slate-100 dark:border-slate-800',
    title: 'text-slate-600 dark:text-slate-300',
    close: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  },
  dark: {
    card: 'border-slate-800 bg-slate-900/95',
    header: 'border-slate-800',
    title: 'text-slate-200',
    close: 'text-slate-400 hover:bg-white/10 hover:text-white',
  },
} as const;

export function MobileNavPanel({
  open,
  onClose,
  children,
  title,
  tone = 'light',
  offsetClass = 'top-16 sm:top-[76px]',
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  tone?: 'light' | 'dark';
  offsetClass?: string;
}) {
  const { t } = useT();
  const [mounted, setMounted] = useState(false);
  const [renderOpen, setRenderOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toned = TONES[tone];

  useEffect(() => {
    if (open) {
      setMounted(true);
      setRenderOpen(false);
      const openTimer = setTimeout(() => setRenderOpen(true), 30);
      return () => clearTimeout(openTimer);
    }
    setRenderOpen(false);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMounted(false), DURATION_MS);
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200 ease-out lg:hidden ${
          renderOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? t('mainNavigation')}
        className={`fixed inset-x-0 z-50 lg:hidden ${offsetClass}`}
        style={{
          transform: renderOpen ? 'translateY(0)' : 'translateY(-100%)',
          transition: `transform ${DURATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
        }}
      >
        <div
          className={`max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-b shadow-2xl backdrop-blur-xl ${toned.card}`}
        >
          <div
            className={`flex h-12 shrink-0 items-center justify-between border-b px-4 ${toned.header}`}
          >
            <span className={`text-sm font-semibold ${toned.title}`}>
              {title ?? t('mainNavigation')}
            </span>
            <button
              type="button"
              onClick={onClose}
              className={`-me-1 rounded-lg p-1.5 transition-colors ${toned.close}`}
              aria-label={t('closeMenu')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}

export default MobileNavPanel;
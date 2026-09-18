'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useT } from '../../i18n';

const OPEN_DELAY_MS = 30;
const CLOSE_MS = 280;

const TONES = {
  light: {
    card: 'border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/95',
    header: 'border-slate-100 dark:border-slate-800',
    title: 'text-slate-900 dark:text-white',
    close: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  },
  dark: {
    card: 'border-slate-800 bg-slate-900/95',
    header: 'border-slate-800',
    title: 'text-white',
    close: 'text-slate-400 hover:bg-white/10 hover:text-white',
  },
} as const;

export function MobileNavPanel({
  open,
  onClose,
  children,
  title,
  tone = 'light',
  id = 'mobile-nav-panel',
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  tone?: 'light' | 'dark';
  id?: string;
}) {
  const { t } = useT();
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toned = TONES[tone];

  useEffect(() => {
    if (open) {
      setPhase('closed');
      setPhase('opening');
      timerRef.current = setTimeout(() => setPhase('open'), OPEN_DELAY_MS);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
      };
    }
    if (phase === 'open' || phase === 'opening') {
      setPhase('closing');
      timerRef.current = setTimeout(() => {
        setPhase('closed');
        timerRef.current = null;
      }, CLOSE_MS);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
      };
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'open') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [phase, onClose]);

  const isVisible = phase === 'opening' || phase === 'open';
  const isClosing = phase === 'closing';

  if (phase === 'closed') return null;

  return createPortal(
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? t('mainNavigation')}
        aria-hidden={!isVisible}
        className="fixed inset-x-0 top-0 z-50 lg:hidden"
        style={{
          maxHeight: '100dvh',
          transform: phase === 'open' ? 'translateY(0)' : 'translateY(-100%)',
          opacity: isVisible && !isClosing ? 1 : 0,
          transition: 'transform 280ms cubic-bezier(0.2,0,0,1), opacity 280ms cubic-bezier(0.2,0,0,1)',
          transitionBehavior: 'allow-discrete',
        }}
      >
        <div
          className={`mx-auto flex w-full max-w-full flex-col overflow-hidden border-b shadow-2xl backdrop-blur-xl ${toned.card}`}
          style={{ maxHeight: 'calc(100dvh - 4rem)' }}
        >
          <div className={`flex shrink-0 items-center justify-between border-b px-4 py-3 ${toned.header}`}>
            <span className={`text-base font-bold tracking-tight ${toned.title}`}>
              {title ?? t('mainNavigation')}
            </span>
            <button
              type="button"
              onClick={onClose}
              className={`-me-1 rounded-lg p-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 ${toned.close}`}
              aria-label={t('closeMenu')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav aria-label={t('mainNavigation')} className="mobile-nav-panel flex min-h-0 flex-1 flex-col items-center gap-0.5 px-4 py-3">
            {children}
          </nav>

          <div aria-hidden className="h-2 bg-gradient-to-b from-transparent to-white/50 dark:to-slate-900" />
        </div>
      </div>
    </>,
    document.body,
  );
}

export default MobileNavPanel;
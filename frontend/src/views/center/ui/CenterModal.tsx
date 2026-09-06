'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { lockScroll, unlockScroll } from '../../../lib/scrollLock';
import { useT } from '../../../i18n';

export function CenterModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { t } = useT();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    lockScroll();
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-3xl' };

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="fixed inset-0 bg-slate-900/45 dark:bg-slate-950/70" onClick={onClose} />
      <div className={`relative my-auto w-full overflow-hidden rounded-xl bg-white shadow-elevated-lg dark:bg-slate-800 ${sizes[size]}`}>
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--mj-border-soft)] px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-[color:var(--mj-ink-strong)]">{title}</h2>
            {description && <p className="mt-1 text-sm text-[color:var(--mj-muted)]">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[color:var(--mj-muted)] transition-colors hover:bg-[color:var(--mj-wash)] hover:text-[color:var(--mj-ink)]"
            aria-label={t('close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-[color:var(--mj-border-soft)] px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
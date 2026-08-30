'use client';

import { useEffect, useId } from 'react';
import { lockScroll, unlockScroll } from '../../lib/scrollLock';
import { useT } from '../../i18n';

type Size = 'sm' | 'md' | 'lg';

// Rendered size for inline (non-overlay) usage is controlled via the .pencil
// element's font-size (em-based). 60em * fontSize = rendered pixels.
const INLINE_FONT: Record<Size, number> = {
  sm: 0.35,
  md: 0.7,
  lg: 1.1,
};

export interface PencilLoaderProps {
  size?: Size;
  label?: string;
  /** Full-viewport overlay loader (page/route/data loading). */
  overlay?: boolean;
  /** Alias for `overlay` kept for backward compatibility. */
  center?: boolean;
  /** Lock body scroll while an overlay is visible (default true). */
  lock?: boolean;
  className?: string;
}

/**
 * Global ECMS loading indicator.
 *
 * Renders a pencil that draws a line while a real operation is pending.
 * The pencil animation itself is defined once in globals.css (.pencil + the
 * ecms-pencil-* classes) and is never altered here.
 *
 * Each instance gets a unique SVG id so multiple loaders can safely exist
 * on the same page without clipPath collisions.
 */
export function PencilLoader({
  size = 'lg',
  label,
  overlay = false,
  center = false,
  lock = true,
  className = '',
}: PencilLoaderProps) {
  const { t } = useT();
  const showOverlay = overlay || center;
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const clipId = `pencil-eraser-${uid}`;

  // Prevent background scroll while the full-screen loader is visible.
  useEffect(() => {
    if (!showOverlay || !lock) return;
    lockScroll();
    return () => unlockScroll();
  }, [showOverlay, lock]);

  const pencil = (
    <span className="pencil" style={showOverlay ? undefined : { fontSize: `${INLINE_FONT[size]}px` }}>
      <svg viewBox="0 0 220 100" width="100%" height="100%" aria-hidden="true">
        <line x1="20" y1="70" x2="190" y2="70" className="ecms-pencil-track" />
        <clipPath id={clipId}>
          <rect x="20" y="60" width="170" height="20" />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          <line x1="20" y1="70" x2="190" y2="70" className="ecms-pencil-ink" />
        </g>
        <g className="ecms-pencil-move">
          <g transform="translate(20 70) rotate(18)">
            <rect x="-5" y="-64" width="10" height="9" rx="2" className="ecms-pencil-eraser" />
            <rect x="-5" y="-55" width="10" height="8" className="ecms-pencil-ferrule" />
            <rect x="-5" y="-47" width="10" height="37" className="ecms-pencil-body" />
            <polygon points="0,0 -5,-10 5,-10" className="ecms-pencil-lead" />
          </g>
        </g>
      </svg>
    </span>
  );

  if (showOverlay) {
    return (
      <div
        className={`pencil-overlay${className ? ` ${className}` : ''}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {pencil}
        {label ? (
          <span className="pencil-overlay__label">{label}</span>
        ) : (
          <span className="sr-only">{t('loading')}</span>
        )}
      </div>
    );
  }

  return (
    <span
      className={`pencil-inline${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {pencil}
      {label ? (
        <span className="pencil-inline__label">{label}</span>
      ) : (
        <span className="sr-only">{t('loading')}</span>
      )}
    </span>
  );
}

export default PencilLoader;

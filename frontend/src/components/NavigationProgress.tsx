'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SHOW_DELAY_MS = 90;
const TICK_MS = 140;
const MAX_MS = 2500;
const DONE_HOLD_MS = 220;
const FADE_MS = 350;

type Phase = 'idle' | 'pending' | 'running' | 'done';

function currentKey(): string {
  return `${window.location.pathname}${window.location.search}`;
}

/**
 * Ultra-thin global navigation progress bar. It never blocks input or moves
 * layout (fixed, pointer-events-none, transform-only), is skipped entirely
 * under prefers-reduced-motion, and only becomes visible when a soft
 * navigation takes longer than a tiny threshold — instant navigations never
 * flash a bar. Completion is driven by the real route commit, not a fake
 * timer.
 */
export function NavigationProgress() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [width, setWidth] = useState(0);
  const [fading, setFading] = useState(false);

  const phaseRef = useRef<Phase>('idle');
  const widthRef = useRef(0);
  const startKey = useRef<string | null>(null);
  const startedAt = useRef(0);
  const showTimer = useRef<number | undefined>(undefined);
  const tickTimer = useRef<number | undefined>(undefined);
  const wrapTimer = useRef<number | undefined>(undefined);
  const reduced = useRef(false);

  const commit = useCallback((nextPhase: Phase, nextWidth: number) => {
    phaseRef.current = nextPhase;
    widthRef.current = nextWidth;
    setPhase(nextPhase);
    setWidth(nextWidth);
  }, []);

  const clearTimers = useCallback(() => {
    if (showTimer.current !== undefined) {
      window.clearTimeout(showTimer.current);
      showTimer.current = undefined;
    }
    if (tickTimer.current !== undefined) {
      window.clearInterval(tickTimer.current);
      tickTimer.current = undefined;
    }
    if (wrapTimer.current !== undefined) {
      window.clearTimeout(wrapTimer.current);
      wrapTimer.current = undefined;
    }
  }, []);

  const finish = useCallback(() => {
    if (phaseRef.current === 'idle' || phaseRef.current === 'done') return;
    clearTimers();
    commit('done', 100);
    wrapTimer.current = window.setTimeout(() => {
      setFading(true);
      wrapTimer.current = window.setTimeout(() => {
        setFading(false);
        commit('idle', 0);
      }, FADE_MS);
    }, DONE_HOLD_MS);
  }, [clearTimers, commit]);

  const start = useCallback(() => {
    if (phaseRef.current !== 'idle' || reduced.current) return;
    startKey.current = currentKey();
    startedAt.current = Date.now();
    commit('pending', 0);
    showTimer.current = window.setTimeout(() => {
      showTimer.current = undefined;
      if (startKey.current === null || currentKey() !== startKey.current) {
        commit('idle', 0);
        return;
      }
      commit('running', 8);
      tickTimer.current = window.setInterval(() => {
        if (startKey.current === null || currentKey() !== startKey.current || Date.now() - startedAt.current > MAX_MS) {
          finish();
          return;
        }
        commit('running', Math.min(100, widthRef.current + (100 - widthRef.current) * 0.24));
      }, TICK_MS);
    }, SHOW_DELAY_MS);
  }, [commit, finish]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current = mq.matches;
    const onReducedChange = (e: MediaQueryListEvent) => {
      reduced.current = e.matches;
    };
    mq.addEventListener?.('change', onReducedChange);

    const handler = (e: MouseEvent) => {
      if (reduced.current || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.('a');
      if (!anchor || anchor.hasAttribute('download')) return;
      const targetName = anchor.target;
      if (targetName && targetName !== '_self') return;
      const href = anchor.getAttribute('href');
      if (!href || href[0] === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;
      let dest: string;
      if (/^(https?:)?\/\//i.test(href)) {
        try {
          const url = new URL(href, window.location.href);
          if (url.origin !== window.location.origin) return;
          dest = url.pathname + url.search;
        } catch {
          return;
        }
      } else if (href.startsWith('/')) {
        dest = href.split('#')[0];
      } else {
        return;
      }
      if (dest === currentKey()) return;
      start();
    };

    document.addEventListener('click', handler, true);
    return () => {
      document.removeEventListener('click', handler, true);
      mq.removeEventListener?.('change', onReducedChange);
      clearTimers();
    };
  }, [start, clearTimers]);

  if (phase === 'idle') return null;

  const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const pct = Math.min(100, Math.max(0, width));

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px]"
      style={{ opacity: fading ? 0 : 1, transition: `opacity ${FADE_MS}ms ease-out` }}
    >
      <div
        className="h-full w-full bg-gradient-to-r from-[#1499ff] to-[#0878f8]"
        style={{
          transform: `scaleX(${pct / 100})`,
          transformOrigin: isRtl ? 'right center' : 'left center',
          transition: 'transform 160ms linear',
        }}
      />
    </div>
  );
}

export default NavigationProgress;
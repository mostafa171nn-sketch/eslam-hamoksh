'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { PencilLoader } from '../ui/PencilLoader';
import { useT } from '../../i18n';

interface Props {
  onResult: (token: string) => void;
  onError?: (message: string) => void;
}

export function QrScanner({ onResult, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(true);
  const handled = useRef(false);
  const { t } = useT();

  useEffect(() => {
    let cancelled = false;
    const readerId = `qr-reader-${Math.random().toString(36).slice(2)}`;
    if (containerRef.current) containerRef.current.id = readerId;

    const scanner = new Html5Qrcode(readerId);
    scannerRef.current = scanner;

    const onScanSuccess = (decoded: string) => {
      if (handled.current) return;
      handled.current = true;
      try {
        scanner.stop().catch(() => {});
      } catch {
        /* ignore */
      }
      onResult(decoded.trim());
    };

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        onScanSuccess,
        () => {},
      )
      .then(() => {
        if (!cancelled) setStarting(false);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = t('cameraAccessDenied');
        setError(msg);
        setStarting(false);
        onError?.(err?.message ?? msg);
      });

    return () => {
      cancelled = true;
      try {
        scanner.stop().catch(() => {});
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div
        ref={containerRef}
        className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-black"
      />
      {starting && !error && (
        <div className="mt-3 flex justify-center">
          <PencilLoader label={t('startingCamera')} />
        </div>
      )}
      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}

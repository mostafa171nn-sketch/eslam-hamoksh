'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Unhandled root layout error:', error);
  }, [error]);

  return (
    <html lang="en" dir="ltr">
      <body className="bg-slate-50 text-slate-900">
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '2rem',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ marginTop: '0.75rem', color: '#64748b' }}>
            An unexpected error occurred. Please try again.
          </p>
          {error.digest ? (
            <p style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>
              {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              borderRadius: '0.5rem',
              backgroundColor: '#0f766e',
              color: '#fff',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
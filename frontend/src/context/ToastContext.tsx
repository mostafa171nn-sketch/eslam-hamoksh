'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, type, message }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 end-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-slide-in pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg dark:border-slate-700 dark:bg-slate-800"
          >
            {t.type === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />}
            {t.type === 'error' && <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
            {t.type === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />}
            <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-slate-300 transition hover:text-slate-500 dark:text-slate-600 dark:text-slate-300 dark:hover:text-slate-400"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider.');
  return ctx;
}

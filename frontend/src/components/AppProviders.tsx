'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';
import { LangProvider } from '../i18n';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { ErrorBoundary } from './ErrorBoundary';
import { PrefsApplier } from './PrefsApplier';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LangProvider>
        <ErrorBoundary>
          <ToastProvider>
            <AuthProvider>
              <PrefsApplier />
              {children}
            </AuthProvider>
          </ToastProvider>
        </ErrorBoundary>
      </LangProvider>
    </ThemeProvider>
  );
}

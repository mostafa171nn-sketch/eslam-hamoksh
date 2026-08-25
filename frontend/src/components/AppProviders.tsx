'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';
import { LangProvider } from '../i18n';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { GlobalLoader } from './GlobalLoader';
import { ErrorBoundary } from './ErrorBoundary';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LangProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </LangProvider>
        <GlobalLoader />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

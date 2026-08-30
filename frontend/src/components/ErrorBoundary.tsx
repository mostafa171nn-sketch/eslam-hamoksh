'use client';

import { Component, type ReactNode } from 'react';
import { useT, type Dict } from '../i18n';

interface Props {
  children: ReactNode;
  t: (key: keyof Dict) => string;
}

interface State {
  hasError: boolean;
}

class ErrorBoundaryInner extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 dark:border-red-800 dark:bg-red-950/30">
            <h2 className="text-lg font-bold text-red-700 dark:text-red-300">
              {this.props.t('somethingWentWrong')}
            </h2>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {this.props.t('unexpectedError')}
            </p>
            <button
              onClick={this.retry}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              {this.props.t('tryAgain')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useT();
  return <ErrorBoundaryInner t={t}>{children}</ErrorBoundaryInner>;
}

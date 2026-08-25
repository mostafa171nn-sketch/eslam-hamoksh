'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
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
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={this.retry}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

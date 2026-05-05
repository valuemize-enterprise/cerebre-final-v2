'use client';

/**
 * Global Error Boundary — PRODUCTION HARDENED
 *
 * FIXES:
 * 1. Prevents white screen of death when a component crashes
 * 2. Shows helpful error message with recovery actions
 * 3. Reports error details in development
 * 4. Session expired errors redirect to login automatically
 * 5. Offline errors show a reconnection button
 */

import React, { Component, ErrorInfo, ReactNode, useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, WifiOff, LogIn, Home } from 'lucide-react';
import { ApiError } from '../../lib/api';

// ── Class Error Boundary (required for componentDidCatch) ─────────────


interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-xl flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-400 mb-4 max-w-sm">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button onClick={this.reset} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class PageErrorBoundary extends Component<
  { children: ReactNode; pageName?: string },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null, errorInfo: null };

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      console.error('[ErrorBoundary]', error.message, errorInfo.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      return <ErrorCard error={this.state.error} onRetry={() => this.setState({ error: null, errorInfo: null })} />;
    }
    return this.props.children;
  }
}

// ── Error display card ────────────────────────────────────────────────
export const ErrorCard = ({
  error,
  onRetry,
  compact = false,
}: {
  error: Error | ApiError | null;
  onRetry?: () => void;
  compact?: boolean;
}) => {
  const isOffline    = error instanceof ApiError && error.isOffline();
  const isAuth       = error instanceof ApiError && (error.isUnauthorized() || error.code === 'SESSION_EXPIRED');
  const isForbidden  = error instanceof ApiError && error.isForbidden();
  const isNotFound   = error instanceof ApiError && error.isNotFound();
  const isValidation = error instanceof ApiError && error.isValidation();

  const title = isOffline    ? 'No internet connection'
    : isAuth       ? 'Session expired'
    : isForbidden  ? 'Access denied'
    : isNotFound   ? 'Not found'
    : isValidation ? 'Invalid input'
    : 'Something went wrong';

  const icon = isOffline ? WifiOff : AlertTriangle;
  const Icon = icon;

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-lg text-sm text-red-700 dark:text-red-400">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{error?.message || 'Something went wrong'}</span>
        {onRetry && (
          <button onClick={onRetry} className="ml-auto text-xs underline hover:no-underline">Retry</button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        {error?.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        {isAuth ? (
          <a href="/login" className="btn-primary inline-flex items-center gap-2">
            <LogIn className="w-4 h-4" /> Sign in again
          </a>
        ) : isOffline ? (
          <button onClick={() => window.location.reload()} className="btn-primary inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        ) : (
          <>
            {onRetry && (
              <button onClick={onRetry} className="btn-primary inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Try again
              </button>
            )}
            <a href="/dashboard" className="btn-secondary inline-flex items-center gap-2">
              <Home className="w-4 h-4" /> Go to dashboard
            </a>
          </>
        )}
      </div>
      {process.env.NODE_ENV !== 'production' && error?.stack && (
        <details className="mt-6 text-left">
          <summary className="text-xs text-gray-400 cursor-pointer">Error details (dev only)</summary>
          <pre className="mt-2 text-xs text-red-400 bg-gray-900 p-3 rounded-lg overflow-auto max-w-xl">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
};

// ── useAsyncData hook — replaces repeated useState + useEffect + error handling ──
/**
 * USAGE:
 * const { data, loading, error, reload } = useAsyncData(
 *   () => api.get('/goals').then(r => r.data.goals),
 *   [],                        // dependencies
 *   { fallback: [] }           // options
 * );
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: any[] = [],
  options: { fallback?: T; skip?: boolean } = {}
): {
  data: T | undefined;
  loading: boolean;
  error: ApiError | Error | null;
  reload: () => void;
} {
  const [data, setData]       = useState<T | undefined>(options.fallback);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError]     = useState<ApiError | Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    if (options.skip) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher()
      .then(result => { if (!cancelled) { setData(result); setLoading(false); } })
      .catch(err  => { if (!cancelled) { setError(err); setLoading(false); } });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  return { data, loading, error, reload };
}

// ── Empty state component ──────────────────────────────────────────────
export const EmptyStateCard = ({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}) => (
  <div className="card text-center py-16 border-dashed">
    <Icon className="w-10 h-10 mx-auto text-gray-300 mb-3" />
    <p className="text-gray-600 dark:text-gray-300 font-semibold">{title}</p>
    <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">{description}</p>
    {action && actionLabel && (
      <button onClick={action} className="btn-primary mt-4 inline-flex">
        {actionLabel}
      </button>
    )}
  </div>
);

// ── LoadingCard ───────────────────────────────────────────────────────
export const LoadingCard = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="flex items-center justify-center py-16">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  </div>
);

export default PageErrorBoundary;

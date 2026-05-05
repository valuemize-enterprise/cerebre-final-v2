'use client';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-gray-50 dark:bg-gray-950 flex items-center justify-center min-h-screen p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-gray-400 mb-2">
            {error?.message || 'An unexpected error occurred.'}
          </p>
          {error?.digest && (
            <p className="text-xs text-gray-300 dark:text-gray-700 font-mono mb-6">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="btn-secondary"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
            <a href="/dashboard" className="btn-primary">
              <Home className="w-4 h-4" />
              Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}

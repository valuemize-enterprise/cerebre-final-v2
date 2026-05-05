'use client';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-6 max-w-md">
      <div className="card p-8 text-center space-y-4">
        <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            Failed to load dashboard
          </h2>
          <p className="text-sm text-gray-400">
            {error?.message || 'An unexpected error occurred.'}
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-secondary">
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
          <Link href="/dashboard" className="btn-primary">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

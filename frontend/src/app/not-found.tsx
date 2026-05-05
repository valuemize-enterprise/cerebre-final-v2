import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-brand-100 dark:bg-brand-950/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-6xl font-bold text-gray-200 dark:text-gray-800 mb-2">404</h1>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Page not found</h2>
        <p className="text-sm text-gray-400 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/dashboard" className="btn-primary inline-flex">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

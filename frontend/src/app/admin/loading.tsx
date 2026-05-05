'use client';
export default function Loading() {
  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="h-8 w-40 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      <div className="flex gap-1">
        {[1, 2].map((i) => (
          <div key={i} className="h-9 w-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-8 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="card h-48 animate-pulse bg-gray-50 dark:bg-gray-900" />
    </div>
  );
}

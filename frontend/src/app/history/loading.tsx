'use client';
export default function Loading() {
  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="space-y-1">
        <div className="h-8 w-56 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-4 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
        <div className="h-9 w-40 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-7 w-20 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
        ))}
      </div>
      <div className="card p-5">
        <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-4" />
        <div className="h-64 w-full bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
            <div className="h-7 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

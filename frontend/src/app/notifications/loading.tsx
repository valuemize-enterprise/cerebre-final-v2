'use client';
export default function Loading() {
  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="h-8 w-40 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      <div className="flex gap-2">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="card overflow-hidden">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-gray-50 dark:border-gray-800">
            <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
            <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

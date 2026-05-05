'use client';
export default function Loading() {
  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="space-y-1">
        <div className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="h-12 w-full bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      <div className="card overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-gray-800">
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';
export default function Loading() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="space-y-1 mb-6">
        <div className="h-8 w-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-4 w-52 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="flex gap-6">
        <div className="w-44 space-y-1.5 shrink-0">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="flex-1 card p-6 space-y-5">
          <div className="space-y-1">
            <div className="h-5 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-3 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-10 w-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

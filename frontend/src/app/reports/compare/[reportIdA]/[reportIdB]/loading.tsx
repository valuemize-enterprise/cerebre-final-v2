'use client';
export default function Loading() {
  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="h-8 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      <div className="grid sm:grid-cols-2 gap-4">
        {[1,2].map(i => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-4 w-28 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-6 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            {[1,2,3].map(j => <div key={j} className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />)}
          </div>
        ))}
      </div>
      {[1,2,3].map(i => (
        <div key={i} className="card h-48 animate-pulse bg-gray-50 dark:bg-gray-900" />
      ))}
    </div>
  );
}

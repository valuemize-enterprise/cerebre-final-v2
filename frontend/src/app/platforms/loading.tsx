'use client';
import { PlatformCardSkeleton } from '../../components/ui/Skeletons';
export default function Loading() {
  return (
    <div className="p-6 max-w-5xl">
      <div className="h-8 w-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse mb-6" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <PlatformCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

'use client';
import { FileRowSkeleton } from '../../components/ui/Skeletons';
export default function Loading() {
  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="h-8 w-40 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      <div className="card h-48 animate-pulse bg-gray-50 dark:bg-gray-900" />
      <div className="card overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => <FileRowSkeleton key={i} />)}
      </div>
    </div>
  );
}

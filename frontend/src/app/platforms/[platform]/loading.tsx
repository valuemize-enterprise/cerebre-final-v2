'use client';
import { ChartSkeleton, KpiSkeleton } from '../../../components/ui/Skeletons';
export default function Loading() {
  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="space-y-1">
        <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-8 w-40 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1,2,3,4,5,6,7,8].map(i => <KpiSkeleton key={i} />)}
      </div>
      <ChartSkeleton height={240} />
      <div className="grid sm:grid-cols-2 gap-4">
        <ChartSkeleton height={180} />
        <ChartSkeleton height={180} />
      </div>
    </div>
  );
}

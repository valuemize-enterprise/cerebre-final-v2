import clsx from 'clsx';

// ── Base pulse block ──────────────────────────────────────────
const Bone = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={clsx('bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse', className)} />
);

// ── KPI card skeleton ─────────────────────────────────────────
export const KpiSkeleton = () => (
  <div className="card p-5 space-y-3">
    <Bone className="h-3 w-20" />
    <Bone className="h-8 w-28" />
    <Bone className="h-3 w-16" />
  </div>
);

// ── Chart area skeleton ───────────────────────────────────────
export const ChartSkeleton = ({ height = 240 }: { height?: number }) => (
  <div className="card p-5">
    <Bone className="h-4 w-48 mb-4" />
    <Bone className="w-full" style={{ height }} />
  </div>
);

// ── Report card skeleton ──────────────────────────────────────
export const ReportCardSkeleton = () => (
  <div className="card p-5 space-y-3">
    <div className="flex justify-between">
      <Bone className="h-4 w-32" />
      <Bone className="h-4 w-12" />
    </div>
    <Bone className="h-3 w-full" />
    <Bone className="h-3 w-3/4" />
    <div className="flex gap-2 pt-2">
      <Bone className="h-6 w-16 rounded-full" />
      <Bone className="h-6 w-20 rounded-full" />
    </div>
    <div className="flex gap-2 pt-2 border-t border-gray-50 dark:border-gray-800">
      <Bone className="h-8 flex-1 rounded-lg" />
      <Bone className="h-8 w-8 rounded-lg" />
    </div>
  </div>
);

// ── Platform card skeleton ────────────────────────────────────
export const PlatformCardSkeleton = () => (
  <div className="card p-5 space-y-4">
    <div className="flex items-center gap-2.5">
      <Bone className="w-9 h-9 rounded-lg" />
      <div className="space-y-1.5 flex-1">
        <Bone className="h-4 w-24" />
        <Bone className="h-3 w-16" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {[1,2,3,4].map((i) => (
        <Bone key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  </div>
);

// ── Table row skeleton ────────────────────────────────────────
export const TableRowSkeleton = ({ cols = 4 }: { cols?: number }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Bone className="h-4 w-full max-w-[120px]" />
      </td>
    ))}
  </tr>
);

// ── File list row skeleton ────────────────────────────────────
export const FileRowSkeleton = () => (
  <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 dark:border-gray-800">
    <Bone className="w-9 h-9 rounded-lg shrink-0" />
    <div className="flex-1 space-y-1.5">
      <Bone className="h-4 w-48" />
      <Bone className="h-3 w-24" />
    </div>
    <Bone className="h-6 w-16 rounded-full" />
    <Bone className="h-8 w-20 rounded-lg" />
  </div>
);

// ── Dashboard skeleton ────────────────────────────────────────
export const DashboardSkeleton = () => (
  <div className="p-6 space-y-6">
    <div className="space-y-1">
      <Bone className="h-7 w-56" />
      <Bone className="h-4 w-40" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1,2,3,4].map((i) => <KpiSkeleton key={i} />)}
    </div>
    <div className="grid lg:grid-cols-2 gap-4">
      <ChartSkeleton height={200} />
      <div className="card p-5 space-y-3">
        <Bone className="h-4 w-40" />
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="flex gap-2">
            <Bone className="w-2 h-2 rounded-full mt-1.5 shrink-0" />
            <Bone className="h-3 flex-1" />
          </div>
        ))}
      </div>
    </div>
    <ChartSkeleton height={220} />
  </div>
);

// ── Report page skeleton ──────────────────────────────────────
export const ReportPageSkeleton = () => (
  <div className="p-6 max-w-5xl space-y-6">
    <div className="flex justify-between">
      <div className="space-y-1.5">
        <Bone className="h-8 w-64" />
        <Bone className="h-4 w-44" />
      </div>
      <div className="flex gap-2">
        <Bone className="h-8 w-16 rounded-lg" />
        <Bone className="h-8 w-16 rounded-lg" />
      </div>
    </div>
    {[1,2,3].map((i) => (
      <div key={i} className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <Bone className="h-4 w-36" />
        </div>
        <div className="p-6 space-y-3">
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-5/6" />
          <Bone className="h-3 w-4/5" />
        </div>
      </div>
    ))}
  </div>
);

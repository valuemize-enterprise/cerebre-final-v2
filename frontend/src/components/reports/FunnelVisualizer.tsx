'use client';
import { useEffect, useState } from 'react';
import { metricsApi } from '../../lib/api';
import clsx from 'clsx';

interface FunnelStage {
  stage: string;
  metric: string;
  value: number;
  rate: number;
}

interface FunnelVisualizerProps {
  stages?: FunnelStage[];
  className?: string;
}

const formatVal = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return v.toLocaleString();
};

const STAGE_COLORS = [
  'bg-brand-600',
  'bg-brand-500',
  'bg-brand-400',
  'bg-brand-300',
  'bg-brand-200',
  'bg-brand-100',
];

export const FunnelVisualizer = ({ stages: propStages, className }: FunnelVisualizerProps) => {
  const [stages, setStages] = useState<FunnelStage[]>(propStages || []);
  const [loading, setLoading] = useState(!propStages);

  useEffect(() => {
    if (propStages) { setStages(propStages); return; }
    metricsApi.funnel(1)
      .then(({ data }) => setStages(data.stages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-32 bg-gray-50 dark:bg-gray-800 animate-pulse rounded-xl" />;
  if (stages.length === 0) return null;

  const maxVal = stages[0]?.value || 1;

  return (
    <div className={clsx('space-y-2', className)}>
      {stages.map((s, i) => {
        const widthPct = Math.max(8, (s.value / maxVal) * 100);
        const dropoff = i > 0
          ? parseFloat((100 - (s.value / stages[i - 1].value) * 100).toFixed(1))
          : 0;

        return (
          <div key={s.stage}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-20 shrink-0">
                  {s.stage}
                </span>
                <span className="text-xs text-gray-400">{s.metric}</span>
              </div>
              <div className="flex items-center gap-3">
                {dropoff > 0 && (
                  <span className="text-xs text-red-400">-{dropoff}%</span>
                )}
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-16 text-right">
                  {formatVal(s.value)}
                </span>
              </div>
            </div>
            <div className="h-7 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <div
                className={clsx('h-full rounded-lg flex items-center justify-end pr-3 transition-all duration-700', STAGE_COLORS[i] || 'bg-brand-200')}
                style={{ width: `${widthPct}%` }}
              >
                <span className="text-xs font-medium text-white opacity-90">
                  {s.rate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

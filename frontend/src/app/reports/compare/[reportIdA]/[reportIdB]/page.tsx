'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowUp, ArrowDown, Minus, Loader2, TrendingUp, TrendingDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { reportsApi } from '@/lib/api';

const Delta = ({ v }: { v: number }) => {
  if (v === 0) return <Minus className="w-3 h-3 text-gray-400" />;
  return (
    <span className={clsx('flex items-center gap-0.5 text-xs font-semibold',
      v > 0 ? 'text-green-600' : 'text-red-500')}>
      {v > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(v).toFixed(1)}%
    </span>
  );
};

const MetricRow = ({ label, a, b }: { label: string; a: any; b: any }) => {
  const delta = a > 0 ? ((b - a) / a) * 100 : 0;
  return (
    <tr className="border-b border-gray-50 dark:border-gray-800">
      <td className="py-2.5 px-4 text-sm text-gray-600 dark:text-gray-400">{label}</td>
      <td className="py-2.5 px-4 text-sm font-medium text-gray-800 dark:text-gray-200 text-right">
        {typeof a === 'number' ? a.toLocaleString() : a || '—'}
      </td>
      <td className="py-2.5 px-4 text-sm font-medium text-gray-800 dark:text-gray-200 text-right">
        {typeof b === 'number' ? b.toLocaleString() : b || '—'}
      </td>
      <td className="py-2.5 px-4 text-right">
        {typeof a === 'number' && typeof b === 'number' && <Delta v={delta} />}
      </td>
    </tr>
  );
};

export default function ComparePage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.compare(params.reportIdA as string, params.reportIdB as string)
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Failed to load comparison'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>;
  if (!data) return <p className="p-6 text-gray-400">Could not load comparison.</p>;

  const { periodA, periodB } = data;
  const execA = periodA.executive_snapshot || {};
  const execB = periodB.executive_snapshot || {};

  // Build aggregate metrics per platform
  const allPlatforms = [...new Set([
    ...(periodA.metrics || []).map((m: any) => m.platform),
    ...(periodB.metrics || []).map((m: any) => m.platform),
  ])];

  const getMetric = (metrics: any[], platform: string, field: string) =>
    metrics.find((m: any) => m.platform === platform)?.[field] ?? 0;

  const METRIC_FIELDS = [
    { label: 'Impressions', field: 'impressions' },
    { label: 'Reach', field: 'reach' },
    { label: 'Engagement rate', field: 'engagement_rate' },
    { label: 'Clicks', field: 'clicks' },
    { label: 'Conversions', field: 'conversions' },
    { label: 'Revenue', field: 'revenue' },
  ];

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Period comparison</h1>
        <div className="flex items-center gap-4 mt-2">
          <span className="badge-info">{periodA.period_label}</span>
          <span className="text-gray-400 text-sm">vs</span>
          <span className="badge-info">{periodB.period_label}</span>
        </div>
      </div>

      {/* Direction comparison */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { report: periodA, exec: execA, label: 'Period A' },
          { report: periodB, exec: execB, label: 'Period B' },
        ].map(({ report, exec, label }) => (
          <div key={label} className="card p-5">
            <p className="section-title mb-2">{label} — {report.period_label}</p>
            <div className="flex items-center gap-2 mb-3">
              {exec.overall_direction === 'growing'
                ? <TrendingUp className="w-5 h-5 text-green-500" />
                : <TrendingDown className="w-5 h-5 text-red-500" />}
              <span className="text-sm font-semibold capitalize text-gray-800 dark:text-gray-200">
                {exec.overall_direction}
              </span>
            </div>
            <p className="text-sm text-gray-500 italic">{exec.strategic_focus}</p>
            {(exec.key_wins || []).slice(0, 3).map((w: string, i: number) => (
              <p key={i} className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex gap-1.5">
                <span className="text-green-500 font-bold shrink-0">↑</span>{w}
              </p>
            ))}
          </div>
        ))}
      </div>

      {/* Per-platform metric tables */}
      {allPlatforms.map((platform) => (
        <div key={platform} className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-sm font-semibold capitalize text-gray-700 dark:text-gray-300">{platform}</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Metric</th>
                <th className="py-2.5 px-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">{periodA.period_label}</th>
                <th className="py-2.5 px-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">{periodB.period_label}</th>
                <th className="py-2.5 px-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Change</th>
              </tr>
            </thead>
            <tbody>
              {METRIC_FIELDS.map(({ label, field }) => (
                <MetricRow
                  key={field}
                  label={label}
                  a={getMetric(periodA.metrics, platform, field)}
                  b={getMetric(periodB.metrics, platform, field)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

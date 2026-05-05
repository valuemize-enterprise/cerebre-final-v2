'use client';
import { useEffect, useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { metricsApi } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import { Loader2, TrendingUp, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C', facebook: '#1877F2', twitter: '#1DA1F2',
  tiktok: '#69C9D0',    youtube: '#FF0000',  google_ads: '#4285F4',
  website: '#10B981',   email: '#F59E0B',    linkedin: '#0A66C2',
};

const METRICS = [
  { key: 'impressions',      label: 'Impressions',      format: (v: number) => `${(v/1000).toFixed(1)}k` },
  { key: 'engagementRate',   label: 'Engagement rate',  format: (v: number) => `${(v*100).toFixed(2)}%` },
  { key: 'followersGained',  label: 'Followers gained', format: (v: number) => v.toLocaleString() },
  { key: 'conversions',      label: 'Conversions',      format: (v: number) => v.toLocaleString() },
  { key: 'revenue',          label: 'Revenue (₦)',      format: (v: number) => `₦${v.toLocaleString()}` },
  { key: 'websiteVisits',    label: 'Website visits',   format: (v: number) => v.toLocaleString() },
];

export default function HistoryPage() {
  const { colors } = useTheme();
  const [historyData, setHistoryData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);
  const [activeMetric, setActiveMetric] = useState('impressions');
  const [activePlatforms, setActivePlatforms] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    metricsApi.platforms()
      .then(({ data: pd }) => {
        // Build platform keys from aggregate data
        const platformKeys = (pd.platforms || []).map((p: any) => p.platform);
        // Then fetch time-series detail for each
        return Promise.all(
          platformKeys.map((platform: string) =>
            metricsApi.platform(platform, months)
              .then(({ data }) => ({ platform, periods: data.periods || [] }))
              .catch(() => ({ platform, periods: [] }))
          )
        );
      })
      .then((results) => {
        const grouped: Record<string, any[]> = {};
        results.forEach(({ platform, periods }) => {
          grouped[platform] = periods.map((p: any) => ({
            period: p.report_period_start,
            impressions: Number(p.impressions),
            engagementRate: Number(p.engagement_rate),
            followersGained: Number(p.followers_gained),
            conversions: Number(p.conversions),
            revenue: Number(p.revenue),
            websiteVisits: Number(p.website_visits),
            adSpend: Number(p.ad_spend),
            roas: Number(p.roas),
          }));
        });
        setHistoryData(grouped);
        setActivePlatforms(Object.keys(grouped));
      })
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false));
  }, [months]);

  const togglePlatform = (p: string) =>
    setActivePlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const allPlatforms = Object.keys(historyData);

  // Build unified time-series: [{period, instagram: N, facebook: N, ...}]
  const periodSet = new Set<string>();
  Object.values(historyData).forEach((pts) => pts.forEach((p) => periodSet.add(p.period?.slice(0,7))));
  const periods = [...periodSet].sort();

  const chartData = periods.map((period) => {
    const row: any = { period };
    allPlatforms.forEach((platform) => {
      const point = historyData[platform]?.find((p) => p.period?.slice(0,7) === period);
      row[platform] = point?.[activeMetric] ?? null;
    });
    return row;
  });

  const metricConfig = METRICS.find((m) => m.key === activeMetric)!;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Performance history</h1>
        <p className="text-sm text-gray-400 mt-1">Track metric trends across platforms over time</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Period selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg p-1">
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={clsx('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                months === m
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {m}M
            </button>
          ))}
        </div>

        {/* Metric selector */}
        <select
          value={activeMetric}
          onChange={(e) => setActiveMetric(e.target.value)}
          className="input-base w-auto text-xs"
        >
          {METRICS.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Platform toggles */}
      {allPlatforms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allPlatforms.map((p) => (
            <button
              key={p}
              onClick={() => togglePlatform(p)}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                activePlatforms.includes(p)
                  ? 'border-transparent text-white'
                  : 'border-gray-200 dark:border-gray-700 text-gray-400 bg-transparent'
              )}
              style={activePlatforms.includes(p)
                ? { backgroundColor: PLATFORM_COLORS[p] || '#8b5cf6' }
                : {}
              }
            >
              <span className="w-2 h-2 rounded-full"
                style={{ backgroundColor: PLATFORM_COLORS[p] || '#8b5cf6' }}
              />
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Main trend chart */}
      {chartData.length > 0 ? (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-500" />
            {metricConfig.label} — last {months} months
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                {allPlatforms.filter((p) => activePlatforms.includes(p)).map((p) => (
                  <linearGradient key={p} id={`grad-${p}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PLATFORM_COLORS[p] || '#8b5cf6'} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={PLATFORM_COLORS[p] || '#8b5cf6'} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: colors.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: colors.textMuted }} tickFormatter={metricConfig.format} width={60} />
              <Tooltip formatter={(v: any) => [metricConfig.format(v), '']} />
              <Legend />
              {allPlatforms.filter((p) => activePlatforms.includes(p)).map((p) => (
                <Area
                  key={p}
                  type="monotone"
                  dataKey={p}
                  stroke={PLATFORM_COLORS[p] || '#8b5cf6'}
                  fill={`url(#grad-${p})`}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="card text-center py-16 border-dashed">
          <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No historical data yet</p>
          <p className="text-sm text-gray-400 mt-1">Analyze a few reports and trends will appear here</p>
        </div>
      )}

      {/* Per-platform summary cards */}
      {allPlatforms.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allPlatforms.map((platform) => {
            const pts = historyData[platform] || [];
            if (pts.length < 2) return null;
            const latest = pts[pts.length - 1];
            const prev = pts[pts.length - 2];
            const cur = latest[activeMetric] || 0;
            const prv = prev[activeMetric] || 0;
            const delta = prv > 0 ? ((cur - prv) / prv) * 100 : 0;
            return (
              <div key={platform} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PLATFORM_COLORS[platform] || '#8b5cf6' }} />
                    <p className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{platform}</p>
                  </div>
                  <span className={clsx('text-xs font-semibold flex items-center gap-0.5',
                    delta >= 0 ? 'text-green-600' : 'text-red-500'
                  )}>
                    {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {metricConfig.format(cur)}
                </p>
                <p className="text-xs text-gray-400">{metricConfig.label} · latest period</p>
              </div>
            );
          }).filter(Boolean)}
        </div>
      )}
    </div>
  );
}

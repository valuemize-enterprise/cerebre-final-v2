'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { metricsApi } from '../../../lib/api';
import { Breadcrumb } from '../../../components/ui/Breadcrumb';
import { ArrowLeft, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C', facebook: '#1877F2', twitter: '#1DA1F2',
  tiktok: '#69C9D0', youtube: '#FF0000', google_ads: '#4285F4',
  website: '#10B981', email: '#F59E0B', linkedin: '#0A66C2',
};

const MetricTile = ({ label, value, suffix = '', trend }: any) => (
  <div className="card p-4">
    <p className="section-title mb-1">{label}</p>
    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
      {typeof value === 'number' ? value.toLocaleString() : value || '—'}{suffix}
    </p>
    {trend !== undefined && (
      <p className={clsx('text-xs font-medium mt-1 flex items-center gap-1',
        trend >= 0 ? 'text-green-600' : 'text-red-500')}>
        {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(trend).toFixed(1)}% vs prev
      </p>
    )}
  </div>
);

export default function PlatformDetailPage() {
  const params = useParams();
  const router = useRouter();
  const platform = params.platform as string;
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    metricsApi.platform(platform, 12)
      .then(({ data }) => {
        // Map periods array to chart-friendly format
        const pts = (data.periods || []).map((p: any) => ({
          period: p.report_period_start?.slice(0, 7),
          impressions: Number(p.impressions),
          reach: Number(p.reach),
          engagementRate: Number(p.engagement_rate),
          followersGained: Number(p.followers_gained),
          conversions: Number(p.conversions),
          revenue: Number(p.revenue),
          adSpend: Number(p.ad_spend),
          roas: Number(p.roas),
        }));
        setData(pts);
      })
      .catch(() => toast.error('Failed to load platform data'))
      .finally(() => setLoading(false));
  }, [platform]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  );

  const color = PLATFORM_COLORS[platform] || '#8B5CF6';
  const latest = data[data.length - 1] || {};
  const prev = data[data.length - 2] || {};
  const delta = (field: string) => {
    const c = latest[field] || 0, p = prev[field] || 0;
    return p > 0 ? ((c - p) / p) * 100 : 0;
  };

  const chartData = data.map((d) => ({
    period: d.period?.slice(0, 7),
    impressions: d.impressions,
    reach: d.reach,
    engagement: parseFloat((d.engagementRate * 100).toFixed(2)),
    followers: d.followersGained,
    conversions: d.conversions,
    revenue: d.revenue,
  }));

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <Breadcrumb
        crumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Platforms', href: '/platforms' },
          { label: platform.charAt(0).toUpperCase() + platform.slice(1).replace('_', ' ') },
        ]}
      />
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: color }} />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white capitalize">{platform}</h1>
        </div>
        <span className="badge-neutral">{data.length} periods tracked</span>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricTile label="Impressions" value={latest.impressions} trend={delta('impressions')} />
        <MetricTile label="Reach" value={latest.reach} trend={delta('reach')} />
        <MetricTile label="Engagement rate" value={(latest.engagementRate * 100)?.toFixed(2)} suffix="%" trend={delta('engagementRate')} />
        <MetricTile label="Followers gained" value={latest.followersGained} trend={delta('followersGained')} />
        <MetricTile label="Conversions" value={latest.conversions} trend={delta('conversions')} />
        <MetricTile label="Revenue" value={`₦${(latest.revenue || 0).toLocaleString()}`} trend={delta('revenue')} />
        <MetricTile label="Ad spend" value={`₦${(latest.adSpend || 0).toLocaleString()}`} />
        <MetricTile label="ROAS" value={latest.roas?.toFixed(2)} suffix="x" trend={delta('roas')} />
      </div>

      {/* Impressions + reach area chart */}
      {chartData.length > 1 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Impressions & reach — 12 months
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.1} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => Number(v).toLocaleString()} />
              <Area type="monotone" dataKey="impressions" name="Impressions"
                stroke={color} fill="url(#gImp)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="reach" name="Reach"
                stroke={color} fill="url(#gReach)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Engagement + conversions bar chart */}
      {chartData.length > 1 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Engagement rate (%)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="%" />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Bar dataKey="engagement" name="Engagement %" fill={color} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Conversions</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => Number(v).toLocaleString()} />
                <Bar dataKey="conversions" name="Conversions" fill="#10B981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Empty state */}
      {data.length === 0 && (
        <div className="card text-center py-16 border-dashed">
          <p className="text-gray-500 font-medium">No data for {platform} yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload and analyze a report that includes {platform} metrics</p>
        </div>
      )}
    </div>
  );
}

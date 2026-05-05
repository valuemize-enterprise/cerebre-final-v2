'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { reportsApi } from '../../lib/api';
import api from '../../lib/api';
import { Loader2, TrendingUp, TrendingDown, ArrowRight, BarChart2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PLATFORM_META: Record<string, { color: string; bg: string; label: string }> = {
  instagram:  { color: '#E1306C', bg: 'bg-pink-50 dark:bg-pink-950/20',  label: 'Instagram' },
  facebook:   { color: '#1877F2', bg: 'bg-blue-50 dark:bg-blue-950/20',   label: 'Facebook' },
  twitter:    { color: '#1DA1F2', bg: 'bg-sky-50 dark:bg-sky-950/20',     label: 'Twitter / X' },
  tiktok:     { color: '#69C9D0', bg: 'bg-teal-50 dark:bg-teal-950/20',   label: 'TikTok' },
  youtube:    { color: '#FF0000', bg: 'bg-red-50 dark:bg-red-950/20',     label: 'YouTube' },
  google_ads: { color: '#4285F4', bg: 'bg-blue-50 dark:bg-blue-950/20',   label: 'Google Ads' },
  website:    { color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-950/20', label: 'Website' },
  email:      { color: '#F59E0B', bg: 'bg-amber-50 dark:bg-amber-950/20', label: 'Email' },
  linkedin:   { color: '#0A66C2', bg: 'bg-blue-50 dark:bg-blue-950/20',   label: 'LinkedIn' },
};

const fmt = (n: any) => {
  const v = Number(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return v.toLocaleString();
};

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/metrics/platforms')
      .then(({ data }) => setPlatforms(data.platforms || []))
      .catch(() => toast.error('Failed to load platforms'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Platforms</h1>
        <p className="text-sm text-gray-400 mt-1">
          Performance summary across all connected platforms
        </p>
      </div>

      {platforms.length === 0 ? (
        <div className="card text-center py-16 border-dashed">
          <BarChart2 className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No platform data yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload and analyze reports to see platform breakdowns</p>
          <Link href="/upload" className="btn-primary mt-4 inline-flex">Upload a report</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((p) => {
            const meta = PLATFORM_META[p.platform] || {
              color: '#8B5CF6',
              bg: 'bg-purple-50 dark:bg-purple-950/20',
              label: p.platform,
            };
            const engPct = parseFloat((Number(p.avg_engagement_rate) * 100).toFixed(2));

            return (
              <Link
                key={p.platform}
                href={`/platforms/${p.platform}`}
                className="card p-5 hover:shadow-md transition-all duration-200 group block"
              >
                {/* Platform header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${meta.color}18` }}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {meta.label}
                      </p>
                      <p className="text-xs text-gray-400">
                        {p.periods_tracked} period{p.periods_tracked !== '1' ? 's' : ''} tracked
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={clsx('rounded-lg p-3', meta.bg)}>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Impressions</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white mt-0.5">
                      {fmt(p.total_impressions)}
                    </p>
                  </div>
                  <div className={clsx('rounded-lg p-3', meta.bg)}>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Avg engagement</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white mt-0.5">
                      {engPct}%
                    </p>
                  </div>
                  <div className={clsx('rounded-lg p-3', meta.bg)}>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Conversions</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white mt-0.5">
                      {fmt(p.total_conversions)}
                    </p>
                  </div>
                  <div className={clsx('rounded-lg p-3', meta.bg)}>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white mt-0.5">
                      ₦{fmt(p.total_revenue)}
                    </p>
                  </div>
                </div>

                {/* Latest period */}
                {p.latest_period && (
                  <p className="mt-3 text-xs text-gray-400 text-right">
                    Last data: {new Date(p.latest_period).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Totals bar */}
      {platforms.length > 0 && (
        <div className="card p-5">
          <p className="section-title mb-4">All-platform totals</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: 'Total impressions',
                value: fmt(platforms.reduce((s, p) => s + Number(p.total_impressions), 0)),
              },
              {
                label: 'Total conversions',
                value: fmt(platforms.reduce((s, p) => s + Number(p.total_conversions), 0)),
              },
              {
                label: 'Total revenue',
                value: `₦${fmt(platforms.reduce((s, p) => s + Number(p.total_revenue), 0))}`,
              },
              {
                label: 'Total ad spend',
                value: `₦${fmt(platforms.reduce((s, p) => s + Number(p.total_ad_spend), 0))}`,
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="section-title">{label}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

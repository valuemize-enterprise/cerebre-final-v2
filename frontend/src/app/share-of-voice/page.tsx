'use client';
import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Loader2, Radio, Zap } from 'lucide-react';
import api from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import clsx from 'clsx';

const COLORS = ['#7c3aed', '#E1306C', '#1877F2', '#69C9D0', '#F59E0B', '#10B981'];

const TrendTag = ({ value }: { value: number }) => (
  <span className={clsx('flex items-center gap-0.5 text-xs font-semibold',
    value > 0 ? 'text-green-600' : value < 0 ? 'text-red-500' : 'text-gray-400')}>
    {value > 0 ? <TrendingUp className="w-3 h-3" /> : value < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
    {value > 0 ? '+' : ''}{value.toFixed(1)}pp
  </span>
);

export default function ShareOfVoicePage() {
  const { colors } = useTheme();
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('all');

  useEffect(() => {
    Promise.all([
      api.get(`/share-of-voice/latest?platform=${platform}`),
      api.get('/share-of-voice/history'),
    ]).then(([latestRes, histRes]) => {
      setData(latestRes.data.sov);
      setHistory(histRes.data.history || []);
    }).finally(() => setLoading(false));
  }, [platform]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  );

  const ourSOV = data ? parseFloat(data.impressions_sov || 0) * 100 : 0;
  const competitorData = data?.competitor_breakdown || [];
  const pieData = [
    { name: 'Us', value: ourSOV },
    ...competitorData.map((c: any) => ({
      name: c.name,
      value: parseFloat(c.impressions_sov || 0) * 100,
    })),
  ];

  const sovTrend = data?.sov_vs_prev_period
    ? parseFloat(data.sov_vs_prev_period) * 100
    : null;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-4 h-4 text-brand-500" />
            <span className="section-title text-brand-600">Market Intelligence</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Share of Voice</h1>
          <p className="text-sm text-gray-400 mt-1">
            Your brand's share of total industry conversation and visibility
          </p>
        </div>
        {/* Platform filter */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {['all', 'instagram', 'tiktok', 'facebook', 'twitter'].map(p => (
            <button key={p} onClick={() => setPlatform(p)}
              className={clsx('px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors',
                platform === p
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500')}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {data ? (
        <>
          {/* Hero SOV */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="card p-6 text-center">
              <p className="text-5xl font-bold text-brand-600 dark:text-brand-400">
                {ourSOV.toFixed(1)}<span className="text-2xl">%</span>
              </p>
              <p className="text-sm text-gray-500 mt-2">Share of impressions</p>
              {sovTrend !== null && (
                <div className="flex justify-center mt-2">
                  <TrendTag value={sovTrend} />
                </div>
              )}
            </div>
            <div className="card p-6 text-center">
              <p className="text-5xl font-bold text-brand-600 dark:text-brand-400">
                {(parseFloat(data.engagement_sov || 0) * 100).toFixed(1)}<span className="text-2xl">%</span>
              </p>
              <p className="text-sm text-gray-500 mt-2">Share of engagements</p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-5xl font-bold text-brand-600 dark:text-brand-400">
                {(parseFloat(data.mention_sov || 0) * 100).toFixed(1)}<span className="text-2xl">%</span>
              </p>
              <p className="text-sm text-gray-500 mt-2">Share of mentions</p>
            </div>
          </div>

          {/* Pie + bar split view */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Market share breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                    dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    labelLine={false}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Competitor comparison</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[{ name: 'Us', value: ourSOV }, ...competitorData.map((c: any) => ({
                  name: c.name,
                  value: parseFloat(c.impressions_sov || 0) * 100,
                }))]}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: colors.textMuted }} />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: colors.textMuted }} />
                  <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                  <Bar dataKey="value" name="SOV %" radius={[4, 4, 0, 0]}>
                    {[{ name: 'Us', value: ourSOV }, ...competitorData].map((_: any, i: number) => (
                      <Cell key={i} fill={i === 0 ? '#7c3aed' : '#e5e7eb'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SOV trend */}
          {history.length > 1 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">SOV trend over time</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={history.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis dataKey="period_start" tickFormatter={d => d?.slice(0, 7)}
                    tick={{ fontSize: 10, fill: colors.textMuted }} />
                  <YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                    tick={{ fontSize: 10, fill: colors.textMuted }} />
                  <Tooltip formatter={(v: any) => `${(Number(v) * 100).toFixed(1)}%`} />
                  <Line type="monotone" dataKey="impressions_sov" stroke="#7c3aed"
                    strokeWidth={2.5} dot={{ r: 4, fill: '#7c3aed' }} name="Impressions SOV" />
                  <Line type="monotone" dataKey="engagement_sov" stroke="#E1306C"
                    strokeWidth={2} dot={{ r: 3, fill: '#E1306C' }} name="Engagement SOV" />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* AI insight */}
          {data.trend && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-brand-500" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">AI Market Position Analysis</p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Your brand holds <strong>{ourSOV.toFixed(1)}%</strong> share of voice in the {data.industry} industry on{' '}
                {platform === 'all' ? 'all tracked platforms' : platform}.
                {ourSOV > 25 && ' This is a strong market position — focus on maintaining quality while growing reach.'}
                {ourSOV <= 25 && ourSOV > 10 && ' You are a meaningful player. Consistent publishing and engagement will improve this.'}
                {ourSOV <= 10 && ' There is significant room to grow your share. Doubling posting consistency and paid amplification could double your SOV within 3 months.'}
                {sovTrend !== null && sovTrend > 0 && ` Your SOV has grown by ${sovTrend.toFixed(1)} percentage points vs last period — strong momentum.`}
                {sovTrend !== null && sovTrend < 0 && ` Your SOV has declined by ${Math.abs(sovTrend).toFixed(1)} points vs last period — review competitor activity.`}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-16 border-dashed">
          <Radio className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No SOV data yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            Add competitors and upload platform data to calculate your share of voice
          </p>
        </div>
      )}
    </div>
  );
}

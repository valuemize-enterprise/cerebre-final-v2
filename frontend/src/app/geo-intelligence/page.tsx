'use client';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { MapPin, TrendingUp, TrendingDown, Filter, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import clsx from 'clsx';

// Nigeria states with coordinates for visual reference
const NIGERIA_STATES_REFERENCE = [
  'Lagos', 'Abuja (FCT)', 'Kano', 'Rivers', 'Ogun',
  'Oyo', 'Kaduna', 'Anambra', 'Delta', 'Imo',
  'Akwa Ibom', 'Enugu', 'Edo', 'Borno', 'Katsina',
];

const REGION_GROUPS: Record<string, string[]> = {
  'South West': ['Lagos', 'Ogun', 'Oyo', 'Osun', 'Ekiti', 'Ondo'],
  'South South': ['Rivers', 'Delta', 'Edo', 'Akwa Ibom', 'Cross River', 'Bayelsa'],
  'South East': ['Anambra', 'Imo', 'Enugu', 'Abia', 'Ebonyi'],
  'North West': ['Kano', 'Kaduna', 'Katsina', 'Kebbi', 'Sokoto', 'Zamfara', 'Jigawa'],
  'North East': ['Borno', 'Yobe', 'Adamawa', 'Taraba', 'Bauchi', 'Gombe'],
  'North Central': ['Abuja (FCT)', 'Niger', 'Kwara', 'Kogi', 'Benue', 'Nasarawa', 'Plateau'],
};

const getRegionColor = (index: number) => {
  const colors = ['#7c3aed', '#E1306C', '#1877F2', '#F59E0B', '#10B981', '#69C9D0'];
  return colors[index % colors.length];
};

export default function GeoIntelligencePage() {
  const { colors } = useTheme();
  const [geoData, setGeoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'state' | 'region'>('state');
  const [metric, setMetric] = useState('engagement_rate');
  const [platform, setPlatform] = useState('all');

  useEffect(() => {
    api.get(`/geo-intelligence?platform=${platform}&metric=${metric}`)
      .then(({ data }) => setGeoData(data.locations || []))
      .finally(() => setLoading(false));
  }, [platform, metric]);

  const topStates = [...geoData]
    .sort((a, b) => parseFloat(b[metric] || 0) - parseFloat(a[metric] || 0))
    .slice(0, 10);

  const regionData = Object.entries(REGION_GROUPS).map(([region, states]) => {
    const regionLocations = geoData.filter(d => states.includes(d.state));
    if (!regionLocations.length) return { region, value: 0, locations: 0 };
    const avgValue = regionLocations.reduce((s, d) => s + parseFloat(d[metric] || 0), 0) / regionLocations.length;
    return { region, value: avgValue, locations: regionLocations.length };
  }).filter(r => r.value > 0);

  const chartData = view === 'state' ? topStates.map(s => ({
    name: s.state || s.city || s.country,
    value: parseFloat(s[metric] || 0),
    impressions: Number(s.impressions),
    leads: Number(s.leads || 0),
  })) : regionData.map(r => ({
    name: r.region,
    value: r.value,
    locations: r.locations,
  }));

  const formatMetric = (v: number) => {
    if (metric === 'engagement_rate') return `${(v * 100).toFixed(2)}%`;
    if (metric === 'revenue') return `₦${v.toLocaleString()}`;
    return v.toLocaleString();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4 text-brand-500" />
          <span className="section-title text-brand-600">Geographic Intelligence</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Geo Performance</h1>
        <p className="text-sm text-gray-400 mt-1">
          Understand where your audience is and where your content performs best
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {(['state', 'region'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={clsx('px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors',
                view === v ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
              By {v}
            </button>
          ))}
        </div>

        <select className="input-base text-xs py-2 w-auto" value={metric}
          onChange={e => setMetric(e.target.value)}>
          <option value="engagement_rate">Engagement rate</option>
          <option value="impressions">Impressions</option>
          <option value="leads">Leads</option>
          <option value="revenue">Revenue</option>
          <option value="conversions">Conversions</option>
        </select>

        <select className="input-base text-xs py-2 w-auto" value={platform}
          onChange={e => setPlatform(e.target.value)}>
          <option value="all">All platforms</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="tiktok">TikTok</option>
        </select>
      </div>

      {chartData.length === 0 ? (
        <div className="card text-center py-16 border-dashed">
          <MapPin className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No geographic data yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload platform reports that include audience location data</p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Top {view === 'state' ? 'states' : 'regions'} by {metric.replace('_', ' ')}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.grid} />
                <XAxis type="number" tickFormatter={formatMetric}
                  tick={{ fontSize: 10, fill: colors.textMuted }} />
                <YAxis dataKey="name" type="category" width={120}
                  tick={{ fontSize: 11, fill: colors.textMuted }} />
                <Tooltip formatter={(v: any) => formatMetric(v)} />
                <Bar dataKey="value" name={metric.replace('_', ' ')} radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i}
                      fill={i === 0 ? '#7c3aed' : i === 1 ? '#9f67f5' : `rgba(124,58,237,${Math.max(0.2, 1 - i * 0.08)})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Insights */}
          <div className="grid sm:grid-cols-3 gap-4">
            {topStates.slice(0, 3).map((state, i) => {
              const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
              return (
                <div key={i} className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{icon}</span>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {state.state || state.city}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                    {formatMetric(parseFloat(state[metric] || 0))}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 capitalize">{metric.replace('_', ' ')}</p>
                  {state.impressions > 0 && (
                    <p className="text-xs text-gray-400">
                      {Number(state.impressions).toLocaleString()} impressions
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Key insight box */}
          <div className="card p-5 border-brand-100 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/20">
            <p className="text-xs font-semibold text-brand-600 mb-2 uppercase tracking-wider">Geographic Insight</p>
            <p className="text-sm text-brand-800 dark:text-brand-300 leading-relaxed">
              {topStates[0] && (
                <>
                  <strong>{topStates[0].state || topStates[0].city}</strong> is your highest-performing location
                  by {metric.replace('_', ' ')}.
                  {topStates[0].followers_pct && ` ${(parseFloat(topStates[0].followers_pct) * 100).toFixed(0)}% of your audience is based there.`}
                  {' '}Consider allocating more paid budget to this location and creating content that resonates with local culture and trends.
                </>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

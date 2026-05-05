'use client';
import { useEffect, useState, useRef } from 'react';
import {
  Activity, Users, TrendingUp, TrendingDown, RefreshCw,
  Zap, Globe, Clock, Radio, BarChart2, Loader2,
  Link2,
} from 'lucide-react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import api from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';
import { useTheme } from '../../hooks/useTheme';
import { format } from 'date-fns';
import clsx from 'clsx';

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C', facebook: '#1877F2', tiktok: '#69C9D0',
  twitter: '#1DA1F2', linkedin: '#0A66C2', youtube: '#FF0000',
  google_analytics: '#4285F4', google_ads: '#34A853',
};

const REFRESH_INTERVAL = 60000; // 60 seconds for non-realtime

const LiveDot = ({ animate = true }: { animate?: boolean }) => (
  <span className={clsx('inline-flex w-2 h-2 rounded-full bg-green-500', animate && 'animate-pulse')} />
);

const MetricCard = ({
  label, value, previous, suffix = '', icon: Icon, platform, trend, loading
}: any) => {
  const change = previous && previous > 0 ? ((value - previous) / previous) * 100 : null;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-gray-400">{label}</p>
        {platform && (
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
            style={{ background: PLATFORM_COLORS[platform] || '#8B5CF6' }}>
            {platform[0].toUpperCase()}
          </span>
        )}
        {Icon && !platform && <Icon className="w-4 h-4 text-gray-400" />}
      </div>
      {loading ? (
        <div className="h-8 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {suffix && <span className="text-sm font-normal text-gray-400 ml-0.5">{suffix}</span>}
        </p>
      )}
      {change !== null && (
        <p className={clsx('text-xs font-medium mt-1 flex items-center gap-0.5',
          change >= 0 ? 'text-green-600' : 'text-red-500')}>
          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(change).toFixed(1)}% vs yesterday
        </p>
      )}
    </div>
  );
};

export default function RealTimeDashboard() {
  const { colors } = useTheme();
   const { socket } = useSocket({
    token: null, // No auth needed for this page
  });
  const [snapshot, setSnapshot] = useState<any>(null);
  const [realtimeUsers, setRealtimeUsers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [trend, setTrend] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<Record<string, string>>({});
  const intervalRef = useRef<any>(null);

  const fetchSnapshot = async () => {
    try {
      const [snapRes, rtRes] = await Promise.all([
        api.get('/live/snapshot?days=1'),
        api.get('/live/realtime-users').catch(() => ({ data: { activeUsers: null } })),
      ]);
      setSnapshot(snapRes.data);
      setRealtimeUsers(rtRes.data.activeUsers);
      setLastRefresh(new Date());
      setSyncStatus(snapRes.data.syncStatus || {});
    } catch (err: any) {
      console.error('Failed to fetch snapshot', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrend = async () => {
    const { data } = await api.get('/live/trend?metric=impressions&hours=24');
    setTrend(data.points || []);
  };

  useEffect(() => {
    fetchSnapshot();
    fetchTrend();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchSnapshot, REFRESH_INTERVAL);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh]);

  // WebSocket — real-time events
  useEffect(() => {
    if (!socket) return;
    socket.on('live:metric_update', (data: any) => {
      setSnapshot((prev: any) => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (!updated.metrics) updated.metrics = {};
        if (!updated.metrics[data.platform]) updated.metrics[data.platform] = {};
        updated.metrics[data.platform][data.metric] = data.value;
        return updated;
      });
    });
    socket.on('live:sync_complete', (data: any) => {
      setSyncStatus(prev => ({ ...prev, [data.platform]: 'synced' }));
      fetchSnapshot();
    });
    return () => { socket.off('live:metric_update'); socket.off('live:sync_complete'); };
  }, [socket]);

  const metrics = snapshot?.metrics || {};
  const connections = snapshot?.connections || [];

  // Aggregate cross-platform totals
  const totals = {
    impressions: Object.values(metrics).reduce((s: number, p: any) => s + (p.impressions || p.page_impressions || 0), 0),
    sessions: metrics.google_analytics?.sessions || 0,
    leads: Object.values(metrics).reduce((s: number, p: any) => s + (p.conversions || 0), 0),
    adSpend: Object.values(metrics).reduce((s: number, p: any) => s + (p.ad_spend || 0), 0),
  };

  return (
    <div className="p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wider flex items-center gap-1.5">
              <LiveDot /> Live Dashboard
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Real-Time Intelligence</h1>
          <p className="text-xs text-gray-400 mt-1">
            Auto-refreshes every 60 seconds · Last updated: {format(lastRefresh, 'HH:mm:ss')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(a => !a)}
            className={clsx('btn-secondary text-xs py-1.5', autoRefresh && 'text-green-600')}>
            <Radio className="w-3.5 h-3.5" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button onClick={() => { fetchSnapshot(); fetchTrend(); }} className="btn-secondary text-xs py-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh now
          </button>
        </div>
      </div>

      {/* Real-time users hero card */}
      {realtimeUsers !== null && (
        <div className="card p-6 bg-gradient-to-r from-brand-600 to-purple-600 border-0 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-brand-200 uppercase tracking-wider mb-1 flex items-center gap-2">
                <LiveDot /> Active right now on your website
              </p>
              <p className="text-6xl font-bold">{realtimeUsers.toLocaleString()}</p>
              <p className="text-brand-200 text-sm mt-1">Real-time visitors from Google Analytics</p>
            </div>
            <Globe className="w-16 h-16 text-white opacity-20" />
          </div>
        </div>
      )}

      {/* Platform sync status bar */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Platform sync status</p>
        <div className="flex flex-wrap gap-2">
          {connections.map((conn: any) => (
            <div key={conn.platform} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border"
              style={{
                background: conn.status === 'connected' ? `${PLATFORM_COLORS[conn.platform]}12` : 'transparent',
                borderColor: conn.status === 'connected' ? PLATFORM_COLORS[conn.platform] : '#e5e7eb',
                color: conn.status === 'connected' ? PLATFORM_COLORS[conn.platform] : '#9ca3af',
              }}>
              <span className={clsx('w-1.5 h-1.5 rounded-full',
                conn.status === 'connected' ? 'bg-green-500' : 'bg-gray-300')} />
              <span className="capitalize font-medium">{conn.platform.replace('_', ' ')}</span>
              {conn.last_sync_at && (
                <span style={{ opacity: 0.7 }}>
                  · {format(new Date(conn.last_sync_at), 'HH:mm')}
                </span>
              )}
            </div>
          ))}
          {connections.length === 0 && (
            <p className="text-xs text-gray-400">No platforms connected. <a href="/connect" className="text-brand-500 hover:underline">Connect platforms →</a></p>
          )}
        </div>
      </div>

      {/* Cross-platform totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="Total impressions today" value={Math.round(totals.impressions)} icon={BarChart2} loading={loading} />
        <MetricCard label="Website sessions" value={totals.sessions} icon={Globe} loading={loading} />
        <MetricCard label="Total conversions" value={totals.leads} icon={TrendingUp} loading={loading} />
        <MetricCard label="Ad spend today" value={`₦${(totals.adSpend).toLocaleString()}`} icon={Activity} loading={loading} />
      </div>

      {/* 24h trend */}
      {trend.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-500" />
            Impressions — last 24 hours
            <span className="ml-auto text-xs text-gray-400 font-normal">All platforms combined</span>
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: colors.textMuted }} />
              <YAxis tick={{ fontSize: 10, fill: colors.textMuted }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [Number(v).toLocaleString(), 'Impressions']} />
              <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2.5}
                dot={false} activeDot={{ r: 4, fill: '#7c3aed' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-platform live metrics */}
      {Object.keys(metrics).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Live by platform</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(metrics).map(([platform, data]: [string, any]) => {
              const conn = connections.find((c: any) => c.platform === platform);
              return (
                <div key={platform} className="card p-4"
                  style={{ borderLeft: `3px solid ${PLATFORM_COLORS[platform] || '#8B5CF6'}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: PLATFORM_COLORS[platform] || '#8B5CF6' }}>
                      {platform[0].toUpperCase()}
                    </span>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 capitalize">
                      {platform.replace('_', ' ')}
                    </p>
                    {conn?.last_sync_at && (
                      <p className="text-[10px] text-gray-400 ml-auto">
                        {format(new Date(conn.last_sync_at), 'HH:mm')}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(data)
                      .filter(([k]) => !k.startsWith('_') && typeof data[k] === 'number')
                      .slice(0, 4)
                      .map(([key, value]: [string, any]) => (
                        <div key={key}>
                          <p className="text-[10px] text-gray-400 capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {key.includes('rate') || key.includes('pct')
                              ? `${(value * 100).toFixed(1)}%`
                              : typeof value === 'number' && value >= 1000
                              ? `${(value/1000).toFixed(1)}k`
                              : String(value)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No data state */}
      {!loading && Object.keys(metrics).length === 0 && (
        <div className="card text-center py-16 border-dashed">
          <Radio className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No live data yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            Connect your platforms to start seeing real-time metrics here
          </p>
          <a href="/connect" className="btn-primary mt-4 inline-flex">
            <Link2 className="w-4 h-4" /> Connect platforms
          </a>
        </div>
      )}
    </div>
  );
}

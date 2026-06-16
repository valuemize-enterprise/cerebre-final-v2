'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, TrendingUp, TrendingDown, Loader2, BarChart2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('cerebre_client_token')}` });

const PLATFORM_COLOURS: Record<string,string> = {
  instagram:'#E1306C', facebook:'#1877F2', tiktok:'#69C9D0',
  twitter:'#1DA1F2', linkedin:'#0A66C2', youtube:'#FF0000',
  google_analytics:'#4285F4', website:'#6d28d9',
};
const PLATFORM_ICONS: Record<string,string> = {
  instagram:'📸', facebook:'👥', tiktok:'🎵', twitter:'🐦',
  linkedin:'💼', youtube:'▶️', google_analytics:'📊', website:'🌐',
};

const MetricCard = ({ label, value, changePct, suffix='', highlight=false }: any) => {
  const isPos = changePct > 0;
  const fmtVal = typeof value === 'number'
    ? value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value >= 1000 ? `${(value/1000).toFixed(0)}K` : value.toLocaleString()
    : value;

  return (
    <div className="rounded-xl p-4 transition-all"
      style={highlight ? { background: 'rgba(109,40,217,0.15)', border: '1px solid rgba(109,40,217,0.3)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-black text-white">{fmtVal}{suffix}</p>
      {changePct !== null && changePct !== undefined && (
        <p className={clsx('text-xs font-semibold flex items-center gap-1 mt-1.5', isPos ? 'text-green-400' : 'text-red-400')}>
          {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isPos ? '+' : ''}{changePct?.toFixed(1)}% vs prev period
        </p>
      )}
    </div>
  );
};

export default function PlatformPage() {
  const { platform } = useParams() as { platform: string };
  const [data, setData]     = useState<any>(null);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);

  const colour = PLATFORM_COLOURS[platform] || '#6d28d9';
  const icon   = PLATFORM_ICONS[platform]   || '📊';

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/client/platforms/${platform}?period=${period}&granularity=daily`, { headers: hdrs() })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [platform, period]);

  const metrics    = data?.metrics || [];
  const trend      = data?.trend   || [];
  const topContent = data?.topContent || [];

  const trendByMetric: Record<string,any[]> = {};
  trend.forEach((r: any) => {
    if (!trendByMetric[r.metric_type]) trendByMetric[r.metric_type] = [];
    trendByMetric[r.metric_type].push({ date: r.date?.slice(5,10), value: parseFloat(r.value || 0) });
  });

  const mainTrend = trendByMetric.impressions || trendByMetric.sessions || trendByMetric.views || Object.values(trendByMetric)[0] || [];

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <a href="/client/platforms" className="p-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div className="flex items-center gap-3 flex-1">
          <span className="text-3xl">{icon}</span>
          <div>
            <h1 className="text-xl font-black text-white capitalize">{platform.replace('_', ' ')}</h1>
            <p className="text-white/30 text-sm">Last {period} days</p>
          </div>
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {[7, 30, 90].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-bold transition-all', period === p ? 'text-white' : 'text-white/30')}
              style={period === p ? { background: `${colour}40`, border: `1px solid ${colour}50` } : {}}>
              {p === 90 ? '90d' : p === 30 ? '30d' : '7d'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin" style={{ color: colour }} /></div>
      ) : (
        <div className="space-y-6">
          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {metrics.slice(0, 8).map((m: any) => (
              <MetricCard key={m.metric} label={m.metric.replace(/_/g,' ')} value={m.current} changePct={m.changePct}
                suffix={m.metric.includes('rate') ? '%' : ''} highlight={metrics.indexOf(m) === 0} />
            ))}
          </div>

          {/* Trend chart */}
          {mainTrend.length > 1 && (
            <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-4">Trend</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={mainTrend}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colour} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={colour} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip contentStyle={{ background: '#1a1040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: any) => [Number(v).toLocaleString(), 'Value']} />
                  <Area type="monotone" dataKey="value" stroke={colour} strokeWidth={2.5} fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: colour }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top content */}
          {topContent.length > 0 && (
            <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-4">Top performing content</p>
              <div className="space-y-3">
                {topContent.slice(0, 5).map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {c.thumbnail_url && <img src={c.thumbnail_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/60 capitalize font-semibold mb-0.5">{c.content_type || 'post'}</p>
                      <p className="text-xs text-white/40 line-clamp-1">{c.caption?.slice(0,80) || 'No caption'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black" style={{ color: colour }}>
                        {(c.engagement_rate * 100).toFixed(1)}%
                      </p>
                      <p className="text-[10px] text-white/20">ER</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

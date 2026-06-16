'use client';
import { useEffect, useState } from 'react';
import { Radar, TrendingUp, TrendingDown, Zap, Loader2, Activity, Eye } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar as RadarSeries,
  ResponsiveContainer, Tooltip, LineChart, Line, XAxis, CartesianGrid,
} from 'recharts';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('cerebre_client_token')}` });

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸', facebook: '👥', tiktok: '🎵', twitter: '🐦',
  linkedin: '💼', youtube: '▶️', website: '🌐',
};

// SOV donut chart (CSS-based)
const SOVDonut = ({ mySOV, competitors }: { mySOV: number; competitors: any[] }) => {
  const total = mySOV + competitors.reduce((s, c) => s + (c.sov || 0), 0);
  const myPct  = total > 0 ? Math.round((mySOV / total) * 100) : 0;

  const slices = [
    { label: 'You', pct: myPct, colour: '#6d28d9' },
    ...competitors.slice(0, 3).map((c, i) => ({
      label: c.name,
      pct: total > 0 ? Math.round(((c.sov || 0) / total) * 100) : 0,
      colour: ['#3b82f6', '#f59e0b', '#10b981'][i],
    })),
  ];

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-28 h-28 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {(() => {
            let cumulative = 0;
            return slices.map(({ pct, colour }, i) => {
              const startAngle = (cumulative / 100) * 360;
              const angle      = (pct / 100) * 360;
              const r          = 40;
              const x1 = 50 + r * Math.cos((startAngle * Math.PI) / 180);
              const y1 = 50 + r * Math.sin((startAngle * Math.PI) / 180);
              const x2 = 50 + r * Math.cos(((startAngle + angle) * Math.PI) / 180);
              const y2 = 50 + r * Math.sin(((startAngle + angle) * Math.PI) / 180);
              cumulative += pct;
              return (
                <path key={i}
                  d={`M50,50 L${x1},${y1} A${r},${r} 0 ${angle > 180 ? 1 : 0},1 ${x2},${y2} Z`}
                  fill={colour} opacity={0.85} />
              );
            });
          })()}
          <circle cx="50" cy="50" r="28" fill="#0d0630" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-lg font-black text-white">{myPct}%</p>
          <p className="text-[9px] text-purple-400 font-semibold">YOUR SOV</p>
        </div>
      </div>
      <div className="space-y-2">
        {slices.map(({ label, pct, colour }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colour }} />
            <span className="text-xs text-white/60 flex-1 truncate max-w-24">{label}</span>
            <span className="text-xs font-bold text-white/80">{pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Metric comparison row
const CompareRow = ({ metric, myValue, competitors }: { metric: string; myValue: number; competitors: any[] }) => {
  const all    = [myValue, ...competitors.map(c => c.value || 0)];
  const maxVal = Math.max(...all, 1);
  const isBest = myValue === Math.max(...all);

  return (
    <div className="py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
        {metric.replace('_', ' ')}
      </p>
      <div className="space-y-2">
        {/* My bar */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-purple-400 font-bold w-14 text-right shrink-0">You</span>
          <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${(myValue / maxVal) * 100}%`, background: 'linear-gradient(90deg,#6d28d9,#a78bfa)' }} />
          </div>
          <span className={clsx('text-xs font-bold w-16 text-right shrink-0', isBest ? 'text-purple-300' : 'text-white/60')}>
            {myValue >= 1000000 ? `${(myValue / 1000000).toFixed(1)}M` : myValue >= 1000 ? `${(myValue / 1000).toFixed(0)}K` : myValue.toLocaleString()}
            {isBest && ' ★'}
          </span>
        </div>
        {/* Competitor bars */}
        {competitors.map((c, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[10px] text-white/30 w-14 text-right truncate shrink-0">{c.name}</span>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full" style={{ width: `${((c.value || 0) / maxVal) * 100}%`, background: ['#3b82f6', '#f59e0b', '#10b981'][i] }} />
            </div>
            <span className="text-xs text-white/40 w-16 text-right shrink-0">
              {(c.value || 0) >= 1000000 ? `${((c.value || 0) / 1000000).toFixed(1)}M` : (c.value || 0) >= 1000 ? `${((c.value || 0) / 1000).toFixed(0)}K` : (c.value || 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function DepthViewPage() {
  const [data, setData]         = useState<any>(null);
  const [pulse, setPulse]       = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<'compare' | 'feed'>('compare');

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/client/depth-view`, { headers: hdrs() }),
      axios.get(`${API}/client/intellipulse?limit=15`, { headers: hdrs() }),
    ]).then(([depthRes, pulseRes]) => {
      setData(depthRes.data);
      setPulse(pulseRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
  );

  const myMetrics  = data?.myMetrics || {};
  const competitors = data?.competitors || [];
  const sovHistory  = data?.shareOfVoiceHistory || [];

  // Build comparison data for each platform/metric
  const comparisonMetrics = [
    { metric: 'instagram_followers', myValue: myMetrics.instagram?.followers_total || 0,
      competitors: competitors.map((c: any) => ({ name: c.name, value: c.followerEsts?.instagram || 0 })) },
    { metric: 'instagram_engagement', myValue: myMetrics.instagram?.engagement_rate ? myMetrics.instagram.engagement_rate * 10000 : 0,
      competitors: competitors.map((c: any) => ({ name: c.name, value: (c.engagementEsts?.instagram || 0) * 10000 })) },
    { metric: 'facebook_reach', myValue: myMetrics.facebook?.reach || 0,
      competitors: competitors.map((c: any) => ({ name: c.name, value: c.followerEsts?.facebook || 0 })) },
    { metric: 'tiktok_views', myValue: myMetrics.tiktok?.video_views || 0,
      competitors: competitors.map((c: any) => ({ name: c.name, value: c.followerEsts?.tiktok || 0 })) },
  ].filter(m => m.myValue > 0 || m.competitors.some((c: any) => c.value > 0));

  const myTotalSOV = sovHistory.length > 0
    ? parseFloat(sovHistory[0].our_sov || 0) * 100
    : 25; // default estimate

  const feed = pulse?.feed || [];

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-purple-400" />
          <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">DepthView™</p>
        </div>
        <h1 className="text-2xl font-black text-white">Competitor Intelligence</h1>
        <p className="text-white/40 text-sm mt-1">
          Tracking {competitors.length} competitor{competitors.length !== 1 ? 's' : ''} across all platforms
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {(['compare', 'feed'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={clsx('px-4 py-2 rounded-lg text-sm font-bold transition-all capitalize',
              activeTab === tab ? 'text-white' : 'text-white/30 hover:text-white/60')}
            style={activeTab === tab ? { background: 'linear-gradient(135deg,rgba(109,40,217,0.5),rgba(147,51,234,0.3))', border: '1px solid rgba(109,40,217,0.4)' } : {}}>
            {tab === 'feed' ? 'IntelliPulse™ Feed' : 'Comparison'}
          </button>
        ))}
      </div>

      {activeTab === 'compare' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Share of voice */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border p-5 mb-5" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Share of Voice</p>
              {competitors.length > 0 ? (
                <SOVDonut mySOV={myTotalSOV} competitors={competitors.map((c: any) => ({ name: c.name, sov: (c.sov || 0.1) * 100 }))} />
              ) : (
                <p className="text-white/20 text-sm text-center py-4">No competitor data yet</p>
              )}
            </div>

            {/* SOV trend */}
            {sovHistory.length > 1 && (
              <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">SOV Trend</p>
                <ResponsiveContainer width="100%" height={90}>
                  <LineChart data={sovHistory.slice().reverse()}>
                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="period_end" hide />
                    <Tooltip contentStyle={{ background: '#1a1040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: any) => [`${Math.round(parseFloat(v) * 100)}%`, 'SOV']} />
                    <Line type="monotone" dataKey="our_sov" stroke="#a78bfa" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Metric comparisons */}
          <div className="lg:col-span-2 rounded-2xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Platform Comparison</p>
            {comparisonMetrics.length > 0 ? (
              comparisonMetrics.map(m => (
                <CompareRow key={m.metric} metric={m.metric} myValue={m.myValue} competitors={m.competitors} />
              ))
            ) : (
              <div className="text-center py-12">
                <Radar className="w-10 h-10 mx-auto text-white/10 mb-3" />
                <p className="text-white/30 text-sm">Connect platforms to see comparison data</p>
              </div>
            )}
          </div>

          {/* Competitor cards */}
          {competitors.length > 0 && (
            <div className="lg:col-span-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {competitors.map((c: any) => (
                <div key={c.id} className="rounded-2xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-white/90 truncate">{c.name}</p>
                    {c.sov && <span className="text-xs text-purple-400 font-bold">{Math.round(c.sov * 100)}% SOV</span>}
                  </div>
                  {c.platforms && (
                    <div className="flex gap-1.5 mb-3 flex-wrap">
                      {Object.keys(c.platforms).map(p => (
                        <span key={p} className="text-base" title={p}>{PLATFORM_ICONS[p] || '📊'}</span>
                      ))}
                    </div>
                  )}
                  {c.strategy && (
                    <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">{c.strategy}</p>
                  )}
                  {c.lastActivity && (
                    <p className="text-xs text-amber-400/70 mt-2 border-t border-white/5 pt-2 line-clamp-2">
                      📡 {c.lastActivity}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* IntelliPulse™ Feed */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {!pulse?.hasRealData && (
            <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d' }}>
              <strong>IntelliPulse™ is warming up.</strong> As your account manager adds competitor profiles and we detect more activity, this feed will populate with real-time competitor moves.
            </div>
          )}
          {feed.length === 0 ? (
            <div className="text-center py-20">
              <Activity className="w-12 h-12 mx-auto text-white/10 mb-4" />
              <p className="text-white/30 font-semibold">No competitor activity tracked yet</p>
              <p className="text-white/15 text-sm mt-1">Ask your account manager to add competitors to track</p>
            </div>
          ) : feed.map((item: any, i: number) => (
            <div key={i} className="flex gap-4 p-4 rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                style={{ background: 'rgba(109,40,217,0.2)' }}>
                {item.type === 'new_post' ? '📱' : item.type === 'campaign' ? '🚀' : item.type === 'milestone' ? '🏆' : '📡'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-white/80">{item.competitor_name}</p>
                  <span className="text-[10px] text-white/20">·</span>
                  <p className="text-xs text-white/30">{item.detected_at ? new Date(item.detected_at).toLocaleDateString() : 'Recent'}</p>
                </div>
                <p className="text-sm font-semibold text-white/60 mb-1">{item.title}</p>
                <p className="text-xs text-white/30 line-clamp-2">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

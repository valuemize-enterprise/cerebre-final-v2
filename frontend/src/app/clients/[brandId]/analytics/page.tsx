'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  BarChart2, TrendingUp, TrendingDown, Calendar, Download,
  ArrowLeft, Loader2, Filter, RefreshCw
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, Badge, Button, Tabs, StatCard, TOKENS } from '@/components';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const fmtNum = (n: any) => {
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  if (num >= 1_000_000) return `${(num/1_000_000).toFixed(1)}M`;
  if (num >= 1_000)     return `${(num/1_000).toFixed(1)}K`;
  return Math.round(num).toLocaleString();
};

const CHART_TOOLTIP_STYLE = {
  background: '#1a0f3a',
  border: '1px solid rgba(109,40,217,0.3)',
  borderRadius: 10,
  color: 'rgba(255,255,255,0.8)',
  fontSize: 12,
};

const PERIODS = [
  { value:'7d',  label:'7 days'  },
  { value:'30d', label:'30 days' },
  { value:'90d', label:'3 months'},
  { value:'1y',  label:'1 year'  },
];

const PLATFORMS = ['instagram','facebook','tiktok','twitter','linkedin','youtube','google_analytics','website'];
const P_ICONS:   Record<string,string> = { instagram:'📸',facebook:'👥',tiktok:'🎵',twitter:'🐦',linkedin:'💼',youtube:'▶️',google_analytics:'📊',website:'🌐' };

export default function BrandAnalyticsPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const [brand,    setBrand]    = useState<any>(null);
  const [data,     setData]     = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [period,   setPeriod]   = useState('30d');
  const [platform, setPlatform] = useState('all');
  const [tab,      setTab]      = useState('overview');

  const load = async (p = period, pl = platform) => {
    setLoading(true);
    await Promise.all([
      axios.get(`${API}/admin/brands/${brandId}`, { headers: hdrs() }).then(r => setBrand(r.data.brand || r.data)).catch(() => {}),
      axios.get(`${API}/metrics/analytics?brand_id=${brandId}&period=${p}&platform=${pl}`, { headers: hdrs() })
        .then(r => setData(r.data)).catch(() => setData({})),
    ]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [brandId]);

  const series  = data?.time_series  || [];
  const summary = data?.summary      || {};
  const byPlat  = data?.by_platform  || [];

  const changePct = (curr: number, prev: number) => {
    if (!prev) return 0;
    return parseFloat(((curr - prev) / prev * 100).toFixed(1));
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-7">
        <div>
          <a href={`/clients/${brandId}`} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 mb-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5"/> {brand?.name || 'Brand hub'}
          </a>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full" style={{ background: '#3b82f6' }}/>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Intelligence</p>
          </div>
          <h1 className="text-2xl font-black text-white">Analytics</h1>
          <p className="text-white/40 text-sm mt-1">{brand?.name} · Performance deep-dive</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period selector */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background:'rgba(255,255,255,0.04)' }}>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => { setPeriod(p.value); load(p.value, platform); }}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', period === p.value ? 'text-white' : 'text-white/35 hover:text-white/55')}
                style={period === p.value ? { background:'rgba(109,40,217,0.35)', border:'1px solid rgba(109,40,217,0.4)' } : {}}>
                {p.label}
              </button>
            ))}
          </div>
          {/* Platform filter */}
          <select value={platform} onChange={e => { setPlatform(e.target.value); load(period, e.target.value); }}
            className="text-xs rounded-xl px-3 py-2 outline-none"
            style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color: platform !== 'all' ? '#fff' : 'rgba(255,255,255,0.4)' }}>
            <option value="all">All platforms</option>
            {PLATFORMS.map(p => <option key={p} value={p} style={{ background:'#0f0a2e', textTransform:'capitalize' }}>{p.replace('_',' ')}</option>)}
          </select>
          <button onClick={() => load()} disabled={loading}
            className="p-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors">
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')}/>
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard label="Total followers"  value={fmtNum(summary.total_followers)} change={changePct(summary.total_followers, summary.prev_followers)} icon={<TrendingUp className="w-5 h-5"/>} />
        <StatCard label="Avg engagement"   value={summary.avg_engagement_rate ? `${parseFloat(summary.avg_engagement_rate).toFixed(2)}%` : '—'} change={changePct(parseFloat(summary.avg_engagement_rate||0), parseFloat(summary.prev_engagement||0))} icon={<BarChart2 className="w-5 h-5"/>} colour="#059669" />
        <StatCard label="Impressions"      value={fmtNum(summary.total_impressions)} change={changePct(summary.total_impressions, summary.prev_impressions)} icon={<TrendingUp className="w-5 h-5"/>} colour="#3b82f6" />
        <StatCard label="Posts published"  value={summary.posts_count || '—'} icon={<Calendar className="w-5 h-5"/>} colour="#d97706" />
      </div>

      <Tabs tabs={[
        { key:'overview',   label:'Overview'            },
        { key:'followers',  label:'Followers'           },
        { key:'engagement', label:'Engagement'          },
        { key:'platforms',  label:'By platform'         },
      ]} active={tab} onChange={setTab} />

      <div className="mt-6 space-y-6">

        {/* Followers over time */}
        {(tab === 'overview' || tab === 'followers') && series.length > 0 && (
          <Card>
            <p className="text-sm font-bold text-white/60 uppercase tracking-wider mb-5">Follower growth</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={series} margin={{ left:0, right:8, top:4, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="date" tick={{ fill:'rgba(255,255,255,0.3)', fontSize:11 }} axisLine={false} tickLine={false}
                  tickFormatter={d => new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}/>
                <YAxis tick={{ fill:'rgba(255,255,255,0.3)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={fmtNum} width={44}/>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: any) => [fmtNum(v), 'Followers']} labelFormatter={d => new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'long'})}/>
                <Line type="monotone" dataKey="followers" stroke="#6d28d9" strokeWidth={2.5} dot={false} activeDot={{ r:5, fill:'#6d28d9' }}/>
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Engagement over time */}
        {(tab === 'overview' || tab === 'engagement') && series.length > 0 && (
          <Card>
            <p className="text-sm font-bold text-white/60 uppercase tracking-wider mb-5">Engagement rate (%)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={series} margin={{ left:0, right:8, top:4, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="date" tick={{ fill:'rgba(255,255,255,0.3)', fontSize:11 }} axisLine={false} tickLine={false}
                  tickFormatter={d => new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}/>
                <YAxis tick={{ fill:'rgba(255,255,255,0.3)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={36}/>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: any) => [`${parseFloat(v).toFixed(2)}%`, 'Engagement']}/>
                <Bar dataKey="engagement_rate" fill="#059669" radius={[4,4,0,0]} fillOpacity={0.8}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Impressions chart */}
        {(tab === 'overview') && series.length > 0 && (
          <Card>
            <p className="text-sm font-bold text-white/60 uppercase tracking-wider mb-5">Impressions</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={series} margin={{ left:0, right:8, top:4, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="date" tick={{ fill:'rgba(255,255,255,0.3)', fontSize:11 }} axisLine={false} tickLine={false}
                  tickFormatter={d => new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}/>
                <YAxis tick={{ fill:'rgba(255,255,255,0.3)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={fmtNum} width={44}/>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: any) => [fmtNum(v), 'Impressions']}/>
                <Bar dataKey="impressions" fill="#3b82f6" radius={[4,4,0,0]} fillOpacity={0.7}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* By platform breakdown */}
        {(tab === 'platforms' || tab === 'overview') && byPlat.length > 0 && (
          <div>
            <p className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Platform breakdown</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {byPlat.map((p: any) => (
                <Card key={p.platform} hover onClick={() => window.location.href = `/clients/${brandId}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{P_ICONS[p.platform] || '🔗'}</span>
                    <p className="text-sm font-bold text-white/75 capitalize">{p.platform.replace('_',' ')}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { l:'Followers', v: fmtNum(p.followers) },
                      { l:'Engagement',v: p.engagement_rate ? `${parseFloat(p.engagement_rate).toFixed(1)}%` : '—' },
                      { l:'Impressions',v: fmtNum(p.impressions) },
                      { l:'Posts',      v: p.posts_count || '—' },
                    ].map(({ l, v }) => (
                      <div key={l}>
                        <p className="text-xs font-bold text-white/70">{v}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{l}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && series.length === 0 && byPlat.length === 0 && (
          <div className="text-center py-20">
            <BarChart2 className="w-12 h-12 mx-auto text-white/10 mb-3"/>
            <p className="text-white/35 font-semibold">No analytics data yet</p>
            <p className="text-white/20 text-sm mt-1">Upload reports or connect platforms to start seeing trend data.</p>
          </div>
        )}
      </div>
    </div>
  );
}

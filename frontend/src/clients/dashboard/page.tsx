'use client';
import { useEffect, useState } from 'react';
import {
  Zap, TrendingUp, TrendingDown, Target, BarChart2, ArrowRight,
  FileText, Star, MessageSquare, Award, ChevronRight, Activity, Sparkles
} from 'lucide-react';
import { Card, Badge, SkeletonPage, ScoreGauge, TOKENS } from '@/components';
import { BRAND } from '@/lib/brand';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem(BRAND.storage.clientToken)}` });

const fmtNum = (n: any) => {
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  if (num >= 1_000_000) return `${(num/1_000_000).toFixed(1)}M`;
  if (num >= 1_000)     return `${(num/1_000).toFixed(1)}K`;
  return Math.round(num).toLocaleString();
};

const PLATFORM_ICONS: Record<string, string> = {
  instagram:'📸', facebook:'👥', tiktok:'🎵', twitter:'🐦',
  linkedin:'💼', youtube:'▶️', google_analytics:'📊', website:'🌐',
};

export default function ClientDashboardPage() {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [client,  setClient]  = useState<any>(null);

  useEffect(() => {
    const info = localStorage.getItem(BRAND.storage.clientInfo);
    if (info) setClient(JSON.parse(info));

    Promise.all([
      axios.get(`${API}/client/dashboard`,  { headers: hdrs() }).catch(() => ({ data: {} })),
      axios.get(`${API}/client/narrative`,  { headers: hdrs() }).catch(() => ({ data: {} })),
      axios.get(`${API}/client/velocity`,   { headers: hdrs() }).catch(() => ({ data: {} })),
    ]).then(([d, n, v]) => {
      setData({ ...d.data, narrative: n.data.narrative, velocity: v.data });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonPage />;

  const metrics    = data?.metrics      || {};
  const platforms  = data?.platforms    || [];
  const goals      = data?.goals        || [];
  const reports    = data?.recent_reports || [];
  const narrative  = data?.narrative    || '';
  const velocity   = data?.velocity     || {};
  const score      = data?.clarity_score || 0;
  const firstName  = client?.name?.split(' ')[0] || 'there';

  const now    = new Date();
  const hour   = now.getHours();
  const greet  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 lg:p-8 max-w-6xl">

      {/* ── Greeting ────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full" style={{ background: '#6d28d9' }} />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#a78bfa' }}>
              {client?.brand_name || 'Brand'} Intelligence
            </p>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            {greet}, {firstName}.
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {now.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}
          </p>
        </div>
        <div className="flex gap-3">
          <a href="/client/ask"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
            style={{ background:'linear-gradient(135deg,#6d28d9,#9333ea)', boxShadow:'0 4px 16px rgba(109,40,217,0.3)' }}>
            <Zap className="w-4 h-4"/> Ask {BRAND.aria}
          </a>
        </div>
      </div>

      {/* ── Hero: ClarityScore + top metrics ────────────────── */}
      <div className="grid lg:grid-cols-4 gap-5 mb-7">
        {/* ClarityScore gauge */}
        <Card className="flex flex-col items-center justify-center py-6 gap-2 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">{BRAND.features.clarityScore}</p>
          <ScoreGauge score={score} max={1000} size={130} />
          <a href="/client/platforms" className="text-xs text-purple-400 hover:underline mt-1">View breakdown →</a>
        </Card>

        {/* Metrics grid */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label:'Total followers',    value: fmtNum(metrics.total_followers),       change: metrics.followers_change,   colour:'#6d28d9' },
            { label:'Avg engagement',     value: metrics.avg_engagement_rate ? `${parseFloat(metrics.avg_engagement_rate).toFixed(2)}%` : '—', change: metrics.engagement_change, colour:'#059669' },
            { label:'Impressions / mo',   value: fmtNum(metrics.total_impressions),     change: metrics.impressions_change, colour:'#3b82f6' },
            { label:'Posts this month',   value: metrics.posts_this_month || '—',       colour:'#d97706' },
            { label:'Active platforms',   value: platforms.length || '—',               colour:'#a78bfa' },
            { label:'Reports this month', value: reports.length,                         colour:'#059669' },
          ].map(({ label, value, change, colour }: any) => (
            <div key={label} className="rounded-2xl border p-4" style={{ background:'rgba(255,255,255,0.03)', borderColor:'rgba(255,255,255,0.08)' }}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color:'rgba(255,255,255,0.3)' }}>{label}</p>
              <p className="text-xl font-black text-white">{value}</p>
              {change !== undefined && (
                <p className={clsx('text-[10px] font-semibold flex items-center gap-1 mt-1', parseFloat(change) > 0 ? 'text-emerald-400' : parseFloat(change) < 0 ? 'text-red-400' : 'text-white/25')}>
                  {parseFloat(change) > 0 ? '↑' : '↓'} {Math.abs(parseFloat(change)).toFixed(1)}% vs last period
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main grid ───────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-5">

          {/* NarrativeAI weekly story */}
          {narrative && (
            <div className="rounded-2xl border p-5" style={{ background:'rgba(109,40,217,0.07)', borderColor:'rgba(109,40,217,0.25)' }}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
                  <Zap className="w-4 h-4 text-white"/>
                </div>
                <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">{BRAND.aria} · Weekly Narrative</p>
              </div>
              <p className="text-sm leading-relaxed text-white/70">{narrative}</p>
              <a href="/client/ask" className="text-xs text-purple-400 hover:underline mt-3 inline-block">
                Ask {BRAND.aria} a follow-up question →
              </a>
            </div>
          )}

          {/* Platform performance */}
          {platforms.length > 0 && (
            <Card padding="none">
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: TOKENS.border }}>
                <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider">Platform performance</h2>
                <a href="/client/platforms" className="text-xs text-purple-400 hover:underline flex items-center gap-1">
                  Deep dive <ArrowRight className="w-3 h-3"/>
                </a>
              </div>
              <div className="divide-y" style={{ borderColor: TOKENS.border }}>
                {platforms.slice(0, 5).map((p: any) => {
                  const change = parseFloat(p.followers_change || 0);
                  return (
                    <a key={p.platform} href={`/client/platforms/${p.platform}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/3 transition-colors group">
                      <span className="text-xl w-8 text-center flex-shrink-0">{PLATFORM_ICONS[p.platform] || '🔗'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/75 capitalize">{p.platform.replace('_',' ')}</p>
                        <p className="text-xs text-white/30">{fmtNum(p.followers)} followers</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs font-bold text-white/60">{p.engagement_rate ? `${parseFloat(p.engagement_rate).toFixed(1)}%` : '—'}</p>
                          <p className="text-[10px] text-white/25">Engagement</p>
                        </div>
                        {change !== 0 && (
                          <span className={clsx('text-xs font-bold', change > 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {change > 0 ? '+' : ''}{change.toFixed(1)}%
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-purple-400 transition-colors"/>
                      </div>
                    </a>
                  );
                })}
              </div>
            </Card>
          )}

          {/* VelocityTracker goal progress */}
          {goals.length > 0 && (
            <Card padding="none">
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: TOKENS.border }}>
                <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider">{BRAND.features.velocityTracker}</h2>
                <a href="/client/goals" className="text-xs text-purple-400 hover:underline">Full view →</a>
              </div>
              <div className="px-5 py-4 space-y-4">
                {goals.filter((g: any) => g.is_active).slice(0, 3).map((g: any) => {
                  const pct = Math.min(100, Math.round((parseFloat(g.current_value || 0) / parseFloat(g.target_value || 1)) * 100));
                  const col = pct >= 80 ? '#059669' : pct >= 50 ? '#6d28d9' : '#d97706';
                  return (
                    <div key={g.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-white/70">{g.title}</p>
                        <span className="text-xs font-black" style={{ color: col }}>{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background:'rgba(255,255,255,0.07)' }}>
                        <div className="h-2 rounded-full transition-all duration-700"
                          style={{ width:`${pct}%`, background:`linear-gradient(90deg,${col},${col}90)` }}/>
                      </div>
                      <div className="flex justify-between mt-1">
                        <p className="text-[10px] text-white/25">{fmtNum(parseFloat(g.current_value||0))} of {fmtNum(parseFloat(g.target_value))} {g.target_unit}</p>
                        {g.deadline && <p className="text-[10px] text-white/25">Due {new Date(g.deadline).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right sidebar ─────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Quick nav tiles */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { href:'/client/platforms', icon:'📊', label:'Platforms',    colour:'#6d28d9' },
              { href:'/client/goals',     icon:'🎯', label:'Goals',        colour:'#059669' },
              { href:'/client/reports',   icon:'📄', label:'Reports',      colour:'#d97706' },
              { href:'/client/team',      icon:'👥', label:'My team',      colour:'#3b82f6' },
              { href:'/client/competitors',icon:'🔍','label':'Competitors', colour:'#a78bfa' },
              { href:'/client/value',     icon:'🏆', label:'Proof of value',colour:'#f59e0b' },
            ].map(({ href, icon, label, colour }) => (
              <a key={href} href={href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all hover:-translate-y-0.5 hover:shadow-lg group"
                style={{ background:'rgba(255,255,255,0.03)', borderColor:'rgba(255,255,255,0.08)' }}>
                <span className="text-2xl">{icon}</span>
                <p className="text-xs font-semibold text-white/55 group-hover:text-white/75 transition-colors">{label}</p>
              </a>
            ))}
          </div>

          {/* Recent reports */}
          {reports.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-white/35 uppercase tracking-wider">Latest reports</h3>
                <a href="/client/reports" className="text-xs text-purple-400 hover:underline">All →</a>
              </div>
              <div className="space-y-3">
                {reports.slice(0, 3).map((r: any) => (
                  <a key={r.id} href={`/client/reports/${r.id}`}
                    className="flex items-start gap-3 group hover:bg-white/3 rounded-lg p-1 -mx-1 transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background:'rgba(109,40,217,0.15)' }}>
                      <FileText className="w-4 h-4 text-purple-400"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white/70 capitalize truncate">{r.report_type?.replace('_',' ')} report</p>
                      <p className="text-[10px] text-white/30">{new Date(r.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-purple-400 flex-shrink-0 mt-0.5 transition-colors"/>
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* Rate your team prompt */}
          <div className="rounded-2xl border p-4 text-center" style={{ background:'rgba(245,158,11,0.06)', borderColor:'rgba(245,158,11,0.2)' }}>
            <Star className="w-6 h-6 text-amber-400 mx-auto mb-2"/>
            <p className="text-sm font-bold text-white/70 mb-1">Rate your team</p>
            <p className="text-xs text-white/35 mb-3 leading-relaxed">Let us know how the Cerebre team is doing this month.</p>
            <a href="/client/team"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:brightness-110"
              style={{ background:'rgba(245,158,11,0.25)', border:'1px solid rgba(245,158,11,0.35)', color:'#fcd34d' }}>
              Give feedback
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

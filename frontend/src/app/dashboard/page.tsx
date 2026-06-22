'use client';
import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, Building2, Users, Zap, Star,
  ArrowRight, CheckSquare, AlertTriangle, BarChart2, Flame,
  ChevronRight, Plus, Activity, Sparkles
} from 'lucide-react';
import { Card, StatCard, Badge, Button, SkeletonPage, Avatar, TOKENS } from '@/components';
import { useAuthStore } from '@/lib/store';
import { BRAND } from '@/lib/brand';
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
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000)     return `${(num / 1_000).toFixed(1)}K`;
  return Math.round(num).toLocaleString();
};

const healthTier = (s?: number) =>
  !s || s < 40 ? 'critical' : s < 60 ? 'developing' : s < 80 ? 'healthy' : 'excellent';

const HEALTH_COLOUR: Record<string, string> = {
  critical:'#ef4444', developing:'#d97706', healthy:'#6d28d9', excellent:'#059669',
};

export default function AgencyDashboardPage() {
  const { user } = useAuthStore();
  const [data,     setData]     = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const firstName = (user?.name || 'there').split(' ')[0];

  useEffect(() => {
    axios.get(`${API}/agency/leadership/overview`, { headers: hdrs() })
      .then(r => setData(r.data))
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonPage />;

  const brands       = data?.brands        || [];
  const staff        = data?.staff         || [];
  const recentTasks  = data?.recent_tasks  || [];
  const alerts       = data?.alerts        || [];
  const weeklyStats  = data?.weekly_stats  || {};

  const atRisk   = brands.filter((b: any) => { const t = healthTier(b.health_score); return t === 'critical' || t === 'developing'; });
  const healthy  = brands.filter((b: any) => { const t = healthTier(b.health_score); return t === 'excellent' || t === 'healthy'; });
  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 lg:p-8 max-w-7xl">

      {/* ── Greeting ────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-5 rounded-full" style={{ background: TOKENS.brand }} />
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: TOKENS.accent }}>
            {BRAND.name} Intelligence
          </p>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          {greeting}, {firstName}.
        </h1>
        <p className="text-white/40 text-sm mt-1">
          {now.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          {weeklyStats.tasks_this_week > 0 && ` · ${weeklyStats.tasks_this_week} tasks logged this week`}
        </p>
      </div>

      {/* ── Alerts banner ───────────────────────────────────── */}
      {atRisk.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border mb-7"
          style={{ background:'rgba(239,68,68,0.07)', borderColor:'rgba(239,68,68,0.25)' }}>
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-300">
              {atRisk.length} brand{atRisk.length > 1 ? 's' : ''} need{atRisk.length === 1 ? 's' : ''} immediate attention
            </p>
            <p className="text-xs text-red-400/70 mt-0.5">
              {atRisk.map((b: any) => b.name).join(', ')} — health scores are below target
            </p>
          </div>
          <a href="/clients?filter=at_risk" className="text-xs font-bold text-red-400 hover:underline flex-shrink-0">
            View all →
          </a>
        </div>
      )}

      {/* ── Top stats ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Client brands"   value={brands.length} icon={<Building2 className="w-5 h-5"/>} />
        <StatCard label="Healthy brands"  value={healthy.length} colour="#059669" icon={<TrendingUp className="w-5 h-5"/>} />
        <StatCard label="Brands at risk"  value={atRisk.length}  colour={atRisk.length > 0 ? '#ef4444' : '#6d28d9'} icon={<TrendingDown className="w-5 h-5"/>} />
        <StatCard label="Team members"    value={staff.length}   icon={<Users className="w-5 h-5"/>} />
      </div>

      {/* ── Main grid ───────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left: Brand portfolio ───────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Brand health grid */}
          <Card padding="none">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: TOKENS.border }}>
              <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider">Brand portfolio</h2>
              <a href="/clients" className="text-xs text-purple-400 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3"/>
              </a>
            </div>
            <div className="divide-y" style={{ borderColor: TOKENS.border }}>
              {brands.slice(0, 6).map((b: any) => {
                const tier   = healthTier(b.health_score);
                const colour = HEALTH_COLOUR[tier];
                return (
                  <a key={b.id} href={`/clients/${b.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/3 transition-colors group">
                    {/* Health indicator */}
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colour }} />

                    {/* Brand info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white/80 truncate">{b.name}</p>
                      <p className="text-xs capitalize text-white/30">{b.industry || 'Brand'}</p>
                    </div>

                    {/* Metrics */}
                    <div className="hidden sm:flex items-center gap-6 text-right">
                      <div>
                        <p className="text-xs font-bold text-white/60">{b.health_score ? `${Math.round(b.health_score)}/100` : '—'}</p>
                        <p className="text-[10px] text-white/25">Health</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white/60">{b.tasks_this_month || 0}</p>
                        <p className="text-[10px] text-white/25">Tasks/mo</p>
                      </div>
                      {b.avg_nps && (
                        <div>
                          <p className="text-xs font-bold text-white/60">{parseFloat(b.avg_nps).toFixed(1)}/5</p>
                          <p className="text-[10px] text-white/25">NPS</p>
                        </div>
                      )}
                    </div>

                    <Badge variant={tier === 'excellent' ? 'success' : tier === 'healthy' ? 'purple' : tier === 'developing' ? 'warning' : 'danger'}>
                      {tier === 'excellent' ? 'Excellent' : tier === 'healthy' ? 'Healthy' : tier === 'developing' ? 'Developing' : 'At risk'}
                    </Badge>

                    <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-purple-400 transition-colors" />
                  </a>
                );
              })}
              {brands.length === 0 && (
                <div className="px-5 py-10 text-center">
                  <Building2 className="w-8 h-8 mx-auto text-white/10 mb-2"/>
                  <p className="text-sm text-white/30">No brands onboarded yet</p>
                  <a href="/clients/new" className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-purple-400 hover:underline">
                    <Plus className="w-3.5 h-3.5"/>Onboard first client
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Recent task activity */}
          <Card padding="none">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: TOKENS.border }}>
              <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider">Recent team activity</h2>
              <Activity className="w-4 h-4 text-white/20" />
            </div>
            {recentTasks.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CheckSquare className="w-8 h-8 mx-auto text-white/10 mb-2"/>
                <p className="text-sm text-white/30">No tasks logged this week</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: TOKENS.border }}>
                {recentTasks.slice(0, 8).map((t: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
                      {(t.staff_name || 'S').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white/70 leading-snug">
                        <span className="text-white/50">{t.staff_name}</span>
                        {' logged '}
                        <span className="text-white/70">{t.title}</span>
                      </p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {t.brand_name} · {new Date(t.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                      </p>
                    </div>
                    {t.correlation_strength === 'strong' && (
                      <Badge variant="success" className="text-[9px] flex-shrink-0">Impact</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right sidebar ─────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Quick actions */}
          <Card>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Quick actions</h3>
            <div className="space-y-2">
              {[
                { label:'Upload report',    href:'/upload',        icon:'📤', colour:'#6d28d9' },
                { label:'Onboard client',   href:'/clients/new',   icon:'🏢', colour:'#059669' },
                { label:'Log a task',       href:'/clients',       icon:'✅', colour:'#d97706' },
                { label:'Ask ARIA',         href:'/ask',           icon:'⚡', colour:'#a78bfa' },
                { label:'Connect platform', href:'/connect',       icon:'🔗', colour:'#3b82f6' },
              ].map(({ label, href, icon, colour }) => (
                <a key={href} href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm font-medium text-white/60 group-hover:text-white/80 transition-colors flex-1">{label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-purple-400 transition-colors" />
                </a>
              ))}
            </div>
          </Card>

          {/* Top staff by rating */}
          {staff.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Top performers</h3>
                <a href="/agency/staff" className="text-xs text-purple-400 hover:underline">View all →</a>
              </div>
              <div className="space-y-3">
                {staff
                  .filter((s: any) => s.avg_rating > 0)
                  .sort((a: any, b: any) => parseFloat(b.avg_rating) - parseFloat(a.avg_rating))
                  .slice(0, 4)
                  .map((s: any, i: number) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ background: ['linear-gradient(135deg,#f59e0b,#d97706)','linear-gradient(135deg,#6b7280,#9ca3af)','linear-gradient(135deg,#92400e,#b45309)','linear-gradient(135deg,#6d28d9,#a78bfa)'][i] || 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white/75 truncate">{s.full_name}</p>
                        <p className="text-[10px] text-white/30 capitalize">{s.department?.replace('_',' ')}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold text-amber-400">{parseFloat(s.avg_rating).toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* Recent alerts */}
          {alerts.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Recent alerts</h3>
                <a href="/notifications" className="text-xs text-purple-400 hover:underline">All →</a>
              </div>
              <div className="space-y-2">
                {alerts.slice(0, 4).map((a: any, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 py-2 border-b last:border-0" style={{ borderColor: TOKENS.border }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                      style={{ background: a.severity === 'high' ? '#ef4444' : a.severity === 'medium' ? '#d97706' : '#6d28d9' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white/65 leading-snug">{a.title}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{a.brand_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ARIA tip of the day */}
          <div className="rounded-2xl border p-4" style={{ background:'rgba(109,40,217,0.07)', borderColor:'rgba(109,40,217,0.2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background:'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
                <Zap className="w-3.5 h-3.5 text-white"/>
              </div>
              <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">{BRAND.aria} Intelligence</p>
            </div>
            <p className="text-xs text-white/55 leading-relaxed">
              {weeklyStats?.aria_insight || `${healthy.length} of your ${brands.length} brands are on track. Log this week's tasks before Friday to keep the Proof of Value reports accurate.`}
            </p>
            <a href="/ask" className="text-xs text-purple-400 hover:underline mt-2 inline-block">Ask ARIA anything →</a>
          </div>
        </div>
      </div>
    </div>
  );
}

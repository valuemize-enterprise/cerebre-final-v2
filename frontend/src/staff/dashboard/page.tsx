'use client';
import { useEffect, useState } from 'react';
import { Target, CheckSquare, Star, TrendingUp, Plus, ArrowRight, Loader2, Award, Zap, BarChart2, Building2 } from 'lucide-react';
import { Card, StatCard, Badge, Button, EmptyState, PageHeader, SkeletonPage, Avatar, TOKENS } from '@/components';
import { useAuthStore } from '@/lib/store';
import { BRAND } from '@/lib/brand';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const TASK_ICONS: Record<string, string> = {
  content_published: '📱', campaign_launched: '🚀', report_submitted: '📊',
  client_meeting: '🤝', analytics_review: '🔍', strategy_submitted: '📋',
  community_management: '💬', ad_setup: '💰', content_created: '✍️',
};

export default function StaffDashboardPage() {
  const { user }  = useAuthStore();
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/agency/staff/me/dashboard`, { headers: hdrs() }).catch(() => ({ data: {} })),
    ]).then(([r]) => {
      setData(r.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonPage />;

  const brands     = data?.brands || [];
  const recentTasks = data?.recentTasks || [];
  const ratings    = data?.recentRatings || [];
  const stats      = data?.stats || {};
  const firstName  = (user?.name || 'there').split(' ')[0];
  const now        = new Date();
  const hour       = now.getHours();
  const greeting   = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Greeting */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-purple-400" />
          <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Staff Portal</p>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Week {getWeekNumber(now)} · {now.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard label="Brands managed" value={stats.brands_managed || brands.length} icon={<Building2 className="w-5 h-5"/>} />
        <StatCard label="Tasks this week" value={stats.tasks_this_week || 0} icon={<CheckSquare className="w-5 h-5"/>} />
        <StatCard label="Avg client rating" value={stats.avg_rating ? `${parseFloat(stats.avg_rating).toFixed(1)}/5` : '—'} colour="#f59e0b" icon={<Star className="w-5 h-5"/>} />
        <StatCard label="Total deliverables" value={stats.tasks_completed || 0} icon={<TrendingUp className="w-5 h-5"/>} />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Assigned brands */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider">My brands</h2>
            <a href="/staff/brands" className="text-xs text-purple-400 hover:underline">View all →</a>
          </div>
          {brands.length === 0
            ? <EmptyState icon={<Building2 className="w-7 h-7"/>} title="No brands assigned yet" description="Your account manager will assign client brands to you." />
            : <div className="space-y-3">
                {brands.slice(0, 4).map((b: any) => (
                  <a key={b.id} href={`/staff/brands/${b.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl border transition-all group hover:border-purple-500/30"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'rgba(109,40,217,0.15)' }}>
                      🏢
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white/90">{b.name}</p>
                      <p className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{b.role_on_brand || 'Team member'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.is_lead && <Badge variant="amber">Lead</Badge>}
                      <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-purple-400 transition-colors" />
                    </div>
                  </a>
                ))}
              </div>
          }

          {/* Quick log task */}
          <div className="mt-4 p-4 rounded-xl border border-dashed flex items-center gap-4"
            style={{ borderColor: 'rgba(109,40,217,0.25)', background: 'rgba(109,40,217,0.05)', cursor: 'pointer' }}
            onClick={() => window.location.href = '/staff/brands'}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(109,40,217,0.15)' }}>
              <Plus className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/80">Log today's work</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Record what you did — it feeds directly into the client's Proof of Value report</p>
            </div>
          </div>
        </div>

        {/* Recent tasks + ratings */}
        <div className="lg:col-span-2 space-y-5">
          {/* Recent tasks */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Recent work</h3>
              <CheckSquare className="w-4 h-4 text-white/20" />
            </div>
            {recentTasks.length === 0
              ? <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.25)' }}>No tasks logged yet</p>
              : <div className="space-y-2">
                  {recentTasks.slice(0, 5).map((t: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <span className="text-lg flex-shrink-0">{TASK_ICONS[t.task_type] || '✅'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white/70 truncate">{t.title}</p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.brand_name} · {new Date(t.completed_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</p>
                      </div>
                      {t.correlation_strength === 'strong' && <Badge variant="success" className="text-[9px]">Impact</Badge>}
                    </div>
                  ))}
                </div>
            }
          </Card>

          {/* Recent ratings */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Client feedback</h3>
              <a href="/staff/ratings" className="text-xs text-purple-400 hover:underline">All →</a>
            </div>
            {ratings.length === 0
              ? <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.25)' }}>No ratings yet</p>
              : <div className="space-y-3">
                  {ratings.slice(0, 3).map((r: any, i: number) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-white/60">{r.brand_name || 'Brand'}</p>
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(s => <Star key={s} className={clsx('w-3 h-3', s <= r.overall_rating ? 'fill-amber-400 text-amber-400' : 'text-white/15')} />)}
                        </div>
                      </div>
                      {r.written_feedback && <p className="text-xs italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>"{r.written_feedback}"</p>}
                    </div>
                  ))}
                </div>
            }
          </Card>
        </div>
      </div>
    </div>
  );
}

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day  = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1) / 7);
}

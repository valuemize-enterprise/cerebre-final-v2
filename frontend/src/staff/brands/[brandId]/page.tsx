'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckSquare, Zap, BarChart2, ArrowLeft, Plus, TrendingUp, Loader2, Clock } from 'lucide-react';
import { Card, StatCard, Badge, Button, TOKENS } from '@/components';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const TASK_ICONS: Record<string, string> = {
  content_published:'📱', campaign_launched:'🚀', report_submitted:'📊',
  client_meeting:'🤝', analytics_review:'🔍', strategy_submitted:'📋',
  community_management:'💬', ad_setup:'💰', content_created:'✍️',
};

export default function StaffBrandPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const [brand,   setBrand]   = useState<any>(null);
  const [tasks,   setTasks]   = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/admin/brands/${brandId}`, { headers: hdrs() }).catch(() => ({ data: {} })),
      axios.get(`${API}/agency/brands/${brandId}/tasks?limit=10&mine=true`, { headers: hdrs() }).catch(() => ({ data: { tasks: [] } })),
      axios.get(`${API}/metrics/summary?brand_id=${brandId}`, { headers: hdrs() }).catch(() => ({ data: {} })),
    ]).then(([b, t, m]) => {
      setBrand(b.data.brand || b.data);
      setTasks(t.data.tasks || []);
      setMetrics(m.data);
    }).finally(() => setLoading(false));
  }, [brandId]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-7">
        <a href="/staff/brands" className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> My brands
        </a>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-white">{brand?.name || 'Brand'}</h1>
            <p className="text-white/40 text-sm capitalize mt-1">{brand?.industry} · Your assigned brand</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" icon={<Zap className="w-4 h-4" />}
              onClick={() => window.location.href = `/staff/brands/${brandId}/strategy`}>
              Submit strategy
            </Button>
            <Button size="sm" icon={<Plus className="w-4 h-4" />}
              onClick={() => window.location.href = `/staff/brands/${brandId}/tasks`}>
              Log task
            </Button>
          </div>
        </div>
      </div>

      {/* Quick metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
        <StatCard label="My tasks (this month)" value={tasks.filter(t => new Date(t.completed_date || t.created_at).getMonth() === new Date().getMonth()).length} icon={<CheckSquare className="w-5 h-5"/>} />
        <StatCard label="Followers total" value={metrics?.total_followers ? fmtNum(metrics.total_followers) : '—'} icon={<TrendingUp className="w-5 h-5"/>} />
        <StatCard label="Engagement rate" value={metrics?.avg_engagement_rate ? `${parseFloat(metrics.avg_engagement_rate).toFixed(1)}%` : '—'} icon={<BarChart2 className="w-5 h-5"/>} colour="#059669" />
        <StatCard label="Active platforms" value={(brand?.active_platforms || []).length} icon={<Zap className="w-5 h-5"/>} colour="#d97706" />
      </div>

      {/* Quick action cards */}
      <div className="grid sm:grid-cols-2 gap-4 mb-7">
        <a href={`/staff/brands/${brandId}/tasks`}
          className="group flex items-center gap-4 p-5 rounded-2xl border border-dashed transition-all hover:border-purple-500/50 hover:bg-purple-900/10"
          style={{ borderColor: 'rgba(109,40,217,0.25)', background: 'rgba(109,40,217,0.05)' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(109,40,217,0.2)' }}>
            <CheckSquare className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-black text-white/85">Log a task</p>
            <p className="text-xs text-white/35 mt-0.5">Record what you completed for this brand today</p>
          </div>
        </a>
        <a href={`/staff/brands/${brandId}/strategy`}
          className="group flex items-center gap-4 p-5 rounded-2xl border border-dashed transition-all hover:border-emerald-500/50 hover:bg-emerald-900/10"
          style={{ borderColor: 'rgba(5,150,105,0.25)', background: 'rgba(5,150,105,0.05)' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(5,150,105,0.2)' }}>
            <Zap className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-black text-white/85">Submit strategy</p>
            <p className="text-xs text-white/35 mt-0.5">Write up a strategy — ARIA validates it before client sees it</p>
          </div>
        </a>
      </div>

      {/* My recent tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-white/50 uppercase tracking-wider">My recent tasks on this brand</p>
          {tasks.length > 0 && (
            <a href={`/staff/brands/${brandId}/tasks`} className="text-xs text-purple-400 hover:underline">+ Log new task</a>
          )}
        </div>
        {tasks.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <Clock className="w-8 h-8 mx-auto text-white/15 mb-2" />
            <p className="text-white/30 text-sm font-semibold">No tasks logged yet for this brand</p>
            <p className="text-white/15 text-xs mt-1">Log your first task to start building the proof of work record</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t: any) => (
              <div key={t.id} className="flex items-start gap-4 p-4 rounded-xl border"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: 'rgba(109,40,217,0.12)' }}>
                  {TASK_ICONS[t.task_type] || '✅'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/80">{t.title}</p>
                  <p className="text-xs text-white/35 mt-0.5">
                    {new Date(t.completed_date || t.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                    {t.platform && ` · ${t.platform}`}
                  </p>
                </div>
                {t.correlation_strength === 'strong' && <Badge variant="success" dot>Impact</Badge>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function fmtNum(n: number) {
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
  if (n >= 1000)    return `${(n/1000).toFixed(1)}K`;
  return n.toLocaleString();
}

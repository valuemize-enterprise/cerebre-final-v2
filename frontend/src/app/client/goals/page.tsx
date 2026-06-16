'use client';
import { useEffect, useState } from 'react';
import {
  Target, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, Clock, Loader2, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import axios from 'axios';
import clsx from 'clsx';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('cerebre_client_token')}` });

const STATUS_CONFIG: Record<string, { colour: string; bg: string; label: string; icon: any }> = {
  achieved:    { colour: '#059669', bg: 'rgba(5,150,105,0.12)',   label: '✓ Achieved',     icon: CheckCircle2 },
  on_track:    { colour: '#6d28d9', bg: 'rgba(109,40,217,0.12)', label: '● On track',      icon: TrendingUp   },
  at_risk:     { colour: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: '⚠ At risk',       icon: AlertTriangle },
  behind:      { colour: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: '✗ Behind',        icon: TrendingDown  },
  in_progress: { colour: '#6d28d9', bg: 'rgba(109,40,217,0.12)', label: '● In progress',  icon: TrendingUp   },
};

const VELOCITY_CONFIG: Record<string, { colour: string; label: string; arrow: string }> = {
  ACCELERATING:  { colour: '#059669', label: 'Accelerating',  arrow: '↑' },
  PROGRESSING:   { colour: '#6d28d9', label: 'Progressing',   arrow: '→' },
  STEADY:        { colour: '#9ca3af', label: 'Steady',         arrow: '→' },
  DECELERATING:  { colour: '#ef4444', label: 'Decelerating',  arrow: '↓' },
  UNKNOWN:       { colour: '#9ca3af', label: '—',              arrow: '—' },
};

const GoalCard = ({ goal }: { goal: any }) => {
  const pct       = Math.min(100, Math.round(parseFloat(goal.progress_pct || 0)));
  const status    = STATUS_CONFIG[goal.status || 'in_progress'] || STATUS_CONFIG.in_progress;
  const velocity  = VELOCITY_CONFIG[goal.velocityLabel || 'UNKNOWN'];
  const history   = goal.history || [];
  const chartData = history.map((h: any, i: number) => ({
    week: `W${i + 1}`, pct: Math.round(parseFloat(h.pct || 0)),
  }));

  const daysLeft = goal.daysToDeadline;

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>

      {/* Header */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                style={{ background: status.colour }}>
                {goal.priority_rank}
              </span>
              <p className="text-sm font-bold text-white/90 truncate">{goal.title}</p>
            </div>
            <p className="text-xs text-white/40 capitalize">
              {goal.goal_category?.replace('_', ' ')} · {goal.target_metric?.replace('_', ' ')}
            </p>
          </div>

          {/* Status badge */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: status.bg, color: status.colour, border: `1px solid ${status.colour}30` }}>
              {status.label}
            </span>
            {/* Velocity pill */}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ background: `${velocity.colour}12`, color: velocity.colour, border: `1px solid ${velocity.colour}20` }}>
              {velocity.arrow} {velocity.label}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40">Progress</span>
            <span className="text-sm font-black" style={{ color: status.colour }}>{pct}%</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${pct}%`, background: `linear-gradient(90deg,${status.colour},${status.colour}88)` }} />
          </div>
        </div>

        {/* Target + deadline */}
        <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
          {goal.target_value && (
            <span>Target: <strong className="text-white/60">{parseFloat(goal.target_value).toLocaleString()} {goal.target_unit || ''}</strong></span>
          )}
          {goal.deadline && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {daysLeft !== null && daysLeft > 0
                ? `${daysLeft} days left`
                : daysLeft === 0 ? 'Due today'
                : 'Overdue'}
            </span>
          )}
        </div>
      </div>

      {/* Velocity chart */}
      {chartData.length > 1 && (
        <div className="px-4 pb-4">
          <p className="text-[10px] font-semibold text-white/20 uppercase tracking-wider mb-2">VelocityTracker™ — progress over time</p>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`grad-${goal.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={status.colour} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={status.colour} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#1a1040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                formatter={(v: any) => [`${v}%`, 'Progress']}
                labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
              />
              <Area type="monotone" dataKey="pct" stroke={status.colour} strokeWidth={2}
                fill={`url(#grad-${goal.id})`} dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Projection notice */}
      {goal.projectionStatus && goal.projectionStatus !== 'UNKNOWN' && (
        <div className="mx-4 mb-4 px-3 py-2 rounded-lg text-xs"
          style={{
            background: goal.projectionStatus === 'ON_TRACK' ? 'rgba(5,150,105,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${goal.projectionStatus === 'ON_TRACK' ? 'rgba(5,150,105,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: goal.projectionStatus === 'ON_TRACK' ? '#6ee7b7' : '#fca5a5',
          }}>
          {goal.projectionStatus === 'ON_TRACK'
            ? '✓ At current velocity, this goal will be achieved by the deadline.'
            : goal.projectionStatus === 'AT_RISK'
            ? '⚠ Slightly behind pace — needs attention to hit the deadline.'
            : '✗ At current pace, this goal will be missed. Ask ARIA what to do.'}
        </div>
      )}
    </div>
  );
};

export default function GoalsPage() {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    axios.get(`${API}/client/velocity`, { headers: hdrs() })
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to load goals'))
      .finally(() => setLoading(false));
  }, []);

  const goals   = data?.goals || [];
  const onTrack = goals.filter((g: any) => g.status === 'on_track' || g.status === 'achieved').length;
  const atRisk  = goals.filter((g: any) => g.status === 'at_risk' || g.status === 'behind').length;

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-purple-400" />
            <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">VelocityTracker™</p>
          </div>
          <h1 className="text-2xl font-black text-white">Priority Goals</h1>
          <p className="text-white/40 text-sm mt-1">
            Track progress and acceleration toward your strategic targets
          </p>
        </div>

        {/* Summary pills */}
        {!loading && goals.length > 0 && (
          <div className="flex gap-3">
            <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.25)' }}>
              <p className="text-2xl font-black text-green-400">{onTrack}</p>
              <p className="text-[10px] text-green-400/70 font-semibold uppercase tracking-wide">On track</p>
            </div>
            <div className="px-4 py-2 rounded-xl text-center" style={{ background: atRisk > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${atRisk > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'}` }}>
              <p className={clsx('text-2xl font-black', atRisk > 0 ? 'text-red-400' : 'text-white/30')}>{atRisk}</p>
              <p className={clsx('text-[10px] font-semibold uppercase tracking-wide', atRisk > 0 ? 'text-red-400/70' : 'text-white/20')}>At risk</p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-white/30">{error}</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-20">
          <Target className="w-12 h-12 mx-auto text-white/10 mb-4" />
          <p className="text-white/40 font-semibold">No goals configured yet</p>
          <p className="text-white/20 text-sm mt-2">Your Cerebre account manager will set up your priority goals</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {goals.map((goal: any) => <GoalCard key={goal.id} goal={goal} />)}
        </div>
      )}

      {/* Ask ARIA CTA */}
      {!loading && atRisk > 0 && (
        <div className="mt-6 p-5 rounded-2xl flex items-center gap-4"
          style={{ background: 'rgba(109,40,217,0.15)', border: '1px solid rgba(109,40,217,0.3)' }}>
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-white/80 text-sm font-semibold">
              {atRisk} goal{atRisk > 1 ? 's are' : ' is'} at risk
            </p>
            <p className="text-white/40 text-xs mt-0.5">Ask ARIA what specific actions can get them back on track</p>
          </div>
          <a href="/client/ask"
            className="px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
            Ask ARIA →
          </a>
        </div>
      )}
    </div>
  );
}

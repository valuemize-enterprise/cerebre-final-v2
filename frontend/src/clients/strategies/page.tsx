'use client';
import { useEffect, useState } from 'react';
import { Zap, ChevronDown, ChevronUp, Calendar, Target, CheckCircle2, Loader2, BarChart2 } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem(BRAND.storage.clientToken)}` });

const TYPE_ICONS: Record<string, string> = {
  content: '📱', growth: '📈', campaign: '🚀', paid: '💰',
  brand_voice: '🎯', seo: '🔎', community: '💬', seasonal: '📅',
};

const SCORE_COLOUR = (s: number) =>
  s >= 85 ? '#059669' : s >= 70 ? '#6d28d9' : s >= 55 ? '#d97706' : '#ef4444';

export default function ClientStrategiesPage() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [tab,        setTab]        = useState<'active'|'past'>('active');

  useEffect(() => {
    axios.get(`${API}/client/strategies`, { headers: hdrs() })
      .then(r => setStrategies(r.data.strategies || []))
      .catch(() => setStrategies([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = strategies.filter(s => tab === 'active' ? s.is_active : !s.is_active);

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 rounded-full" style={{ background: '#059669' }} />
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Strategic Intelligence</p>
        </div>
        <h1 className="text-2xl font-black text-white">Your Strategies</h1>
        <p className="text-white/40 text-sm mt-1">
          The plans Cerebre is executing for your brand — each one validated by {BRAND.aria} before activation.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit mb-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {(['active', 'past'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all', tab === t ? 'text-white' : 'text-white/35 hover:text-white/55')}
            style={tab === t ? { background: 'rgba(109,40,217,0.35)', border: '1px solid rgba(109,40,217,0.4)' } : {}}>
            {t === 'active' ? 'Active' : 'Completed'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}>
            <Target className="w-8 h-8 text-emerald-400/40" />
          </div>
          <p className="text-white/40 font-semibold">No {tab} strategies yet</p>
          <p className="text-white/20 text-sm mt-1">Your Cerebre team will share strategies here once they are validated and ready.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(s => {
            const isOpen = expanded === s.id;
            const score  = s.validation_score;
            const icon   = TYPE_ICONS[s.strategy_type] || '📋';
            return (
              <div key={s.id} className="rounded-2xl border overflow-hidden transition-all"
                style={{ borderColor: isOpen ? 'rgba(5,150,105,0.35)' : 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>

                {/* Header */}
                <button onClick={() => setExpanded(isOpen ? null : s.id)}
                  className="w-full flex items-start gap-4 p-5 text-left hover:bg-white/2 transition-colors">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.2)' }}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black text-white/90 leading-tight">{s.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-white/40 capitalize">{s.strategy_type?.replace('_',' ')} · {s.duration}</span>
                      {s.created_at && (
                        <span className="flex items-center gap-1 text-xs text-white/30">
                          <Calendar className="w-3 h-3" />
                          {new Date(s.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                        </span>
                      )}
                      {score && (
                        <span className="text-xs font-bold flex items-center gap-1" style={{ color: SCORE_COLOUR(score) }}>
                          <Zap className="w-3 h-3" /> ARIA score: {score}/100
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 mt-1">
                    {isOpen ? <ChevronUp className="w-5 h-5 text-white/30" /> : <ChevronDown className="w-5 h-5 text-white/30" />}
                  </div>
                </button>

                {/* Expanded */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    {/* ARIA validation bar */}
                    {score && (
                      <div className="flex items-center gap-3 py-4 border-b mb-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-bold text-purple-300">ARIA Validation Score</p>
                            <p className="text-sm font-black" style={{ color: SCORE_COLOUR(score) }}>{score}/100</p>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                            <div className="h-1.5 rounded-full transition-all duration-700"
                              style={{ width: `${score}%`, background: `linear-gradient(90deg, ${SCORE_COLOUR(score)}, ${SCORE_COLOUR(score)}80)` }} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Strategy content */}
                    {s.summary && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Strategy overview</p>
                        <p className="text-sm text-white/65 leading-relaxed whitespace-pre-line">{s.summary}</p>
                      </div>
                    )}

                    {s.kpis && (
                      <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(109,40,217,0.08)', border: '1px solid rgba(109,40,217,0.15)' }}>
                        <BarChart2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-purple-300 mb-1">Success metrics</p>
                          <p className="text-xs text-white/55">{s.kpis}</p>
                        </div>
                      </div>
                    )}

                    {s.submitted_by_name && (
                      <p className="text-xs text-white/25 mt-4">Submitted by {s.submitted_by_name}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

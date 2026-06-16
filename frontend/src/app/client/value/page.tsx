'use client';
import { useEffect, useState } from 'react';
import { Zap, TrendingUp, Loader2, ChevronDown, ChevronUp, Award } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('cerebre_client_token')}` });

const SCORE_C = (s:number) => s>=80?'#059669':s>=60?'#6d28d9':s>=40?'#d97706':'#ef4444';
const SCORE_L = (s:number) => s>=80?'EXCEPTIONAL':s>=60?'HIGH VALUE':s>=40?'SOLID':'DEVELOPING';

export default function ValueReportPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [tasks, setTasks]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string|null>(null);

  useEffect(() => {
    const now = new Date();
    Promise.all([
      axios.get(`${API}/client/proof-of-work`, { headers: hdrs() }),
      axios.get(`${API}/client/tasks?year=${now.getFullYear()}&week=${getWeek(now)}`, { headers: hdrs() }),
    ]).then(([r1, r2]) => {
      setReports(r1.data.reports || []);
      setTasks(r2.data.tasks || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  function getWeek(d: Date) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1) / 7);
  }

  const TASK_ICONS: Record<string,string> = {
    content_published:'📱', campaign_launched:'🚀', campaign_optimised:'⚙️',
    report_submitted:'📊', client_meeting:'🤝', analytics_review:'🔍',
    influencer_outreach:'🎤', ad_setup:'💰', seo_work:'🔎',
    community_management:'💬', strategy_submitted:'📋', content_created:'✍️',
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-purple-400" />
          <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Proof of Value Engine</p>
        </div>
        <h1 className="text-2xl font-black text-white">What Cerebre Did For You</h1>
        <p className="text-white/40 text-sm mt-1">Evidence of work delivered and its measurable impact</p>
      </div>

      {loading ? <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 text-purple-400 animate-spin"/></div> : (
        <div className="space-y-6">
          {/* This week's tasks */}
          <div className="rounded-2xl border p-5" style={{ borderColor:'rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.03)' }}>
            <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-4">This week's deliverables</p>
            {tasks.length === 0 ? (
              <p className="text-white/20 text-sm text-center py-4">No deliverables logged yet this week</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((t:any) => (
                  <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-lg flex-shrink-0">{TASK_ICONS[t.task_type]||'✅'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white/80">{t.title}</p>
                      {t.client_notes && <p className="text-xs text-white/40 mt-0.5">{t.client_notes}</p>}
                      {t.output_url && <a href={t.output_url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline mt-1 inline-block">View output →</a>}
                    </div>
                    {t.correlated_metric && t.correlation_strength !== 'none' && (
                      <div className="text-right flex-shrink-0">
                        <p className={clsx('text-xs font-bold', t.metric_change_pct>0?'text-green-400':'text-red-400')}>
                          {t.metric_change_pct>0?'+':''}{t.metric_change_pct?.toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-white/20">{t.correlated_metric?.replace('_',' ')}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly proof-of-work reports */}
          <div>
            <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3">Monthly Value Reports</p>
            {reports.length === 0 ? (
              <div className="rounded-2xl border p-8 text-center" style={{ borderColor:'rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.02)',borderStyle:'dashed' }}>
                <Award className="w-10 h-10 mx-auto text-white/10 mb-3" />
                <p className="text-white/30 text-sm">Your first Value Report will appear here at the end of this month</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((r:any) => {
                  const score  = r.ai_value_score;
                  const colour = score ? SCORE_C(score) : '#6d28d9';
                  const isOpen = expanded === r.id;
                  return (
                    <div key={r.id} className="rounded-2xl border overflow-hidden" style={{ borderColor:`${colour}25`,background:'rgba(255,255,255,0.02)' }}>
                      <button onClick={() => setExpanded(isOpen ? null : r.id)} className="w-full flex items-center gap-5 p-5 text-left">
                        {score && (
                          <div className="text-center flex-shrink-0">
                            <p className="text-3xl font-black" style={{ color:colour }}>{Math.round(score)}</p>
                            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color:`${colour}80` }}>{SCORE_L(score)}</p>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white/80">{r.period_label||'Monthly Report'}</p>
                          {r.ai_summary && <p className="text-xs text-white/40 mt-1 line-clamp-2">{r.ai_summary}</p>}
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-white/20">
                            <span>{r.total_tasks_completed} deliverables</span>
                            <span>·</span>
                            <span>{r.total_strategies} strategies</span>
                          </div>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0"/> : <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0"/>}
                      </button>
                      {isOpen && r.ai_narrative && (
                        <div className="px-5 pb-5 border-t" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
                          <p className="text-sm text-white/60 leading-relaxed mt-4 pt-1">{r.ai_narrative}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

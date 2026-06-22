'use client';
import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Zap, Building2, Sparkles } from 'lucide-react';
import { PageHeader, Card, Badge, Button, TOKENS } from '@/components';
import axios from 'axios';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const CAT_STYLES: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
  religious:   { bg:'rgba(245,158,11,0.12)', text:'#fcd34d', border:'rgba(245,158,11,0.3)', emoji:'🕌' },
  national:    { bg:'rgba(34,197,94,0.12)',  text:'#86efac', border:'rgba(34,197,94,0.3)',  emoji:'🇳🇬' },
  cultural:    { bg:'rgba(168,85,247,0.12)', text:'#d8b4fe', border:'rgba(168,85,247,0.3)', emoji:'🎭' },
  commercial:  { bg:'rgba(59,130,246,0.12)', text:'#93c5fd', border:'rgba(59,130,246,0.3)', emoji:'🛒' },
  sporting:    { bg:'rgba(239,68,68,0.12)',  text:'#fca5a5', border:'rgba(239,68,68,0.3)',  emoji:'⚽' },
  awareness:   { bg:'rgba(16,185,129,0.12)', text:'#6ee7b7', border:'rgba(16,185,129,0.3)', emoji:'💚' },
};

interface Moment {
  id: string;
  title: string;
  date: string;
  category: string;
  description: string;
  brand_opportunity: string;
  relevance_score: number;
  is_recurring: boolean;
}

export default function CalendarPage() {
  const [moments,   setMoments]   = useState<Moment[]>([]);
  const [selected,  setSelected]  = useState<Moment | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [brands,    setBrands]    = useState<any[]>([]);
  const [year,      setYear]      = useState(new Date().getFullYear());
  const [month,     setMonth]     = useState(new Date().getMonth());
  const [generating, setGenerating] = useState('');

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/client/moments?year=${year}&month=${month + 1}`, { headers: hdrs() }).catch(() => ({ data: { moments: [] } })),
      axios.get(`${API}/admin/brands`, { headers: hdrs() }).catch(() => ({ data: { brands: [] } })),
    ]).then(([m, b]) => {
      setMoments(m.data.moments || []);
      setBrands(b.data.brands || []);
    }).finally(() => setLoading(false));
  }, [year, month]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, i) => {
    const d = i - firstDay + 1;
    return d >= 1 && d <= daysInMonth ? d : null;
  });

  const getMoments = (day: number | null) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return moments.filter(m => m.date?.startsWith(dateStr));
  };

  const generateIdea = async (moment: Moment, brandId: string) => {
    if (!brandId) { toast.error('Select a brand first'); return; }
    setGenerating(`${moment.id}-${brandId}`);
    try {
      const { data } = await axios.post(`${API}/admin/brands/${brandId}/generate-narrative`, { moment_id: moment.id, context: moment.title }, { headers: hdrs() });
      toast.success('Content idea generated — check the brand dashboard');
    } catch { toast.error('Generation failed'); } finally { setGenerating(''); }
  };

  const [ideaBrandId, setIdeaBrandId] = useState('');

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <PageHeader
        eyebrow="Cultural Intelligence"
        title="Content Calendar"
        subtitle="Nigerian and African cultural moments — know when to post and what to say"
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-black text-white">{MONTH_NAMES[month]} {year}</h2>
            <button onClick={nextMonth} className="p-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Grid */}
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: TOKENS.border }}>
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b" style={{ borderColor: TOKENS.border, background: 'rgba(255,255,255,0.03)' }}>
              {DAY_NAMES.map(d => (
                <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider" style={{ color: TOKENS.muted }}>{d}</div>
              ))}
            </div>
            {/* Cells */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const dayMoments = getMoments(day);
                const today = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                return (
                  <div key={i}
                    className={clsx('min-h-[80px] p-1.5 border-r border-b cursor-pointer transition-colors group', day && 'hover:bg-white/3', !day && 'opacity-0 pointer-events-none')}
                    style={{ borderColor: TOKENS.border }}
                    onClick={() => dayMoments[0] && setSelected(dayMoments[0])}>
                    {day && (
                      <>
                        <span className={clsx('text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1', today ? 'text-white' : 'text-white/40')}
                          style={today ? { background: '#6d28d9' } : {}}>
                          {day}
                        </span>
                        <div className="space-y-0.5">
                          {dayMoments.slice(0, 2).map((m, j) => {
                            const cat = CAT_STYLES[m.category] || CAT_STYLES.cultural;
                            return (
                              <div key={j} className="text-[9px] font-semibold px-1.5 py-0.5 rounded truncate leading-tight"
                                style={{ background: cat.bg, color: cat.text, border: `1px solid ${cat.border}` }}>
                                {m.title}
                              </div>
                            );
                          })}
                          {dayMoments.length > 2 && <p className="text-[9px] text-white/25 pl-1">+{dayMoments.length - 2} more</p>}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4">
            {Object.entries(CAT_STYLES).map(([cat, style]) => (
              <div key={cat} className="flex items-center gap-1.5 text-[11px] font-semibold capitalize" style={{ color: style.text }}>
                <div className="w-2 h-2 rounded-full" style={{ background: style.text }} />{cat}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar — upcoming + selected detail */}
        <div className="space-y-5">
          {/* Selected moment */}
          {selected ? (
            <Card style={{ borderColor: (CAT_STYLES[selected.category]?.border) || TOKENS.border, background: (CAT_STYLES[selected.category]?.bg) || TOKENS.surface }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-2xl mb-1">{CAT_STYLES[selected.category]?.emoji || '📅'}</div>
                  <p className="text-base font-black text-white leading-tight">{selected.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: CAT_STYLES[selected.category]?.text || TOKENS.accent }}>
                    {new Date(selected.date).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}
                  </p>
                </div>
                <Badge variant={selected.relevance_score >= 8 ? 'success' : selected.relevance_score >= 5 ? 'purple' : 'default'}>
                  Score {selected.relevance_score}/10
                </Badge>
              </div>
              {selected.description && <p className="text-xs text-white/60 leading-relaxed mb-3">{selected.description}</p>}
              {selected.brand_opportunity && (
                <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${TOKENS.border}` }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Brand opportunity</p>
                  </div>
                  <p className="text-xs text-white/65 leading-relaxed">{selected.brand_opportunity}</p>
                </div>
              )}
              <div className="space-y-2">
                <select value={ideaBrandId} onChange={e => setIdeaBrandId(e.target.value)}
                  className="w-full text-xs rounded-lg px-3 py-2 outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: ideaBrandId ? '#fff' : 'rgba(255,255,255,0.35)' }}>
                  <option value="">Generate idea for brand…</option>
                  {brands.map(b => <option key={b.id} value={b.id} style={{ background: '#0f0a2e' }}>{b.name}</option>)}
                </select>
                <Button full size="sm" icon={<Zap className="w-4 h-4" />} loading={!!generating} disabled={!ideaBrandId}
                  onClick={() => generateIdea(selected, ideaBrandId)}>
                  Generate content idea
                </Button>
              </div>
            </Card>
          ) : (
            <div className="text-center py-8 text-white/25 text-sm">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Click a highlighted day to see the moment details and generate content ideas
            </div>
          )}

          {/* Upcoming moments */}
          <div>
            <p className="text-xs font-bold text-white/35 uppercase tracking-wider mb-3">Upcoming this month</p>
            {loading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /></div>
            ) : moments.length === 0 ? (
              <p className="text-xs text-white/25 text-center py-4">No moments loaded</p>
            ) : (
              <div className="space-y-2">
                {moments.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(m => {
                  const cat = CAT_STYLES[m.category] || CAT_STYLES.cultural;
                  const days = Math.ceil((new Date(m.date).getTime() - Date.now()) / 86400000);
                  return (
                    <button key={m.id} onClick={() => setSelected(m)}
                      className={clsx('w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all hover:border-purple-500/30', selected?.id === m.id && 'border-purple-500/40')}
                      style={{ background: selected?.id === m.id ? 'rgba(109,40,217,0.12)' : 'rgba(255,255,255,0.02)', borderColor: selected?.id === m.id ? 'rgba(109,40,217,0.4)' : 'rgba(255,255,255,0.07)' }}>
                      <span className="text-lg flex-shrink-0">{cat.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white/75 truncate">{m.title}</p>
                        <p className="text-[10px]" style={{ color: cat.text }}>
                          {days < 0 ? 'Past' : days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `In ${days} days`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

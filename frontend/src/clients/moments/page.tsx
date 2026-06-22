'use client';
import { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem(BRAND.storage.clientToken)}` });

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const CAT: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
  religious:   { bg:'rgba(245,158,11,0.12)', text:'#fcd34d', border:'rgba(245,158,11,0.3)',  emoji:'🕌' },
  national:    { bg:'rgba(34,197,94,0.12)',  text:'#86efac', border:'rgba(34,197,94,0.3)',   emoji:'🇳🇬' },
  cultural:    { bg:'rgba(168,85,247,0.12)', text:'#d8b4fe', border:'rgba(168,85,247,0.3)',  emoji:'🎭' },
  commercial:  { bg:'rgba(59,130,246,0.12)', text:'#93c5fd', border:'rgba(59,130,246,0.3)',  emoji:'🛒' },
  sporting:    { bg:'rgba(239,68,68,0.12)',  text:'#fca5a5', border:'rgba(239,68,68,0.3)',   emoji:'⚽' },
  awareness:   { bg:'rgba(16,185,129,0.12)', text:'#6ee7b7', border:'rgba(16,185,129,0.3)',  emoji:'💚' },
};

export default function ClientMomentsPage() {
  const [moments,  setMoments]  = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [year,     setYear]     = useState(new Date().getFullYear());
  const [month,    setMonth]    = useState(new Date().getMonth());

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/client/moments?year=${year}&month=${month + 1}`, { headers: hdrs() })
      .then(r => setMoments(r.data.moments || []))
      .catch(() => setMoments([]))
      .finally(() => setLoading(false));
  }, [year, month]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells       = Array.from({ length: Math.ceil((firstDay+daysInMonth)/7)*7 }, (_, i) => {
    const d = i - firstDay + 1;
    return (d >= 1 && d <= daysInMonth) ? d : null;
  });

  const dayMoments = (day: number|null) => {
    if (!day) return [];
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return moments.filter(m => m.date?.startsWith(ds));
  };

  const upcoming = [...moments]
    .filter(m => new Date(m.date).getTime() >= Date.now())
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 rounded-full" style={{ background: '#6d28d9' }} />
          <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Cultural Intelligence</p>
        </div>
        <h1 className="text-2xl font-black text-white">Cultural Moments</h1>
        <p className="text-white/40 text-sm mt-1">
          Key Nigerian and African moments your brand should be communicating around — curated by {BRAND.aria}.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-black text-white">{MONTH_NAMES[month]} {year}</h2>
            <button onClick={nextMonth} className="p-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="grid grid-cols-7 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-white/25">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const dm    = dayMoments(day);
                const today = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                return (
                  <div key={i}
                    className={clsx('min-h-[72px] p-1.5 border-r border-b', day && dm.length > 0 && 'cursor-pointer hover:bg-white/2', !day && 'opacity-0 pointer-events-none')}
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                    onClick={() => dm[0] && setSelected(dm[0])}>
                    {day && (
                      <>
                        <span className={clsx('text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1', today ? 'text-white' : 'text-white/35')}
                          style={today ? { background: '#6d28d9' } : {}}>
                          {day}
                        </span>
                        {dm.slice(0, 2).map((m, j) => {
                          const cat = CAT[m.category] || CAT.cultural;
                          return (
                            <div key={j} className="text-[9px] font-semibold px-1.5 py-0.5 rounded mb-0.5 truncate"
                              style={{ background: cat.bg, color: cat.text, border: `1px solid ${cat.border}` }}>
                              {m.title}
                            </div>
                          );
                        })}
                        {dm.length > 2 && <p className="text-[9px] text-white/25 pl-1">+{dm.length - 2}</p>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {selected ? (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: (CAT[selected.category]?.border) || 'rgba(255,255,255,0.1)', background: (CAT[selected.category]?.bg) || 'rgba(255,255,255,0.03)' }}>
              <div className="p-5">
                <div className="text-3xl mb-3">{CAT[selected.category]?.emoji || '📅'}</div>
                <h3 className="text-lg font-black text-white leading-tight mb-1">{selected.title}</h3>
                <p className="text-xs mb-4" style={{ color: CAT[selected.category]?.text || '#a78bfa' }}>
                  {new Date(selected.date).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}
                </p>
                {selected.description && <p className="text-sm text-white/60 leading-relaxed mb-4">{selected.description}</p>}
                {selected.brand_opportunity && (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Content opportunity</p>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">{selected.brand_opportunity}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-white/20 text-sm">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-25" />
              Click a date to see the moment details
            </div>
          )}

          {/* Upcoming */}
          <div>
            <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3">Coming up</p>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-purple-400 animate-spin" /></div>
            ) : upcoming.length === 0 ? (
              <p className="text-xs text-white/20 text-center py-4">No upcoming moments</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map(m => {
                  const cat  = CAT[m.category] || CAT.cultural;
                  const days = Math.ceil((new Date(m.date).getTime() - Date.now()) / 86400000);
                  return (
                    <button key={m.id} onClick={() => setSelected(m)}
                      className={clsx('w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-purple-500/25', selected?.id === m.id && 'border-purple-500/35')}
                      style={{ background: 'rgba(255,255,255,0.02)', borderColor: selected?.id === m.id ? 'rgba(109,40,217,0.35)' : 'rgba(255,255,255,0.06)' }}>
                      <span className="text-xl flex-shrink-0">{cat.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white/75 truncate">{m.title}</p>
                        <p className="text-[10px]" style={{ color: cat.text }}>
                          {days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `In ${days} days`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(CAT).map(([cat, style]) => (
              <div key={cat} className="flex items-center gap-1.5 text-[10px] font-semibold capitalize" style={{ color: style.text }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: style.text }} />{cat}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

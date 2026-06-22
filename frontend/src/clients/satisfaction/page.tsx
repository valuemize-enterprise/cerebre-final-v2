'use client';
import { useState } from 'react';
import { Star, Send, Heart, Loader2 } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import axios from 'axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem(BRAND.storage.clientToken)}` });

const NPS_LABEL = (s: number) => ['','Very poor','Poor','Below average','Average','Okay','Decent','Good','Great','Excellent','Outstanding!'][s] || '';
const NPS_COL   = (s: number) => s >= 9 ? '#059669' : s >= 7 ? '#6d28d9' : s >= 5 ? '#d97706' : '#ef4444';

const StarRow = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
    <span className="text-sm text-white/60">{label}</span>
    <div className="flex gap-1.5">
      {[1,2,3,4,5].map(s => (
        <button key={s} onClick={() => onChange(s)} className="transition-all hover:scale-110">
          <Star className={clsx('w-5 h-5', s <= value ? 'fill-amber-400 text-amber-400' : 'text-white/15')} />
        </button>
      ))}
    </div>
  </div>
);

export default function ClientSatisfactionPage() {
  const [submitted, setSubmitted] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [nps,       setNps]       = useState(0);
  const [recommend, setRecommend] = useState<boolean|null>(null);
  const [ratings,   setRatings]   = useState({ strategy:0, communication:0, results:0, value:0 });
  const [highlight, setHighlight] = useState('');
  const [improve,   setImprove]   = useState('');

  const submit = async () => {
    if (!nps) { toast.error('Please give an overall score'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/client/satisfaction`, {
        overall_score: nps, strategy_score: ratings.strategy || null,
        communication_score: ratings.communication || null,
        results_score: ratings.results || null,
        value_for_money: ratings.value || null,
        would_recommend: recommend, highlight, improvement: improve,
      }, { headers: hdrs() });
      setSubmitted(true);
    } catch { toast.error('Submit failed — try again'); } finally { setSaving(false); }
  };

  const tarea = (val: string, set: (v: string) => void, label: string, ph: string) => (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#a78bfa' }}>{label}</label>
      <textarea rows={3} value={val} onChange={e => set(e.target.value)} placeholder={ph}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-purple-500/50 text-white"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
    </div>
  );

  if (submitted) return (
    <div className="p-6 lg:p-8 max-w-lg mx-auto text-center py-24">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(109,40,217,0.12)', border: '2px solid rgba(109,40,217,0.3)' }}>
        <Heart className="w-10 h-10 text-purple-400" />
      </div>
      <h2 className="text-2xl font-black text-white mb-2">Thank you!</h2>
      <p className="text-white/45 text-sm max-w-xs mx-auto leading-relaxed">
        Your feedback has been submitted to the Cerebre leadership team. We take every response seriously.
      </p>
      <button onClick={() => window.location.href = '/client/dashboard'}
        className="mt-8 px-7 py-3 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
        Back to dashboard
      </button>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 rounded-full" style={{ background: '#6d28d9' }} />
          <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Monthly Feedback</p>
        </div>
        <h1 className="text-2xl font-black text-white">How are we doing?</h1>
        <p className="text-white/40 text-sm mt-1">Honest feedback takes 2 minutes and makes Cerebre better for you.</p>
      </div>

      <div className="space-y-5">
        {/* NPS */}
        <div className="rounded-2xl border p-5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-bold text-white mb-1">Overall, how satisfied are you with Cerebre this month?</p>
          <p className="text-xs text-white/30 mb-4">1 = Very poor · 10 = Outstanding</p>
          <div className="flex gap-2 flex-wrap">
            {[1,2,3,4,5,6,7,8,9,10].map(s => (
              <button key={s} onClick={() => setNps(s)}
                className="w-10 h-10 rounded-xl text-sm font-black transition-all hover:scale-105"
                style={{
                  background: nps === s ? NPS_COL(s) : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${nps === s ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                  color: nps === s ? '#fff' : 'rgba(255,255,255,0.4)',
                  boxShadow: nps === s ? `0 0 14px ${NPS_COL(s)}50` : 'none',
                }}>
                {s}
              </button>
            ))}
          </div>
          {nps > 0 && <p className="text-sm font-bold mt-3" style={{ color: NPS_COL(nps) }}>{NPS_LABEL(nps)}</p>}
        </div>

        {/* Dimension ratings */}
        <div className="rounded-2xl border p-5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-bold text-white mb-4">Rate us on each dimension</p>
          <StarRow label="Strategy quality"   value={ratings.strategy}      onChange={v => setRatings(r => ({ ...r, strategy: v }))} />
          <StarRow label="Communication"      value={ratings.communication} onChange={v => setRatings(r => ({ ...r, communication: v }))} />
          <StarRow label="Results delivered"  value={ratings.results}       onChange={v => setRatings(r => ({ ...r, results: v }))} />
          <StarRow label="Value for money"    value={ratings.value}         onChange={v => setRatings(r => ({ ...r, value: v }))} />
        </div>

        {/* Recommend */}
        <div className="rounded-2xl border p-5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-bold text-white mb-4">Would you recommend Cerebre to another business?</p>
          <div className="flex gap-3">
            {[{ v: true, l: 'Yes, definitely' }, { v: false, l: 'Not right now' }].map(({ v, l }) => (
              <button key={l} onClick={() => setRecommend(v)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: recommend === v ? (v ? 'rgba(5,150,105,0.2)' : 'rgba(239,68,68,0.15)') : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${recommend === v ? (v ? 'rgba(5,150,105,0.35)' : 'rgba(239,68,68,0.3)') : 'rgba(255,255,255,0.08)'}`,
                  color: recommend === v ? (v ? '#6ee7b7' : '#fca5a5') : 'rgba(255,255,255,0.4)',
                }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Written feedback */}
        <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
          {tarea(highlight, setHighlight, 'What did we do best? (optional)', 'e.g. The campaign strategy for Easter was exceptional...')}
          {tarea(improve, setImprove, 'What could we improve? (optional)', 'e.g. We\'d love faster delivery on weekly reports...')}
        </div>

        <button onClick={submit} disabled={saving || !nps}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)', boxShadow: '0 4px 20px rgba(109,40,217,0.3)' }}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : <><Send className="w-4 h-4" />Submit feedback</>}
        </button>
      </div>
    </div>
  );
}

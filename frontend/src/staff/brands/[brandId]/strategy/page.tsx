'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Zap, ArrowLeft, CheckCircle2, Loader2, Lightbulb, AlertCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const STRAT_TYPES = [
  { value:'content',    label:'📱 Content strategy'   },
  { value:'growth',     label:'📈 Growth strategy'    },
  { value:'campaign',   label:'🚀 Campaign strategy'  },
  { value:'paid',       label:'💰 Paid media'         },
  { value:'brand_voice',label:'🎯 Brand voice'        },
  { value:'community',  label:'💬 Community'          },
  { value:'seasonal',   label:'📅 Seasonal'           },
  { value:'seo',        label:'🔎 SEO strategy'       },
];

export default function StaffStrategyPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const router      = useRouter();
  const [brand, setBrand]         = useState<any>(null);
  const [saving, setSaving]       = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<any>(null);
  const [done, setDone]           = useState(false);
  const [form, setForm]           = useState({ title:'', strategy_type:'', duration:'monthly', summary:'', kpis:'' });

  useEffect(() => {
    axios.get(`${API}/admin/brands/${brandId}`, { headers: hdrs() })
      .then(r => setBrand(r.data.brand || r.data)).catch(() => {});
  }, [brandId]);

  const f = (k: string) => (e: any) => setForm(x => ({ ...x, [k]: e.target.value }));
  const iStyle = { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff' };

  const validate = async () => {
    if (!form.title || !form.strategy_type || form.summary.length < 30) { toast.error('Fill in all fields and add more detail to the summary'); return; }
    setValidating(true); setValidation(null);
    try {
      const { data } = await axios.post(`${API}/agency/brands/${brandId}/strategies/validate-preview`, { ...form, brand_id: brandId }, { headers: hdrs() });
      setValidation(data.validation || data);
    } catch { toast.error('Validation failed'); } finally { setValidating(false); }
  };

  const submit = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/agency/brands/${brandId}/strategies`, { ...form, brand_id: brandId, validation_score: validation?.validation_score }, { headers: hdrs() });
      setDone(true);
      toast.success('Strategy submitted!');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Save failed'); } finally { setSaving(false); }
  };

  const scoreCol = (s: number) => s >= 85 ? '#059669' : s >= 70 ? '#6d28d9' : s >= 55 ? '#d97706' : '#ef4444';

  if (done) return (
    <div className="p-8 max-w-md mx-auto text-center py-20">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background:'rgba(5,150,105,0.12)',border:'2px solid rgba(5,150,105,0.3)' }}>
        <CheckCircle2 className="w-8 h-8 text-emerald-400"/>
      </div>
      <h2 className="text-xl font-black text-white mb-2">Strategy submitted!</h2>
      {validation && <p className="text-sm font-semibold mb-1" style={{ color: scoreCol(validation.validation_score) }}>ARIA scored it {validation.validation_score}/100</p>}
      <p className="text-white/40 text-sm mb-8">Your team lead and the account manager can now review it.</p>
      <button onClick={() => router.push(`/staff/brands/${brandId}`)}
        className="px-7 py-3 rounded-xl text-sm font-bold text-white" style={{ background:'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
        Back to brand
      </button>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <a href={`/staff/brands/${brandId}`} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 mb-6 transition-colors"><ArrowLeft className="w-3.5 h-3.5"/>{brand?.name}</a>
      <h1 className="text-2xl font-black text-white mb-1">Submit strategy</h1>
      <p className="text-white/40 text-sm mb-7">Write a strategy for <span className="text-white/60 font-medium">{brand?.name}</span>. ARIA validates it before it's finalised.</p>

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color:'#a78bfa' }}>Strategy type *</label>
          <div className="grid grid-cols-4 gap-2">
            {STRAT_TYPES.map(t => (
              <button key={t.value} onClick={() => setForm(f => ({ ...f, strategy_type: t.value }))}
                className={clsx('p-3 rounded-xl text-left text-xs border transition-all', form.strategy_type===t.value?'text-white':'text-white/40 hover:text-white/60')}
                style={{ background:form.strategy_type===t.value?'rgba(109,40,217,0.2)':'rgba(255,255,255,0.03)', borderColor:form.strategy_type===t.value?'rgba(109,40,217,0.5)':'rgba(255,255,255,0.08)' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>Title *</label>
            <input className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/50" style={iStyle} value={form.title} onChange={f('title')} placeholder="e.g. Ramadan Content Plan 2026" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>Duration</label>
            <select className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ ...iStyle, background:'#0f0a2e' }} value={form.duration} onChange={f('duration')}>
              {[{v:'weekly',l:'1 week'},{v:'biweekly',l:'2 weeks'},{v:'monthly',l:'1 month'},{v:'quarterly',l:'3 months'}].map(o=>
                <option key={o.v} value={o.v} style={{ background:'#0f0a2e' }}>{o.l}</option>
              )}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>Strategy summary * <span className="normal-case font-normal text-white/25">(min 30 chars — ARIA reads this)</span></label>
          <textarea rows={6} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-purple-500/50" style={iStyle} value={form.summary} onChange={f('summary')} placeholder={"Describe the strategy:\n• What's the objective?\n• Who's the target audience?\n• What platforms and content types?\n• What's the posting cadence?\n• How will we measure success?"} />
          <p className="text-[10px] text-white/20 mt-1">{form.summary.length} chars</p>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>KPIs</label>
          <input className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/50" style={iStyle} value={form.kpis} onChange={f('kpis')} placeholder="e.g. +5K followers, 6% engagement, 100K impressions" />
        </div>

        {/* Validation result */}
        {validation && (
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor:`${scoreCol(validation.validation_score)}40`, background:`${scoreCol(validation.validation_score)}10` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor:`${scoreCol(validation.validation_score)}30` }}>
              <div className="flex items-center gap-2"><Zap className="w-5 h-5" style={{ color: scoreCol(validation.validation_score) }}/><p className="text-sm font-black text-white">ARIA validation</p></div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black" style={{ color: scoreCol(validation.validation_score) }}>{validation.validation_score}/100</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background:`${scoreCol(validation.validation_score)}25`, color:scoreCol(validation.validation_score) }}>{validation.verdict}</span>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-white/70 leading-relaxed">{validation.recommendation}</p>
              {validation.suggestions?.length > 0 && (
                <div className="mt-3 space-y-1">
                  {validation.suggestions.map((s: string, i: number) => (
                    <p key={i} className="text-xs text-white/50 flex items-start gap-2"><Lightbulb className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0"/>{s}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={validate} disabled={!form.title||!form.strategy_type||form.summary.length<30||validating}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all border"
            style={{ borderColor:'rgba(109,40,217,0.4)', background:'rgba(109,40,217,0.1)', color:'#c4b5fd' }}>
            {validating?<><Loader2 className="w-4 h-4 animate-spin"/>Validating…</>:<><Zap className="w-4 h-4"/>Validate first</>}
          </button>
          <button onClick={submit} disabled={saving||!form.title||!form.strategy_type||!form.summary}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 hover:brightness-110 transition-all"
            style={{ background:'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
            {saving?<><Loader2 className="w-4 h-4 animate-spin"/>Saving…</>:'Submit strategy →'}
          </button>
        </div>
      </div>
    </div>
  );
}

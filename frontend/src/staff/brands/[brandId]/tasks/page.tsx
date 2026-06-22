'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckSquare, ArrowLeft, CheckCircle2, Loader2, Link2, Sparkles } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const TASK_TYPES = [
  { value:'content_published',    label:'📱 Content published'    },
  { value:'campaign_launched',    label:'🚀 Campaign launched'    },
  { value:'analytics_review',     label:'🔍 Analytics review'     },
  { value:'content_created',      label:'✍️ Content created'      },
  { value:'community_management', label:'💬 Community management' },
  { value:'ad_setup',             label:'💰 Ad setup'             },
  { value:'client_meeting',       label:'🤝 Client meeting'       },
  { value:'report_submitted',     label:'📊 Report submitted'     },
  { value:'strategy_submitted',   label:'📋 Strategy submitted'   },
];

const PLATFORMS = ['instagram','facebook','tiktok','twitter','linkedin','youtube','google_ads','website','all_platforms'];

export default function StaffLogTaskPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const router      = useRouter();
  const [brand, setBrand]   = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const [form, setForm]     = useState({
    task_type:'', title:'', description:'', platform:'',
    output_link:'', completed_date: new Date().toISOString().split('T')[0],
    hours_spent:'', impact_note:'',
  });

  useEffect(() => {
    axios.get(`${API}/admin/brands/${brandId}`, { headers: hdrs() })
      .then(r => setBrand(r.data.brand || r.data)).catch(() => {});
  }, [brandId]);

  const f = (k: string) => (e: any) => setForm(x => ({ ...x, [k]: e.target.value }));
  const iStyle = { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff' };

  const submit = async () => {
    if (!form.task_type || !form.title.trim()) { toast.error('Choose a task type and add a title'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/agency/brands/${brandId}/tasks`, {
        ...form, brand_id: brandId,
        hours_spent: form.hours_spent ? parseFloat(form.hours_spent) : null,
      }, { headers: hdrs() });
      setDone(true);
      toast.success('Task logged!');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Save failed'); } finally { setSaving(false); }
  };

  if (done) return (
    <div className="p-8 max-w-md mx-auto text-center py-20">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background:'rgba(5,150,105,0.12)', border:'2px solid rgba(5,150,105,0.3)' }}>
        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
      </div>
      <h2 className="text-xl font-black text-white mb-2">Task logged!</h2>
      <p className="text-white/40 text-sm mb-8">Added to {brand?.name}'s Proof of Value record.</p>
      <div className="flex gap-3 justify-center">
        <button onClick={() => { setDone(false); setForm({ task_type:'',title:'',description:'',platform:'',output_link:'',completed_date:new Date().toISOString().split('T')[0],hours_spent:'',impact_note:'' }); }}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/50" style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)' }}>
          Log another
        </button>
        <button onClick={() => router.push(`/staff/brands/${brandId}`)}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background:'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
          Back to brand
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <a href={`/staff/brands/${brandId}`} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 mb-6 transition-colors"><ArrowLeft className="w-3.5 h-3.5"/>{brand?.name}</a>
      <h1 className="text-2xl font-black text-white mb-1">Log a task</h1>
      <p className="text-white/40 text-sm mb-7">Record what you completed for <span className="text-white/60 font-medium">{brand?.name}</span>.</p>

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color:'#a78bfa' }}>Task type *</label>
          <div className="grid grid-cols-3 gap-2">
            {TASK_TYPES.map(t => (
              <button key={t.value} onClick={() => setForm(f => ({ ...f, task_type: t.value }))}
                className={clsx('p-3 rounded-xl text-left text-xs border transition-all', form.task_type===t.value?'text-white':'text-white/40 hover:text-white/60')}
                style={{ background:form.task_type===t.value?'rgba(109,40,217,0.2)':'rgba(255,255,255,0.03)', borderColor:form.task_type===t.value?'rgba(109,40,217,0.5)':'rgba(255,255,255,0.08)' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>Title *</label>
          <input className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/50" style={iStyle} value={form.title} onChange={f('title')} placeholder="What did you do? Be specific." />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>More detail</label>
          <textarea rows={3} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-purple-500/50" style={iStyle} value={form.description} onChange={f('description')} placeholder="Numbers make this more valuable: '4 posts, 2 stories, reach: 12,000'..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>Platform</label>
            <select className="w-full rounded-xl px-4 py-3 text-sm outline-none capitalize" style={{ ...iStyle, background:'#0f0a2e' }} value={form.platform} onChange={f('platform')}>
              <option value="">Select…</option>
              {PLATFORMS.map(p => <option key={p} value={p} style={{ background:'#0f0a2e', textTransform:'capitalize' }}>{p.replace('_',' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>Completed date</label>
            <input type="date" className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/50" style={iStyle} value={form.completed_date} onChange={f('completed_date')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>Output link</label>
            <input className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/50" style={iStyle} value={form.output_link} onChange={f('output_link')} placeholder="Post or doc URL" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>Hours spent</label>
            <input type="number" min="0.5" step="0.5" className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/50" style={iStyle} value={form.hours_spent} onChange={f('hours_spent')} placeholder="e.g. 2" />
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background:'rgba(109,40,217,0.06)', borderColor:'rgba(109,40,217,0.2)' }}>
          <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-purple-400"/><label className="text-xs font-bold text-purple-300 uppercase tracking-wider">Impact note (optional but powerful)</label></div>
          <textarea rows={2} className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-purple-500/50" style={iStyle} value={form.impact_note} onChange={f('impact_note')} placeholder="e.g. 'This Reel got 14K views and drove 600 new followers in 24 hours'" />
        </div>
        <button onClick={submit} disabled={saving || !form.task_type || !form.title.trim()}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:brightness-110"
          style={{ background:'linear-gradient(135deg,#6d28d9,#9333ea)', boxShadow:'0 4px 16px rgba(109,40,217,0.3)' }}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin"/>Saving…</> : <><CheckSquare className="w-4 h-4"/>Log this task</>}
        </button>
      </div>
    </div>
  );
}

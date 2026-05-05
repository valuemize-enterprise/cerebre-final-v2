'use client';
import { useEffect, useState } from 'react';
import { FlaskConical, Plus, CheckCircle2, Loader2, TrendingUp, X } from 'lucide-react';
import api from '../../lib/api';
import clsx from 'clsx';

export default function ExperimentsPage() {
  const [exps, setExps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name:'', hypothesis:'', platform:'instagram', test_type:'caption', variant_a:'', variant_b:''});

  useEffect(() => { api.get('/experiments').then(({data}) => setExps(data.experiments||[])).finally(()=>setLoading(false)); },[]);

  const save = async () => {
    const {data} = await api.post('/experiments', { ...form, variant_a:{description:form.variant_a}, variant_b:{description:form.variant_b} });
    setExps(prev=>[...prev,data.experiment]);
    setShowNew(false);
  };

  const STATUS = { running:{color:'text-brand-600 bg-brand-50 dark:bg-brand-950/20',label:'Running'}, completed:{color:'text-green-600 bg-green-50 dark:bg-green-950/20',label:'Completed'}, draft:{color:'text-gray-500 bg-gray-100 dark:bg-gray-800',label:'Draft'} };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin"/></div>;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">A/B Experiments</h1>
          <p className="text-sm text-gray-400 mt-1">Test content variations and apply proven winners to your strategy</p>
        </div>
        <button onClick={()=>setShowNew(true)} className="btn-primary"><Plus className="w-4 h-4"/>New experiment</button>
      </div>

      {showNew&&(
        <div className="card p-5 border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/20">
          <h3 className="text-sm font-semibold mb-4">New experiment</h3>
          <div className="space-y-3">
            <input className="input-base" placeholder="Experiment name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
            <input className="input-base" placeholder="Hypothesis: I believe that... will result in..." value={form.hypothesis} onChange={e=>setForm(f=>({...f,hypothesis:e.target.value}))}/>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Platform</label>
                <select className="input-base text-xs" value={form.platform} onChange={e=>setForm(f=>({...f,platform:e.target.value}))}>
                  {['instagram','tiktok','facebook','linkedin','twitter','youtube'].map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Test type</label>
                <select className="input-base text-xs" value={form.test_type} onChange={e=>setForm(f=>({...f,test_type:e.target.value}))}>
                  {['caption','cta','visual','format','posting_time','hashtags'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Variant A</label><textarea className="input-base resize-none text-xs" rows={3} placeholder="Describe variant A..." value={form.variant_a} onChange={e=>setForm(f=>({...f,variant_a:e.target.value}))}/></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Variant B</label><textarea className="input-base resize-none text-xs" rows={3} placeholder="Describe variant B..." value={form.variant_b} onChange={e=>setForm(f=>({...f,variant_b:e.target.value}))}/></div>
            </div>
            <div className="flex gap-2"><button onClick={save} className="btn-primary flex-1">Create experiment</button><button onClick={()=>setShowNew(false)} className="btn-secondary">Cancel</button></div>
          </div>
        </div>
      )}

      {exps.length===0?(
        <div className="card text-center py-16 border-dashed"><FlaskConical className="w-10 h-10 mx-auto text-gray-300 mb-3"/><p className="text-gray-500 font-medium">No experiments yet</p><p className="text-sm text-gray-400 mt-1">A/B test captions, visuals, CTAs, and posting times to find what works</p></div>
      ):(
        <div className="grid sm:grid-cols-2 gap-4">
          {exps.map(exp=>{
            const st = STATUS[exp.status as keyof typeof STATUS]||STATUS.draft;
            const va = typeof exp.variant_a==='string'?JSON.parse(exp.variant_a):exp.variant_a||{};
            const vb = typeof exp.variant_b==='string'?JSON.parse(exp.variant_b):exp.variant_b||{};
            return (
              <div key={exp.id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{exp.name}</p>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',st.color)}>{st.label}</span>
                </div>
                {exp.hypothesis&&<p className="text-xs text-gray-500 mb-3">{exp.hypothesis}</p>}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[{label:'A',v:va},{label:'B',v:vb}].map(({label,v})=>(
                    <div key={label} className={clsx('p-2 rounded-lg border text-xs',exp.winner===label?'border-green-400 bg-green-50 dark:bg-green-950/20':'border-gray-100 dark:border-gray-800')}>
                      <p className="font-bold text-gray-600 dark:text-gray-400 mb-1">Variant {label} {exp.winner===label&&'🏆'}</p>
                      <p className="text-gray-500">{v.description||'—'}</p>
                      {v.engagement_rate&&<p className="text-brand-600 font-medium mt-1">{(v.engagement_rate*100).toFixed(1)}% ER</p>}
                    </div>
                  ))}
                </div>
                {exp.ai_conclusion&&<p className="text-xs text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-2">{exp.ai_conclusion}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
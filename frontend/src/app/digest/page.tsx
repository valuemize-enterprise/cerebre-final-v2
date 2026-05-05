'use client';
import { useEffect, useState } from 'react';
import { Mail, Send, Clock, Users, ToggleLeft, ToggleRight, Loader2, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function DigestPage() {
  const [config, setConfig] = useState<any>(null);
  const [recentSends, setRecentSends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newRecipient, setNewRecipient] = useState({ name:'', email:'', role:'analyst' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/digest/config'), api.get('/digest/history')]).then(([cRes,hRes]) => {
      setConfig(cRes.data.config||{ is_enabled:true, frequency:'weekly', send_day:1, send_time:'08:00', recipients:[], include_sections:['health_score','goal_progress','top_wins','next_actions'] });
      setRecentSends(hRes.data.sends||[]);
    }).finally(()=>setLoading(false));
  },[]);

  const save = async () => {
    setSaving(true);
    try { await api.put('/digest/config', config); toast.success('Digest settings saved'); }
    catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const addRecipient = () => {
    if (!newRecipient.email) return;
    setConfig((c:any)=>({...c,recipients:[...(c.recipients||[]),{...newRecipient}]}));
    setNewRecipient({ name:'', email:'', role:'analyst' });
  };

  const removeRecipient = (i:number) => setConfig((c:any)=>({...c,recipients:c.recipients.filter((_:any,j:number)=>j!==i)}));

  const sendNow = async () => {
    setSending(true);
    try { await api.post('/digest/send-now'); toast.success('Digest sent to all recipients'); }
    catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const SECTIONS = [
    {id:'health_score',label:'Brand health score'},
    {id:'goal_progress',label:'Goal progress update'},
    {id:'top_wins',label:'Top wins this week'},
    {id:'top_concerns',label:'Things to watch'},
    {id:'platform_breakdown',label:'Platform performance'},
    {id:'next_actions',label:'AI recommended actions'},
    {id:'competitor_moves',label:'Competitor activity'},
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin"/></div>;
  if (!config) return null;

  const recipients = config.recipients||[];
  const sections = config.include_sections||[];

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1"><Mail className="w-4 h-4 text-brand-500"/><span className="section-title text-brand-600">Stakeholder Delivery</span></div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Weekly Digest</h1>
          <p className="text-sm text-gray-400 mt-1">Auto-send a performance summary to your board, CMO, and team every week</p>
        </div>
        <div className="flex gap-2">
          <button onClick={sendNow} disabled={sending} className="btn-secondary">
            {sending?<Loader2 className="w-4 h-4 animate-spin"/>:<Send className="w-4 h-4"/>}
            {sending?'Sending...':'Send now'}
          </button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving?<Loader2 className="w-4 h-4 animate-spin"/>:null}Save settings
          </button>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Auto-send enabled</p><p className="text-xs text-gray-400">Digest sends automatically on schedule</p></div>
          <button onClick={()=>setConfig((c:any)=>({...c,is_enabled:!c.is_enabled}))}>
            {config.is_enabled?<ToggleRight className="w-8 h-8 text-brand-500"/>:<ToggleLeft className="w-8 h-8 text-gray-400"/>}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Frequency</label>
            <select className="input-base text-xs" value={config.frequency} onChange={e=>setConfig((c:any)=>({...c,frequency:e.target.value}))}>
              {['daily','weekly','biweekly','monthly'].map(f=><option key={f} className="capitalize">{f}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Send day</label>
            <select className="input-base text-xs" value={config.send_day} onChange={e=>setConfig((c:any)=>({...c,send_day:parseInt(e.target.value)}))}>
              {DAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Send time</label>
            <input type="time" className="input-base text-xs" value={config.send_time} onChange={e=>setConfig((c:any)=>({...c,send_time:e.target.value}))}/>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">What to include</h3>
        <div className="grid grid-cols-2 gap-2">
          {SECTIONS.map(s=>(
            <label key={s.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
              <input type="checkbox" checked={sections.includes(s.id)} onChange={e=>setConfig((c:any)=>({...c,include_sections:e.target.checked?[...sections,s.id]:sections.filter((x:string)=>x!==s.id)}))} className="rounded"/>
              {s.label}
            </label>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recipients ({recipients.length})</h3>
        </div>
        <div className="space-y-2 mb-3">
          {recipients.map((r:any,i:number)=>(
            <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-700 dark:text-gray-300">{r.name||r.email}</p><p className="text-xs text-gray-400">{r.email} · <span className="capitalize">{r.role}</span></p></div>
              <button onClick={()=>removeRecipient(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5"/></button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2">
          <input className="input-base text-xs col-span-1" placeholder="Name" value={newRecipient.name} onChange={e=>setNewRecipient(r=>({...r,name:e.target.value}))}/>
          <input className="input-base text-xs col-span-2" placeholder="email@company.com" value={newRecipient.email} onChange={e=>setNewRecipient(r=>({...r,email:e.target.value}))}/>
          <select className="input-base text-xs" value={newRecipient.role} onChange={e=>setNewRecipient(r=>({...r,role:e.target.value}))}>
            {['ceo','cmo','analyst','viewer'].map(r=><option key={r}>{r}</option>)}
          </select>
        </div>
        <button onClick={addRecipient} disabled={!newRecipient.email} className="btn-secondary text-xs mt-2 w-full"><Plus className="w-3.5 h-3.5"/>Add recipient</button>
      </div>

      {recentSends.length>0&&(
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Recent sends</h3>
          {recentSends.slice(0,5).map((s:any,i:number)=>(
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
              <div><p className="text-sm text-gray-700 dark:text-gray-300">{s.period_label}</p><p className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3"/>{new Date(s.sent_at).toLocaleDateString()}</p></div>
              <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-gray-400"/><span className="text-xs text-gray-500">{s.recipients_count}</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
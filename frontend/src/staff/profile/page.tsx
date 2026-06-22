'use client';
import { useState, useEffect } from 'react';
import { Save, Plus, X, Award, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};
const DEPTS = ['strategy','creative','paid_media','social_media','analytics','content','design','leadership','technology'];
const SENIORITY = ['intern','junior','mid','senior','lead','director'];

export default function StaffProfilePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm]       = useState({ full_name:'', role_title:'', department:'social_media', seniority:'mid', bio:'', value_proposition:'', linkedin_url:'', years_experience:0 });
  const [skills, setSkills]   = useState<string[]>([]);
  const [certs, setCerts]     = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [newCert,  setNewCert]  = useState('');

  useEffect(() => {
    axios.get(`${API}/agency/staff/me`, { headers: hdrs() })
      .then(r => {
        const p = r.data.staff;
        setProfile(p);
        setForm({ full_name: p.full_name||'', role_title: p.role_title||'', department: p.department||'social_media', seniority: p.seniority||'mid', bio: p.bio||'', value_proposition: p.value_proposition||'', linkedin_url: p.linkedin_url||'', years_experience: p.years_experience||0 });
        setSkills(typeof p.skills==='string'?JSON.parse(p.skills||'[]'):(p.skills||[]));
        setCerts(typeof p.certifications==='string'?JSON.parse(p.certifications||'[]'):(p.certifications||[]));
      }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/agency/staff/${profile?.id}`, { ...form, skills, certifications: certs }, { headers: hdrs() });
      toast.success('Profile updated');
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const addTag = (list: string[], setList: any, val: string, setVal: any) => {
    if (!val.trim()) return;
    setList([...list, val.trim()]); setVal('');
  };

  const inp = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }));
  const style = { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff' };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-7">
        <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Staff Portal</p>
        <h1 className="text-2xl font-black text-white">My Profile</h1>
        <p className="text-white/40 text-sm mt-1">This is what clients see when they view your card in their team page.</p>
      </div>

      <div className="space-y-5">
        {/* Basic */}
        <div className="rounded-2xl border p-5 space-y-4" style={{ background:'rgba(255,255,255,0.03)', borderColor:'rgba(255,255,255,0.08)' }}>
          <div className="grid grid-cols-2 gap-4">
            {[{l:'Full name',k:'full_name'},{l:'Role title',k:'role_title'}].map(({l,k})=>(
              <div key={k}>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{color:'#a78bfa'}}>{l}</label>
                <input className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/50" style={style} value={(form as any)[k]} onChange={inp(k)} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[{l:'Department',k:'department',opts:DEPTS},{l:'Seniority',k:'seniority',opts:SENIORITY}].map(({l,k,opts})=>(
              <div key={k}>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{color:'#a78bfa'}}>{l}</label>
                <select className="w-full rounded-xl px-3 py-3 text-sm outline-none" style={{...style,background:'#0f0a2e'}} value={(form as any)[k]} onChange={inp(k)}>
                  {opts.map(o=><option key={o} value={o} style={{background:'#0f0a2e'}}>{o.replace('_',' ')}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{color:'#a78bfa'}}>Years exp.</label>
              <input type="number" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={style} value={form.years_experience} onChange={e=>setForm(f=>({...f,years_experience:parseInt(e.target.value)||0}))} />
            </div>
          </div>
        </div>

        {/* Bio + value prop */}
        <div className="rounded-2xl border p-5 space-y-4" style={{ background:'rgba(255,255,255,0.03)', borderColor:'rgba(255,255,255,0.08)' }}>
          {[{l:'Bio',k:'bio',p:'Your professional background...'},{l:'Value proposition (client-visible)',k:'value_proposition',p:'Why are you uniquely valuable to this brand?'}].map(({l,k,p})=>(
            <div key={k}>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{color:'#a78bfa'}}>{l}</label>
              <textarea rows={3} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-purple-500/50" style={style} placeholder={p} value={(form as any)[k]} onChange={inp(k)} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{color:'#a78bfa'}}>LinkedIn URL</label>
            <input className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={style} placeholder="https://linkedin.com/in/yourname" value={form.linkedin_url} onChange={inp('linkedin_url')} />
          </div>
        </div>

        {/* Skills + certs */}
        {[
          { label:'Skills & expertise', list:skills, setList:setSkills, val:newSkill, setVal:setNewSkill, ph:'Add a skill (press Enter)' },
          { label:'Certifications',     list:certs,  setList:setCerts,  val:newCert,  setVal:setNewCert,  ph:'Add certification (press Enter)' },
        ].map(({ label, list, setList, val, setVal, ph }) => (
          <div key={label} className="rounded-2xl border p-5" style={{ background:'rgba(255,255,255,0.03)', borderColor:'rgba(255,255,255,0.08)' }}>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{color:'#a78bfa'}}>{label}</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {list.map((item,i)=>(
                <span key={i} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full text-purple-300" style={{background:'rgba(109,40,217,0.2)',border:'1px solid rgba(109,40,217,0.3)'}}>
                  {item}<button onClick={()=>setList((l:any)=>l.filter((_:any,j:number)=>j!==i))}><X className="w-3 h-3"/></button>
                </span>
              ))}
            </div>
            <input className="w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={style} placeholder={ph} value={val}
              onChange={e=>setVal(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTag(list,setList,val,setVal);}}} />
          </div>
        ))}

        <button onClick={save} disabled={saving} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{background:'linear-gradient(135deg,#6d28d9,#9333ea)'}}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin"/>Saving…</> : <><Save className="w-4 h-4"/>Save profile</>}
        </button>
      </div>
    </div>
  );
}

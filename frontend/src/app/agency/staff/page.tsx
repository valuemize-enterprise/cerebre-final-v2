'use client';
import { useEffect, useState } from 'react';
import { Plus, Star, Edit2, X, Save, Loader2, Users, Briefcase } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('cm_token')}` });
const DEPTS = ['strategy','creative','paid_media','social_media','analytics','content','design','leadership','technology'];
const BLANK = { full_name:'',email:'',role_title:'',department:'social_media',seniority:'mid',bio:'',avatar_url:'',linkedin_url:'',skills:[],industries:[],certifications:[],years_experience:0,employment_type:'full_time',value_proposition:'' };

export default function StaffAdminPage() {
  const [staff, setStaff]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm]       = useState<any>(BLANK);
  const [saving, setSaving]   = useState(false);

  const load = () => { setLoading(true); axios.get(`${API}/agency/staff`,{headers:hdrs()}).then(r=>setStaff(r.data.staff||[])).catch(console.error).finally(()=>setLoading(false)); };
  useEffect(()=>{load();},[]);

  const open = (s?: any) => { setForm(s?{...s,skills:s.skills||[],industries:s.industries||[],certifications:s.certifications||[]}:BLANK); setEditing(s?.id||null); setShowForm(true); };

  const addTag = (k: string, val: string) => { if(!val.trim())return; setForm((f:any)=>({...f,[k]:[...(f[k]||[]),val.trim()]})); };
  const rmTag  = (k: string, i: number)   => setForm((f:any)=>({...f,[k]:f[k].filter((_:any,j:number)=>j!==i)}));

  const save = async () => {
    if(!form.full_name||!form.email||!form.role_title){toast.error('Name, email, role required');return;}
    setSaving(true);
    try {
      editing ? await axios.put(`${API}/agency/staff/${editing}`,form,{headers:hdrs()}) : await axios.post(`${API}/agency/staff`,form,{headers:hdrs()});
      toast.success(editing?'Profile updated':`${form.full_name} added`);
      setShowForm(false); load();
    } catch(e:any){toast.error(e.response?.data?.error||'Save failed');}
    finally{setSaving(false);}
  };

  const inp = (k: string) => (e: any) => setForm((f:any)=>({...f,[k]:e.target.value}));

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Staff Directory</h1><p className="text-sm text-gray-400 mt-1">{staff.length} team members in the talent database</p></div>
        <button onClick={()=>open()} className="btn-primary"><Plus className="w-4 h-4"/>Add staff member</button>
      </div>

      {showForm&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end">
          <div className="w-full max-w-lg h-full bg-white dark:bg-gray-900 overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">{editing?'Edit':'Add'} staff member</h2>
              <button onClick={()=>setShowForm(false)}><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              {[{l:'Full name *',k:'full_name'},{l:'Email *',k:'email'},{l:'Role title *',k:'role_title'}].map(({l,k})=>(
                <div key={k}><label className="block text-xs font-medium text-gray-500 mb-1">{l}</label><input className="input-base" value={form[k]||''} onChange={inp(k)} placeholder={l.replace(' *','')}/></div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
                  <select className="input-base text-sm" value={form.department} onChange={inp('department')}>{DEPTS.map(d=><option key={d} value={d}>{d.replace('_',' ')}</option>)}</select>
                </div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Seniority</label>
                  <select className="input-base text-sm" value={form.seniority} onChange={inp('seniority')}>{['intern','junior','mid','senior','lead','director','c_level'].map(s=><option key={s} value={s}>{s}</option>)}</select>
                </div>
              </div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Bio</label><textarea rows={2} className="input-base" value={form.bio||''} onChange={inp('bio')} placeholder="Professional background..."/></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Value proposition (shown to clients)</label><textarea rows={2} className="input-base" value={form.value_proposition||''} onChange={inp('value_proposition')} placeholder="Why this person is on your brand's team..."/></div>
              {['skills','industries','certifications'].map(field=>(
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-500 mb-1 capitalize">{field}</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(form[field]||[]).map((t:string,i:number)=>(
                      <span key={i} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">{t}<button onClick={()=>rmTag(field,i)}><X className="w-2.5 h-2.5"/></button></span>
                    ))}
                  </div>
                  <input className="input-base text-sm" placeholder={`Type ${field.slice(0,-1)} and press Enter`}
                    onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTag(field,(e.target as HTMLInputElement).value);(e.target as HTMLInputElement).value=''}}}/>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Avatar URL</label><input className="input-base text-sm" value={form.avatar_url||''} onChange={inp('avatar_url')}/></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Years experience</label><input type="number" className="input-base text-sm" value={form.years_experience||0} onChange={inp('years_experience')}/></div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-gray-900 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={save} disabled={saving} className="btn-primary w-full">
                {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}{editing?'Save changes':'Add to talent database'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading?<div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 text-brand-500 animate-spin"/></div>
      :staff.length===0?(<div className="card text-center py-16 border-dashed"><Users className="w-10 h-10 mx-auto text-gray-300 mb-3"/><p className="text-gray-500 font-medium">No staff added yet</p></div>)
      :(
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((s:any)=>{
            const skills=typeof s.skills==='string'?JSON.parse(s.skills):(s.skills||[]);
            return(
              <div key={s.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {s.avatar_url?<img src={s.avatar_url} className="w-10 h-10 rounded-full object-cover" alt=""/>
                    :<div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{background:'linear-gradient(135deg,#6d28d9,#a78bfa)'}}>{s.full_name?.charAt(0)}</div>}
                    <div><p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{s.full_name}</p><p className="text-xs text-gray-400">{s.role_title}</p></div>
                  </div>
                  <button onClick={()=>open(s)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5"/></button>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 capitalize">{s.department?.replace('_',' ')}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">{s.seniority}</span>
                </div>
                {skills.slice(0,3).map((sk:string)=><span key={sk} className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 mr-1 mb-1">{sk}</span>)}
                {skills.length>3&&<span className="text-[10px] text-gray-400">+{skills.length-3}</span>}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
                  {s.avg_rating>0&&<span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400"/>{parseFloat(s.avg_rating).toFixed(1)}</span>}
                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3"/>{s.active_brands||0} brands</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

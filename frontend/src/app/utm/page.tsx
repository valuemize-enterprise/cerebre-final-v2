'use client';
import { useEffect, useState } from 'react';
import { Link, Plus, Copy, BarChart2, Loader2, ExternalLink, Filter } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function UTMPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ destination_url:'',utm_source:'',utm_medium:'',utm_campaign:'',utm_content:'',name:''});

  useEffect(() => { api.get('/utm').then(({data}) => setLinks(data.links||[])).finally(()=>setLoading(false)); },[]);

  const buildUrl = () => {
    if(!form.destination_url) return '';
    const p = new URLSearchParams();
    if(form.utm_source) p.set('utm_source',form.utm_source);
    if(form.utm_medium) p.set('utm_medium',form.utm_medium);
    if(form.utm_campaign) p.set('utm_campaign',form.utm_campaign);
    if(form.utm_content) p.set('utm_content',form.utm_content);
    return `${form.destination_url}?${p.toString()}`;
  };

  const save = async () => {
    const {data} = await api.post('/utm', { ...form, full_utm_url: buildUrl() });
    setLinks(prev=>[data.link,...prev]);
    setShowNew(false);
    toast.success('UTM link created');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin"/></div>;

  const totalClicks = links.reduce((s,l)=>s+(l.clicks||0),0);
  const totalConversions = links.reduce((s,l)=>s+(l.conversions||0),0);

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">UTM Link Builder</h1>
          <p className="text-sm text-gray-400 mt-1">Build, track, and attribute traffic from every social campaign</p>
        </div>
        <button onClick={()=>setShowNew(true)} className="btn-primary"><Plus className="w-4 h-4"/>Create link</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-brand-600">{links.length}</p><p className="text-xs text-gray-400 mt-1">Active links</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{totalClicks.toLocaleString()}</p><p className="text-xs text-gray-400 mt-1">Total clicks</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-green-600">{totalConversions.toLocaleString()}</p><p className="text-xs text-gray-400 mt-1">Conversions</p></div>
      </div>

      {showNew&&(
        <div className="card p-5 border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/20">
          <h3 className="text-sm font-semibold mb-4">Build UTM link</h3>
          <div className="space-y-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Destination URL *</label><input className="input-base text-xs" placeholder="https://yoursite.com/page" value={form.destination_url} onChange={e=>setForm(f=>({...f,destination_url:e.target.value}))}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Source *</label><input className="input-base text-xs" placeholder="instagram" value={form.utm_source} onChange={e=>setForm(f=>({...f,utm_source:e.target.value}))}/></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Medium *</label><input className="input-base text-xs" placeholder="social" value={form.utm_medium} onChange={e=>setForm(f=>({...f,utm_medium:e.target.value}))}/></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Campaign</label><input className="input-base text-xs" placeholder="ramadan-2025" value={form.utm_campaign} onChange={e=>setForm(f=>({...f,utm_campaign:e.target.value}))}/></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Content/Ad</label><input className="input-base text-xs" placeholder="reel-1" value={form.utm_content} onChange={e=>setForm(f=>({...f,utm_content:e.target.value}))}/></div>
            </div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Link name</label><input className="input-base text-xs" placeholder="Ramadan campaign — Instagram Reel 1" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            {buildUrl()&&<div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg"><p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">{buildUrl()}</p></div>}
            <div className="flex gap-2"><button onClick={save} className="btn-primary flex-1">Create link</button><button onClick={()=>setShowNew(false)} className="btn-secondary">Cancel</button></div>
          </div>
        </div>
      )}

      {links.length===0?(
        <div className="card text-center py-16 border-dashed"><Link className="w-10 h-10 mx-auto text-gray-300 mb-3"/><p className="text-gray-500 font-medium">No UTM links yet</p><p className="text-sm text-gray-400 mt-1">Build links to track exactly which content drives traffic and conversions</p></div>
      ):(
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
              <tr>{['Name','Source','Clicks','Conversions','Revenue','Link'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {links.map(link=>(
                <tr key={link.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 max-w-[180px] truncate">{link.name||link.utm_campaign}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 capitalize">{link.utm_source}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{(link.clicks||0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{(link.conversions||0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-600">₦{parseFloat(link.revenue||0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={()=>{navigator.clipboard.writeText(link.full_utm_url);toast.success('Copied');}} className="text-brand-500 hover:text-brand-700"><Copy className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
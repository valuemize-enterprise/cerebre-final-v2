'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, BarChart2, Loader2, Zap, Star } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('cm_token')}` });

export default function LeadershipDashboard() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    axios.get(`${API}/agency/leadership/overview`, { headers: hdrs() })
      .then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>;
  const { brands=[], topStaff=[], summary={} } = data||{};
  const atRisk  = brands.filter((b:any)=>b.client_health==='red').length;
  const healthy = brands.filter((b:any)=>b.client_health==='green').length;

  return (
    <div className="p-6 max-w-7xl space-y-6">
      <div><div className="flex items-center gap-2 mb-1"><Zap className="w-4 h-4 text-brand-600" /><p className="text-xs font-bold text-brand-600 uppercase tracking-widest">Leadership View</p></div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Portfolio Overview</h1>
        <p className="text-sm text-gray-400 mt-1">{brands.length} active clients — health, team, and satisfaction</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{l:'Total clients',v:summary.totalBrands||0,I:BarChart2,c:'text-brand-500'},{l:'Healthy',v:healthy,I:CheckCircle2,c:'text-green-500'},{l:'At risk',v:atRisk,I:AlertTriangle,c:atRisk>0?'text-red-500':'text-gray-300'},{l:'Avg NPS',v:summary.avgNPS?`${summary.avgNPS}/10`:'—',I:Star,c:'text-amber-500'}].map(({l,v,I,c})=>(
          <div key={l} className="card p-5"><div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{l}</p><I className={clsx('w-4 h-4',c)}/></div><p className="text-2xl font-bold text-gray-900 dark:text-white">{v}</p></div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800"><h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Client health</h2></div>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">{['Brand','Industry','Health','Team','NPS','Tasks',''].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {brands.map((b:any)=>(
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">{b.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs capitalize">{b.industry}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5"><div className={clsx('w-2 h-2 rounded-full',b.client_health==='green'?'bg-green-400':b.client_health==='amber'?'bg-amber-400':'bg-red-400')}/><span className={clsx('text-xs font-medium',b.client_health==='green'?'text-green-600':b.client_health==='amber'?'text-amber-600':'text-red-500')}>{b.health_score?`${Math.round(b.health_score)}/100`:'—'}</span></div></td>
                  <td className="px-4 py-3 text-gray-500">{b.team_size||0}</td>
                  <td className="px-4 py-3">{b.avg_nps?<span className={clsx('font-bold text-xs',parseFloat(b.avg_nps)>=8?'text-green-600':parseFloat(b.avg_nps)>=6?'text-amber-600':'text-red-500')}>{parseFloat(b.avg_nps).toFixed(1)}/10</span>:<span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{b.tasks_this_month||0}</td>
                  <td className="px-4 py-3"><a href={`/agency/brands/${b.id}`} className="text-xs text-brand-600 hover:underline">View →</a></td>
                </tr>
              ))}
              {brands.length===0&&<tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No brands yet — add your first client</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top rated staff</h2>
          {topStaff.length===0?<p className="text-sm text-gray-400 text-center py-8">No ratings yet</p>:(
            <div className="space-y-3">{topStaff.map((s:any,i:number)=>(
              <div key={s.full_name} className="flex items-center gap-3">
                <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0',i===0?'bg-amber-400':i===1?'bg-gray-400':'bg-amber-700/70')}>{i+1}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{s.full_name}</p><p className="text-xs text-gray-400 truncate">{s.role_title}</p></div>
                {s.avg_client_rating>0&&<div className="text-right"><div className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400"/><span className="text-xs font-bold">{parseFloat(s.avg_client_rating).toFixed(1)}</span></div><p className="text-[10px] text-gray-400">{s.total_ratings}</p></div>}
              </div>
            ))}</div>
          )}
        </div>
      </div>
    </div>
  );
}

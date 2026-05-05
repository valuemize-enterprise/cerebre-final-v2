'use client';
import { useEffect, useState } from 'react';
import { Star, Plus, Loader2, TrendingUp, DollarSign, Users, Filter } from 'lucide-react';
import api from '../../lib/api';
import clsx from 'clsx';

const TIER_COLORS: Record<string,string> = { mega:'bg-brand-100 text-brand-700', macro:'bg-blue-100 text-blue-700', mid:'bg-green-100 text-green-700', micro:'bg-amber-100 text-amber-700', nano:'bg-gray-100 text-gray-600' };
const STATUS_COLORS: Record<string,string> = { prospect:'text-gray-500', active:'text-green-600', past:'text-blue-600', negotiating:'text-amber-600', blacklisted:'text-red-600' };

export default function InfluencersPage() {
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { api.get('/influencers').then(({data}) => setInfluencers(data.influencers||[])).finally(()=>setLoading(false)); },[]);

  const filtered = filter==='all'?influencers:influencers.filter(i=>i.status===filter);
  const totalROI = influencers.reduce((s,i)=>s+(parseFloat(i.roi||0)),0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin"/></div>;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Influencer Tracker</h1>
          <p className="text-sm text-gray-400 mt-1">Manage creator relationships and track campaign ROI</p>
        </div>
        <button className="btn-primary" onClick={() => {}}><Plus className="w-4 h-4"/>Add influencer</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-brand-600">{influencers.filter(i=>i.status==='active').length}</p><p className="text-xs text-gray-400 mt-1">Active partnerships</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{influencers.length}</p><p className="text-xs text-gray-400 mt-1">Total contacts</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-green-600">₦{(influencers.reduce((s,i)=>s+parseFloat(i.revenue_attributed||0),0)/1000).toFixed(0)}k</p><p className="text-xs text-gray-400 mt-1">Revenue attributed</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-amber-600">{totalROI.toFixed(0)}%</p><p className="text-xs text-gray-400 mt-1">Avg campaign ROI</p></div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all','prospect','active','negotiating','past'].map(s=>(
          <button key={s} onClick={()=>setFilter(s)} className={clsx('px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors',filter===s?'bg-brand-600 text-white':'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500')}>{s}</button>
        ))}
      </div>

      {filtered.length===0?(
        <div className="card text-center py-16 border-dashed"><Star className="w-10 h-10 mx-auto text-gray-300 mb-3"/><p className="text-gray-500 font-medium">No influencers yet</p><p className="text-sm text-gray-400 mt-1">Track creators, manage rates, and measure campaign ROI</p></div>
      ):(
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(inf=>(
            <div key={inf.id} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{inf.name}</p>
                  <p className="text-xs text-gray-500">{inf.category||'Creator'}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {inf.tier&&<span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium capitalize',TIER_COLORS[inf.tier]||'bg-gray-100 text-gray-600')}>{inf.tier}</span>}
                  <span className={clsx('text-xs font-semibold capitalize',STATUS_COLORS[inf.status]||'text-gray-500')}>{inf.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {inf.total_reach>0&&<div><p className="text-gray-400">Total reach</p><p className="font-semibold text-gray-700 dark:text-gray-300">{(inf.total_reach/1000).toFixed(0)}k</p></div>}
                {inf.avg_er>0&&<div><p className="text-gray-400">Avg ER</p><p className="font-semibold text-gray-700 dark:text-gray-300">{(inf.avg_er*100).toFixed(1)}%</p></div>}
                {inf.revenue_attributed>0&&<div><p className="text-gray-400">Revenue</p><p className="font-semibold text-green-600">₦{parseFloat(inf.revenue_attributed).toLocaleString()}</p></div>}
                {inf.brand_fit_score&&<div><p className="text-gray-400">Brand fit</p><p className="font-semibold text-brand-600">{inf.brand_fit_score}/100</p></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
'use client';
import { useEffect, useState } from 'react';
import { Hash, TrendingUp, TrendingDown, Loader2, RefreshCw, Search } from 'lucide-react';
import api from '../../lib/api';
import clsx from 'clsx';

const DIFFICULTY_COLORS = { low:'text-green-600 bg-green-50', medium:'text-amber-600 bg-amber-50', high:'text-red-600 bg-red-50' };

export default function HashtagsPage() {
  const [hashtags, setHashtags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('instagram');

  useEffect(() => { api.get(`/hashtags?platform=${platform}`).then(({data}) => setHashtags(data.hashtags||[])).finally(()=>setLoading(false)); },[platform]);

  const filtered = search ? hashtags.filter(h=>h.hashtag.toLowerCase().includes(search.toLowerCase())) : hashtags;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin"/></div>;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Hashtag Intelligence</h1>
        <p className="text-sm text-gray-400 mt-1">Discover and optimise hashtags based on your real performance data</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input className="input-base pl-9" placeholder="Search hashtags..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {['instagram','tiktok','twitter','linkedin'].map(p=>(
            <button key={p} onClick={()=>setPlatform(p)} className={clsx('px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors',platform===p?'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm':'text-gray-500')}>{p}</button>
          ))}
        </div>
      </div>

      {filtered.length===0?(
        <div className="card text-center py-16 border-dashed"><Hash className="w-10 h-10 mx-auto text-gray-300 mb-3"/><p className="text-gray-500 font-medium">No hashtag data yet</p><p className="text-sm text-gray-400 mt-1">Upload platform reports to analyse hashtag performance</p></div>
      ):(
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
              <tr>
                {['Hashtag','Posts','Difficulty','Your avg ER','Opportunity','Trend'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.map(tag=>{
                const diff = DIFFICULTY_COLORS[tag.difficulty as keyof typeof DIFFICULTY_COLORS]||DIFFICULTY_COLORS.medium;
                return (
                  <tr key={tag.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-brand-600 dark:text-brand-400">#{tag.hashtag}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{Number(tag.post_count||0).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium capitalize',diff)}>{tag.difficulty||'medium'}</span></td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{tag.brand_avg_er?(parseFloat(tag.brand_avg_er)*100).toFixed(2)+'%':'—'}</td>
                    <td className="px-4 py-3">
                      {tag.opportunity_score&&<div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-brand-500 rounded-full" style={{width:`${tag.opportunity_score}%`}}/></div><span className="text-xs text-gray-500">{tag.opportunity_score}</span></div>}
                    </td>
                    <td className="px-4 py-3">
                      {tag.trend_status==='rising'?<TrendingUp className="w-4 h-4 text-green-500"/>:tag.trend_status==='declining'?<TrendingDown className="w-4 h-4 text-red-400"/>:<span className="text-xs text-gray-400">stable</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
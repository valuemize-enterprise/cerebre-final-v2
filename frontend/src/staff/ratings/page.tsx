'use client';
import { useEffect, useState } from 'react';
import { Star, Loader2, TrendingUp, Award } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const DIMENSIONS = [
  { key:'communication_rating',    label:'Communication'    },
  { key:'quality_rating',          label:'Quality of work'  },
  { key:'responsiveness_rating',   label:'Responsiveness'   },
  { key:'strategic_value_rating',  label:'Strategic value'  },
];

const StarRow = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor:'rgba(255,255,255,0.05)' }}>
    <span className="text-xs text-white/50">{label}</span>
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(s=><Star key={s} className={clsx('w-3.5 h-3.5', s<=value?'fill-amber-400 text-amber-400':'text-white/15')}/>)}
      <span className="text-xs font-bold text-white/60 ml-2">{value?.toFixed(1)||'—'}</span>
    </div>
  </div>
);

export default function StaffRatingsPage() {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/agency/staff/me/ratings`, { headers: hdrs() })
      .then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-purple-400 animate-spin"/></div>;

  const summary = data?.summary || {};
  const ratings = data?.ratings || [];
  const avg     = parseFloat(summary.avg || 0);

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">My Performance</p>
        <h1 className="text-2xl font-black text-white">Client Ratings</h1>
        <p className="text-white/40 text-sm mt-1">Ratings given by the clients you work with, updated monthly.</p>
      </div>

      {/* Summary card */}
      {avg > 0 && (
        <div className="rounded-2xl border p-6 mb-7 flex items-center gap-8" style={{ background:'rgba(245,158,11,0.08)', borderColor:'rgba(245,158,11,0.2)' }}>
          <div className="text-center flex-shrink-0">
            <p className="text-5xl font-black text-amber-400">{avg.toFixed(1)}</p>
            <p className="text-xs font-bold text-amber-400/60 uppercase tracking-wider mt-1">Overall avg</p>
          </div>
          <div className="flex-1">
            {DIMENSIONS.map(d => <StarRow key={d.key} label={d.label} value={parseFloat(summary[d.key]||0)} />)}
          </div>
        </div>
      )}

      {/* Individual ratings */}
      <div>
        <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3">All ratings received</p>
        {ratings.length === 0 ? (
          <div className="text-center py-16">
            <Award className="w-10 h-10 mx-auto text-white/10 mb-3"/>
            <p className="text-white/30 font-semibold">No ratings yet</p>
            <p className="text-white/15 text-sm mt-1">Your first rating will appear here after a client submits feedback</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ratings.map((r: any, i: number) => (
              <div key={i} className="rounded-2xl border p-5" style={{ background:'rgba(255,255,255,0.03)', borderColor:'rgba(255,255,255,0.07)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-white/80">{r.brand_name || 'Brand'}</p>
                    <p className="text-xs text-white/30">{r.rating_period} · {r.rated_by_name || 'Client'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s=><Star key={s} className={clsx('w-4 h-4', s<=r.overall_rating?'fill-amber-400 text-amber-400':'text-white/15')}/>)}
                    <span className="text-sm font-black text-white ml-1">{parseFloat(r.overall_rating).toFixed(1)}</span>
                  </div>
                </div>
                {r.written_feedback && (
                  <p className="text-sm italic text-white/50 leading-relaxed border-l-2 pl-3 border-purple-500/30">"{r.written_feedback}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

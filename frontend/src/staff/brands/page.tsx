'use client';
import { useEffect, useState } from 'react';
import { Building2, ChevronRight, Target, CheckSquare, Zap, Loader2, Star } from 'lucide-react';
import axios from 'axios';
import { Badge } from '@/components';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

export default function StaffBrandsPage() {
  const [brands,  setBrands]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/agency/staff/me/brands`, { headers: hdrs() })
      .then(r => setBrands(r.data.brands || []))
      .catch(() => setBrands([])).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-7">
        <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">My Work</p>
        <h1 className="text-2xl font-black text-white">My Brands</h1>
        <p className="text-white/40 text-sm mt-1">The brands you are assigned to manage. Log tasks and strategies here.</p>
      </div>

      {brands.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 mx-auto text-white/10 mb-3" />
          <p className="text-white/35 font-semibold">No brands assigned yet</p>
          <p className="text-white/20 text-sm mt-1">Your team lead will assign client brands to your account.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {brands.map((b: any) => (
            <a key={b.id} href={`/staff/brands/${b.id}`}
              className="flex items-center gap-4 p-5 rounded-2xl border transition-all group hover:-translate-y-0.5 hover:shadow-lg hover:border-purple-500/30"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'rgba(109,40,217,0.12)', border: '1px solid rgba(109,40,217,0.2)' }}>
                🏢
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-base font-black text-white/90">{b.name}</p>
                  {b.is_lead && <Badge variant="amber">Lead</Badge>}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs capitalize text-white/40">{b.industry || 'Brand'}</span>
                  {b.tasks_this_week > 0 && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckSquare className="w-3 h-3" /> {b.tasks_this_week} task{b.tasks_this_week !== 1 ? 's' : ''} this week
                    </span>
                  )}
                  {b.avg_rating > 0 && (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <Star className="w-3 h-3" /> {parseFloat(b.avg_rating).toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex gap-1.5">
                    <a href={`/staff/brands/${b.id}/tasks`} onClick={e => e.stopPropagation()}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg transition-all hover:scale-105"
                      style={{ background: 'rgba(109,40,217,0.2)', border: '1px solid rgba(109,40,217,0.3)', color: '#c4b5fd' }}>
                      Log task
                    </a>
                    <a href={`/staff/brands/${b.id}/strategy`} onClick={e => e.stopPropagation()}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg transition-all hover:scale-105"
                      style={{ background: 'rgba(5,150,105,0.18)', border: '1px solid rgba(5,150,105,0.3)', color: '#6ee7b7' }}>
                      Strategy
                    </a>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-purple-400 transition-colors" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Star, Building2, CheckSquare, Award, Loader2, BarChart2, TrendingUp } from 'lucide-react';
import { Card, StatCard, Badge, Tabs, TOKENS } from '@/components';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

export default function StaffProfileAgencyView() {
  const { id }     = useParams<{ id: string }>();
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState('overview');

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/agency/staff/${id}`,          { headers: hdrs() }).catch(() => ({ data:{} })),
      axios.get(`${API}/agency/staff/${id}/ratings`,  { headers: hdrs() }).catch(() => ({ data:{} })),
    ]).then(([s, r]) => setData({ ...s.data, ...r.data }))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-purple-400 animate-spin"/></div>;

  const staff   = data?.staff   || {};
  const ratings = data?.ratings || [];
  const summary = data?.summary || {};
  const brands  = data?.brands  || [];

  const skills = typeof staff.skills === 'string' ? JSON.parse(staff.skills || '[]') : (staff.skills || []);
  const certs  = typeof staff.certifications === 'string' ? JSON.parse(staff.certifications || '[]') : (staff.certifications || []);

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <a href="/agency/staff" className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 mb-6 transition-colors"><ArrowLeft className="w-3.5 h-3.5"/>Staff directory</a>

      {/* Profile header */}
      <div className="flex items-start gap-5 mb-7 p-6 rounded-2xl border" style={{ background:'rgba(109,40,217,0.07)', borderColor:'rgba(109,40,217,0.2)' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black flex-shrink-0" style={{ background:'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
          {(staff.full_name || 'S').charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-2xl font-black text-white">{staff.full_name}</h1>
            {summary.avg && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)' }}>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400"/>
                <span className="text-xs font-black text-amber-400">{parseFloat(summary.avg).toFixed(1)}/5</span>
              </div>
            )}
          </div>
          <p className="text-white/50 text-sm">{staff.role_title} · <span className="capitalize">{staff.department?.replace('_',' ')}</span> · {staff.years_experience || 0} yrs exp</p>
          {staff.bio && <p className="text-white/40 text-sm mt-2 leading-relaxed">{staff.bio}</p>}
          {staff.value_proposition && (
            <p className="text-purple-300/60 text-sm mt-1 italic">"{staff.value_proposition}"</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-black text-white">{brands.length}</p>
          <p className="text-xs text-white/30">brands assigned</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
        <StatCard label="Avg rating"      value={summary.avg ? `${parseFloat(summary.avg).toFixed(1)}/5` : '—'} colour="#f59e0b" icon={<Star className="w-5 h-5"/>}/>
        <StatCard label="Total ratings"   value={ratings.length} icon={<Award className="w-5 h-5"/>}/>
        <StatCard label="Tasks this month" value={data?.tasks_this_month || 0} icon={<CheckSquare className="w-5 h-5"/>}/>
        <StatCard label="Brands managed"  value={brands.length} icon={<Building2 className="w-5 h-5"/>}/>
      </div>

      <Tabs tabs={[{key:'overview',label:'Overview'},{key:'ratings',label:'Client ratings'},{key:'brands',label:'Assigned brands'}]} active={tab} onChange={setTab}/>

      <div className="mt-5">
        {tab === 'overview' && (
          <div className="space-y-4">
            {skills.length > 0 && (
              <Card>
                <p className="text-xs font-bold text-white/35 uppercase tracking-wider mb-3">Skills & expertise</p>
                <div className="flex flex-wrap gap-2">{skills.map((s: string) => <span key={s} className="text-xs px-2.5 py-1 rounded-full text-purple-300" style={{ background:'rgba(109,40,217,0.18)', border:'1px solid rgba(109,40,217,0.3)' }}>{s}</span>)}</div>
              </Card>
            )}
            {certs.length > 0 && (
              <Card>
                <p className="text-xs font-bold text-white/35 uppercase tracking-wider mb-3">Certifications</p>
                <div className="flex flex-wrap gap-2">{certs.map((c: string) => <span key={c} className="text-xs px-2.5 py-1 rounded-full text-emerald-300" style={{ background:'rgba(5,150,105,0.15)', border:'1px solid rgba(5,150,105,0.25)' }}>✓ {c}</span>)}</div>
              </Card>
            )}
          </div>
        )}
        {tab === 'ratings' && (
          <div className="space-y-3">
            {ratings.length === 0 ? (
              <div className="text-center py-12"><Star className="w-8 h-8 mx-auto text-white/10 mb-2"/><p className="text-white/30">No ratings yet</p></div>
            ) : ratings.map((r: any, i: number) => (
              <Card key={i}>
                <div className="flex items-start justify-between mb-2">
                  <div><p className="text-sm font-bold text-white/80">{r.brand_name}</p><p className="text-xs text-white/30">{r.rating_period} · {r.rated_by_name}</p></div>
                  <div className="flex items-center gap-1">{[1,2,3,4,5].map(s=><Star key={s} className={clsx('w-4 h-4', s<=r.overall_rating?'fill-amber-400 text-amber-400':'text-white/15')}/>)}</div>
                </div>
                {r.written_feedback && <p className="text-xs italic text-white/45 border-l-2 pl-3" style={{ borderColor:'rgba(109,40,217,0.3)' }}>"{r.written_feedback}"</p>}
              </Card>
            ))}
          </div>
        )}
        {tab === 'brands' && (
          <div className="grid sm:grid-cols-2 gap-4">
            {brands.length === 0
              ? <div className="col-span-2 text-center py-12"><Building2 className="w-8 h-8 mx-auto text-white/10 mb-2"/><p className="text-white/30">No brands assigned</p></div>
              : brands.map((b: any) => (
                <a key={b.id} href={`/clients/${b.id}`}
                  className="flex items-center gap-3 p-4 rounded-xl border hover:border-purple-500/30 transition-all"
                  style={{ background:'rgba(255,255,255,0.03)', borderColor:'rgba(255,255,255,0.08)' }}>
                  <span className="text-xl">🏢</span>
                  <div><p className="text-sm font-semibold text-white/80">{b.name}</p><p className="text-xs text-white/35 capitalize">{b.industry}</p></div>
                  {b.is_lead && <Badge variant="amber" className="ml-auto">Lead</Badge>}
                </a>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

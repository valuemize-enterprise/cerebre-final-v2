'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Flame, Loader2, CheckSquare, TrendingUp, Calendar, Edit2, Target } from 'lucide-react';
import { Card, Badge, Button, StatCard, Tabs, TOKENS } from '@/components';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

export default function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('overview');

  useEffect(() => {
    axios.get(`${API}/campaigns/${campaignId}`, { headers: hdrs() })
      .then(r => setCampaign(r.data.campaign || r.data))
      .catch(() => setCampaign(null))
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-purple-400 animate-spin"/></div>;
  if (!campaign) return <div className="p-8 text-center"><p className="text-white/40">Campaign not found.</p><a href="/campaigns" className="text-purple-400 text-sm mt-2 inline-block hover:underline">← Back to campaigns</a></div>;

  const now   = Date.now();
  const start = new Date(campaign.start_date).getTime();
  const end   = new Date(campaign.end_date).getTime();
  const total = end - start;
  const elapsed = now - start;
  const pct   = campaign.start_date && campaign.end_date ? Math.min(100, Math.max(0, Math.round((elapsed/total)*100))) : 0;
  const days  = campaign.end_date ? Math.max(0, Math.ceil((end - now) / 86400000)) : null;
  const phase = !campaign.start_date ? 'Draft' : now < start ? 'Upcoming' : now > end ? 'Ended' : 'Live';

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-7">
        <a href="/campaigns" className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 mb-4 transition-colors"><ArrowLeft className="w-3.5 h-3.5"/>All campaigns</a>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-black text-white">{campaign.name}</h1>
              <Badge variant={phase === 'Live' ? 'danger' : phase === 'Upcoming' ? 'info' : 'default'}>{phase === 'Live' ? '🔴 Live' : phase}</Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-white/35">
              <span className="capitalize">{campaign.campaign_type?.replace('_',' ')}</span>
              <span>{campaign.brand_name}</span>
              {campaign.start_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/>{new Date(campaign.start_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—'}</span>}
            </div>
          </div>
          <Button variant="secondary" size="sm" icon={<Edit2 className="w-4 h-4"/>}>Edit campaign</Button>
        </div>
      </div>

      {/* Progress bar */}
      {campaign.start_date && campaign.end_date && (
        <Card className="mb-7">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Campaign progress</p>
            <p className="text-xs font-bold text-white/60">{pct}% · {days !== null ? (days > 0 ? `${days} days left` : 'Ended') : '—'}</p>
          </div>
          <div className="h-3 rounded-full" style={{ background:'rgba(255,255,255,0.07)' }}>
            <div className="h-3 rounded-full transition-all duration-700" style={{ width:`${pct}%`, background:phase==='Live'?'linear-gradient(90deg,#6d28d9,#a78bfa)':'rgba(255,255,255,0.2)' }}/>
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-white/25">
            <span>{new Date(campaign.start_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>
            <span>{new Date(campaign.end_date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
        <StatCard label="Budget"         value={campaign.budget_ngn ? `₦${(campaign.budget_ngn/1000).toFixed(0)}K` : '—'} icon={<TrendingUp className="w-5 h-5"/>} />
        <StatCard label="ROI"            value={campaign.roi_percent ? `${campaign.roi_percent}%` : '—'} colour="#059669" icon={<TrendingUp className="w-5 h-5"/>} />
        <StatCard label="Reach"          value={campaign.total_reach ? `${(campaign.total_reach/1000).toFixed(1)}K` : '—'} icon={<Target className="w-5 h-5"/>} colour="#3b82f6" />
        <StatCard label="Tasks logged"   value={campaign.tasks_count || 0} icon={<CheckSquare className="w-5 h-5"/>} colour="#d97706" />
      </div>

      <Tabs tabs={[{key:'overview',label:'Overview'},{key:'tasks',label:'Task log'},{key:'results',label:'Results'}]} active={tab} onChange={setTab}/>

      <div className="mt-5">
        {tab === 'overview' && (
          <div className="space-y-4">
            {campaign.objective && (
              <Card><p className="text-xs font-bold text-white/35 uppercase tracking-wider mb-2">Objective</p><p className="text-sm text-white/65">{campaign.objective}</p></Card>
            )}
            {campaign.description && (
              <Card><p className="text-xs font-bold text-white/35 uppercase tracking-wider mb-2">Brief</p><p className="text-sm text-white/65 leading-relaxed whitespace-pre-line">{campaign.description}</p></Card>
            )}
          </div>
        )}
        {tab === 'tasks' && (
          <div className="text-center py-16">
            <CheckSquare className="w-10 h-10 mx-auto text-white/10 mb-3"/>
            <p className="text-white/30 font-semibold">Task log for this campaign</p>
            <p className="text-white/20 text-sm mt-1">Tasks tagged to this campaign will appear here.</p>
          </div>
        )}
        {tab === 'results' && (
          <div className="text-center py-16">
            <TrendingUp className="w-10 h-10 mx-auto text-white/10 mb-3"/>
            <p className="text-white/30 font-semibold">Results will appear here as the campaign runs</p>
          </div>
        )}
      </div>
    </div>
  );
}

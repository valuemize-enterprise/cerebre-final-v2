'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Rocket, Plus, Filter, ChevronRight, BarChart2,
  Calendar, Target, DollarSign, Users, Loader2,
  Tag, Play, Pause, CheckCircle2,
} from 'lucide-react';
import api from '../../lib/api';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const CAMPAIGN_TYPES = [
  { id: 'awareness',      label: 'Awareness',     color: 'bg-blue-500' },
  { id: 'lead_gen',       label: 'Lead Gen',      color: 'bg-brand-500' },
  { id: 'product_launch', label: 'Launch',        color: 'bg-purple-500' },
  { id: 'seasonal',       label: 'Seasonal',      color: 'bg-amber-500' },
  { id: 'influencer',     label: 'Influencer',    color: 'bg-pink-500' },
  { id: 'paid',           label: 'Paid',          color: 'bg-orange-500' },
  { id: 'organic',        label: 'Organic',       color: 'bg-green-500' },
  { id: 'event',          label: 'Event',         color: 'bg-teal-500' },
  { id: 'crisis_response',label: 'Crisis',        color: 'bg-red-500' },
];

const STATUS_CONFIG = {
  planning:  { label: 'Planning',    bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500' },
  active:    { label: 'Active',      bg: 'bg-green-100 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400' },
  paused:    { label: 'Paused',      bg: 'bg-amber-100 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400' },
  completed: { label: 'Completed',   bg: 'bg-blue-100 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400' },
  cancelled: { label: 'Cancelled',   bg: 'bg-red-100 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400' },
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C', facebook: '#1877F2', tiktok: '#69C9D0',
  twitter: '#1DA1F2', linkedin: '#0A66C2', youtube: '#FF0000',
  google_ads: '#4285F4', email: '#F59E0B', website: '#10B981',
};

const KpiGauge = ({ label, actual, target, format: fmt = 'number' }: any) => {
  const pct = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
  const color = pct >= 90 ? 'bg-green-500' : pct >= 60 ? 'bg-brand-500' : pct >= 30 ? 'bg-amber-500' : 'bg-red-400';
  const displayVal = fmt === 'currency' ? `₦${Number(actual).toLocaleString()}` : fmt === 'pct' ? `${(actual * 100).toFixed(1)}%` : Number(actual).toLocaleString();
  const displayTarget = fmt === 'currency' ? `₦${Number(target).toLocaleString()}` : fmt === 'pct' ? `${(target * 100).toFixed(1)}%` : Number(target).toLocaleString();
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span className="font-medium">{displayVal} / {displayTarget}</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const CampaignCard = ({ campaign }: { campaign: any }) => {
  const type = CAMPAIGN_TYPES.find(t => t.id === campaign.campaign_type);
  const status = STATUS_CONFIG[campaign.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.planning;
  const daysLeft = campaign.end_date ? differenceInDays(new Date(campaign.end_date), new Date()) : null;
  const budgetPct = campaign.total_budget > 0 ? (campaign.spent / campaign.total_budget) * 100 : 0;
  const targets = typeof campaign.kpi_targets === 'string' ? JSON.parse(campaign.kpi_targets) : (campaign.kpi_targets || {});
  const actuals = typeof campaign.kpi_actuals === 'string' ? JSON.parse(campaign.kpi_actuals) : (campaign.kpi_actuals || {});
  const platforms = typeof campaign.platforms === 'string' ? JSON.parse(campaign.platforms) : (campaign.platforms || []);

  return (
    <Link href={`/campaigns/${campaign.id}`} className="card p-5 hover:shadow-md transition-all group block">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {type && (
              <span className={clsx('w-2.5 h-2.5 rounded-full shrink-0', type.color)} />
            )}
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-brand-600 transition-colors">
              {campaign.name}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', status.bg, status.text)}>
              {status.label}
            </span>
            {daysLeft !== null && daysLeft >= 0 && campaign.status === 'active' && (
              <span className={clsx('text-xs', daysLeft <= 3 ? 'text-red-500' : 'text-gray-400')}>
                {daysLeft === 0 ? 'Ends today' : `${daysLeft}d left`}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors shrink-0 ml-2" />
      </div>

      {/* Platforms */}
      {platforms.length > 0 && (
        <div className="flex gap-1.5 mb-4">
          {platforms.map((p: string) => (
            <span key={p} className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
              style={{ background: PLATFORM_COLORS[p] || '#8B5CF6' }}>
              {p[0].toUpperCase()}
            </span>
          ))}
        </div>
      )}

      {/* Budget */}
      {campaign.total_budget > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Budget</span>
            <span>₦{Number(campaign.spent).toLocaleString()} / ₦{Number(campaign.total_budget).toLocaleString()}</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className={clsx('h-full rounded-full transition-all',
              budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-green-500'
            )} style={{ width: `${budgetPct}%` }} />
          </div>
        </div>
      )}

      {/* KPIs */}
      {Object.keys(targets).length > 0 && (
        <div className="space-y-2">
          {Object.entries(targets).slice(0, 2).map(([kpi, target]: [string, any]) => (
            <KpiGauge key={kpi} label={kpi.replace('_', ' ')} actual={actuals[kpi] || 0} target={target}
              format={kpi === 'revenue' ? 'currency' : kpi.includes('rate') ? 'pct' : 'number'} />
          ))}
        </div>
      )}

      {/* Dates */}
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
        <Calendar className="w-3 h-3" />
        {campaign.start_date && format(new Date(campaign.start_date), 'MMM d')}
        {campaign.end_date && ` → ${format(new Date(campaign.end_date), 'MMM d, yyyy')}`}
      </div>
    </Link>
  );
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    api.get('/campaigns').then(({ data }) => setCampaigns(data.campaigns || [])).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter);

  const stats = {
    active: campaigns.filter(c => c.status === 'active').length,
    totalBudget: campaigns.reduce((s, c) => s + Number(c.total_budget || 0), 0),
    totalSpent: campaigns.reduce((s, c) => s + Number(c.spent || 0), 0),
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="text-sm text-gray-400 mt-1">Track every campaign across all platforms in one place</p>
        </div>
        <Link href="/campaigns/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New campaign
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-semibold text-green-600">{stats.active}</p>
          <p className="text-xs text-gray-400 mt-1">Active campaigns</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">₦{(stats.totalBudget / 1000).toFixed(0)}k</p>
          <p className="text-xs text-gray-400 mt-1">Total budget</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-semibold text-brand-600">₦{(stats.totalSpent / 1000).toFixed(0)}k</p>
          <p className="text-xs text-gray-400 mt-1">Total spent</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'active', 'planning', 'paused', 'completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={clsx('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize',
              filter === f ? 'bg-brand-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500'
            )}>
            {f} {f !== 'all' && `(${campaigns.filter(c => c.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16 border-dashed">
          <Rocket className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No campaigns yet</p>
          <p className="text-sm text-gray-400 mt-1">Create a campaign to track performance across platforms</p>
          <Link href="/campaigns/new" className="btn-primary mt-4 inline-flex"><Plus className="w-4 h-4" /> Create first campaign</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => <CampaignCard key={c.id} campaign={c} />)}
        </div>
      )}
    </div>
  );
}

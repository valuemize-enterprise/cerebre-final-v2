'use client';
import { useEffect, useState } from 'react';
import {
  Link2, CheckCircle2, AlertCircle, RefreshCw,
  TrendingUp, TrendingDown, Users, DollarSign,
  Target, Loader2, ExternalLink,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const CRM_OPTIONS = [
  {
    id: 'salesforce',
    label: 'Salesforce',
    logo: '☁️',
    description: 'Connect your Salesforce org to pull pipeline, leads, and customer data',
    docs: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/',
  },
  {
    id: 'hubspot',
    label: 'HubSpot',
    logo: '🔶',
    description: 'Pull contacts, deals, and revenue attribution from HubSpot CRM',
    docs: 'https://developers.hubspot.com/docs/api/overview',
  },
  {
    id: 'zoho',
    label: 'Zoho CRM',
    logo: '🔵',
    description: 'Sync Zoho CRM leads and deal data',
    docs: 'https://www.zoho.com/crm/developer/',
    comingSoon: true,
  },
  {
    id: 'pipedrive',
    label: 'Pipedrive',
    logo: '🟢',
    description: 'Connect your Pipedrive pipeline to track deal attribution',
    docs: 'https://developers.pipedrive.com/',
    comingSoon: true,
  },
];

const MetricCard = ({ label, value, sub, icon: Icon, trend }: any) => (
  <div className="card p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="section-title mb-1">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <Icon className="w-5 h-5 text-gray-400 shrink-0" />
    </div>
    {trend !== undefined && (
      <p className={clsx('text-xs font-medium mt-2 flex items-center gap-1',
        trend >= 0 ? 'text-green-600' : 'text-red-500')}>
        {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(trend).toFixed(1)}% vs last period
      </p>
    )}
  </div>
);

export default function CRMPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [crmMetrics, setCrmMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/crm/connections'),
      api.get('/crm/metrics').catch(() => ({ data: null })),
    ]).then(([connRes, metRes]) => {
      setConnections(connRes.data.connections || []);
      setCrmMetrics(metRes.data?.metrics);
    }).finally(() => setLoading(false));
  }, []);

  const handleConnect = async (platform: string) => {
    try {
      const { data } = await api.get(`/crm/auth-url/${platform}`);
      if (data.authUrl) window.location.href = data.authUrl;
    } catch {
      toast.error('Failed to initiate connection');
    }
  };

  const handleSync = async (connectionId: string, platform: string) => {
    setSyncing(connectionId);
    try {
      await api.post(`/crm/sync/${connectionId}`);
      toast.success(`${platform} synced successfully`);
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(null);
    }
  };

  const isConnected = (platform: string) => connections.some(c => c.platform === platform && c.status === 'connected');
  const getConnection = (platform: string) => connections.find(c => c.platform === platform);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">CRM Integration</h1>
        <p className="text-sm text-gray-400 mt-1">Connect your CRM to track how social media drives pipeline and reduces churn</p>
      </div>

      {/* CRM connection cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {CRM_OPTIONS.map(crm => {
          const connected = isConnected(crm.id);
          const conn = getConnection(crm.id);
          return (
            <div key={crm.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{crm.logo}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{crm.label}</p>
                    {connected && conn?.last_sync_at && (
                      <p className="text-xs text-gray-400">
                        Last synced: {new Date(conn.last_sync_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                {connected
                  ? <span className="badge-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Connected</span>
                  : crm.comingSoon
                  ? <span className="badge-neutral">Coming soon</span>
                  : null
                }
              </div>
              <p className="text-xs text-gray-500 mb-4">{crm.description}</p>
              <div className="flex gap-2">
                {connected ? (
                  <>
                    <button
                      onClick={() => conn && handleSync(conn.id, crm.label)}
                      disabled={syncing === conn?.id}
                      className="btn-secondary text-xs py-1.5 flex-1">
                      {syncing === conn?.id
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing...</>
                        : <><RefreshCw className="w-3.5 h-3.5" /> Sync now</>}
                    </button>
                    <button className="btn-secondary text-xs py-1.5 text-red-500">Disconnect</button>
                  </>
                ) : crm.comingSoon ? (
                  <button disabled className="btn-secondary text-xs py-1.5 flex-1 opacity-50">
                    Coming soon
                  </button>
                ) : (
                  <button onClick={() => handleConnect(crm.id)} className="btn-primary text-xs py-1.5 flex-1">
                    <Link2 className="w-3.5 h-3.5" /> Connect {crm.label}
                  </button>
                )}
                <a href={crm.docs} target="_blank" rel="noopener noreferrer"
                  className="btn-secondary text-xs py-1.5 px-2.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* CRM Metrics */}
      {crmMetrics ? (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Customer metrics</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard label="Win rate" value={`${(parseFloat(crmMetrics.win_rate || 0) * 100).toFixed(1)}%`}
              sub="Deals closed won" icon={Target} />
            <MetricCard label="New customers" value={Number(crmMetrics.new_customers).toLocaleString()}
              sub="This period" icon={Users} />
            <MetricCard label="Avg deal size" value={`₦${Number(crmMetrics.avg_deal_size || 0).toLocaleString()}`}
              icon={DollarSign} />
            <MetricCard label="Churn rate" value={`${(parseFloat(crmMetrics.churn_rate || 0) * 100).toFixed(1)}%`}
              sub="Customer churn" icon={TrendingDown}
              trend={crmMetrics.churn_rate < 0.05 ? 1 : -1} />
          </div>

          {/* Pipeline */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Pipeline overview</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total pipeline', value: `₦${Number(crmMetrics.total_pipeline_value || 0).toLocaleString()}` },
                { label: 'Opportunities', value: Number(crmMetrics.new_opportunities || 0).toLocaleString() },
                { label: 'Closed won', value: Number(crmMetrics.closed_won || 0).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
                  <p className="text-xs text-gray-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Social attribution */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Social media attribution</h3>
            <p className="text-xs text-gray-400 mb-4">How social activity drives your CRM pipeline</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-brand-50 dark:bg-brand-950/20 rounded-lg border border-brand-100 dark:border-brand-800">
                <p className="section-title text-brand-600">Social-attributed leads</p>
                <p className="text-2xl font-semibold text-brand-700 dark:text-brand-300 mt-1">
                  {Number(crmMetrics.social_attributed_leads || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-100 dark:border-green-900">
                <p className="section-title text-green-600">Social-attributed revenue</p>
                <p className="text-2xl font-semibold text-green-700 dark:text-green-300 mt-1">
                  ₦{Number(crmMetrics.social_attributed_revenue || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center py-14 border-dashed">
          <Link2 className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No CRM connected yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Connect Salesforce or HubSpot to see how social media drives pipeline, reduces churn, and lowers acquisition costs
          </p>
        </div>
      )}
    </div>
  );
}

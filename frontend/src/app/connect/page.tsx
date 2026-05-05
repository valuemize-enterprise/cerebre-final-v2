'use client';
import { useEffect, useState } from 'react';
import {
  CheckCircle2, AlertCircle, RefreshCw, Link2, Unlink,
  Clock, Loader2, ExternalLink, Zap, Info,
} from 'lucide-react';
import api from '../../lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PLATFORMS = [
  {
    id: 'instagram',      label: 'Instagram',            icon: '📸', color: '#E1306C',
    group: 'Meta',
    description: 'Followers, Reels views, Stories, reach, engagement rate, bio link clicks',
    howToConnect: 'Requires a Facebook Business account linked to an Instagram Business/Creator account',
    dataFrequency: 'Every hour',
    metrics: ['Impressions','Reach','Followers','Reels views','Profile visits','Stories views','Engagement rate'],
  },
  {
    id: 'facebook',       label: 'Facebook Page',        icon: '👥', color: '#1877F2',
    group: 'Meta',
    description: 'Page reach, impressions, fans, video views, organic vs paid split',
    howToConnect: 'Login with the Facebook account that manages your Business Page',
    dataFrequency: 'Every hour',
    metrics: ['Page impressions','Organic reach','Page fans','Video views','Engagements','Ad performance'],
  },
  {
    id: 'tiktok',         label: 'TikTok Business',      icon: '🎵', color: '#69C9D0',
    group: 'Social',
    description: 'Video views, completion rate, FYP distribution, follower analytics',
    howToConnect: 'TikTok Business Center account required',
    dataFrequency: 'Every 4 hours',
    metrics: ['Video views','Completion rate','Follower count','Profile views','Reach'],
  },
  {
    id: 'linkedin',       label: 'LinkedIn Company Page', icon: '💼', color: '#0A66C2',
    group: 'Social',
    description: 'Page followers, post impressions, visitor demographics, ad performance',
    howToConnect: 'Must be a Super Admin or Content Admin of the Company Page',
    dataFrequency: 'Every 4 hours',
    metrics: ['Post impressions','Followers','Page views','Clicks','Engagement rate'],
  },
  {
    id: 'twitter',        label: 'Twitter / X',           icon: '🐦', color: '#1DA1F2',
    group: 'Social',
    description: 'Impressions, profile visits, mentions, follower metrics',
    howToConnect: 'Twitter Developer App with Read access required',
    dataFrequency: 'Every 2 hours',
    metrics: ['Impressions','Followers','Likes','Retweets','Mentions'],
    note: 'Full analytics require Twitter Basic tier ($100/month)',
  },
  {
    id: 'youtube',        label: 'YouTube Channel',       icon: '▶️', color: '#FF0000',
    group: 'Social',
    description: 'Views, watch time, subscribers, CTR, revenue estimates',
    howToConnect: 'Google account with ownership of the YouTube channel',
    dataFrequency: 'Every 4 hours',
    metrics: ['Views','Watch time','Subscribers','Avg view duration','CTR'],
  },
  {
    id: 'google_analytics', label: 'Google Analytics 4', icon: '📊', color: '#4285F4',
    group: 'Google',
    description: 'Website sessions, users, conversions, revenue, traffic sources, real-time users',
    howToConnect: 'Google account with Viewer access to the GA4 property',
    dataFrequency: 'Every 30 minutes + real-time',
    metrics: ['Sessions','Users','Bounce rate','Conversions','Revenue','Real-time users'],
  },
  {
    id: 'google_ads',     label: 'Google Ads',            icon: '🔍', color: '#34A853',
    group: 'Google',
    description: 'Campaign performance, ROAS, quality scores, impression share, wasted spend',
    howToConnect: 'Google account with access to the Google Ads account',
    dataFrequency: 'Every hour',
    metrics: ['Impressions','Clicks','Spend','ROAS','CPA','Quality Score','Impression share'],
  },
  {
    id: 'google_my_business', label: 'Google Business Profile', icon: '📍', color: '#FBBC04',
    group: 'Google',
    description: 'Reviews, ratings, directions requests, calls, website visits',
    howToConnect: 'Google account with ownership of Business Profile locations',
    dataFrequency: 'Every 6 hours',
    metrics: ['Avg rating','New reviews','Review response rate','Direction requests','Calls'],
  },
];

const GROUP_LABELS = {
  Meta: '📘 Meta Platforms',
  Social: '🌐 Social Networks',
  Google: '🔵 Google Platforms',
};

type StatusType = 'connected' | 'expired' | 'error' | 'disconnected';

const StatusBadge = ({ status }: { status: StatusType }) => {
  const configs = {
    connected: { icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-100 dark:bg-green-950/20 dark:border-green-900', label: 'Connected' },
    expired:   { icon: AlertCircle, color: 'text-amber-600 bg-amber-50 border-amber-100', label: 'Token expired' },
    error:     { icon: AlertCircle, color: 'text-red-600 bg-red-50 border-red-100', label: 'Error' },
    disconnected: { icon: Link2, color: 'text-gray-400 bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700', label: 'Not connected' },
  };
  const cfg = configs[status] || configs.disconnected;
  const Icon = cfg.icon;
  return (
    <span className={clsx('flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border', cfg.color)}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
};

export default function ConnectPlatformsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    api.get('/platform-connections').then(({ data }) => {
      setConnections(data.connections || []);
    }).finally(() => setLoading(false));
  }, []);

  // Handle OAuth redirect (callback)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const platform = urlParams.get('platform_connected');
    if (platform) {
      toast.success(`${platform} connected successfully! Syncing data...`);
      window.history.replaceState({}, '', '/connect');
      api.get('/platform-connections').then(({ data }) => setConnections(data.connections || []));
    }
    const error = urlParams.get('connection_error');
    if (error) {
      toast.error(`Connection failed: ${error}`);
      window.history.replaceState({}, '', '/connect');
    }
  }, []);

  const getConnection = (platformId: string) =>
    connections.find(c => c.platform === platformId);

  const handleConnect = async (platform: string) => {
    try {
      const { data } = await api.get(`/platform-connections/auth-url/${platform}`);
      window.location.href = data.authUrl;
    } catch {
      toast.error('Failed to start connection');
    }
  };

  const handleSync = async (platformId: string, connectionId: string) => {
    setSyncing(platformId);
    try {
      await api.post(`/platform-connections/sync/${connectionId}`);
      toast.success('Sync triggered — data will appear shortly');
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (connectionId: string, platformLabel: string) => {
    if (!confirm(`Disconnect ${platformLabel}? Data already collected will be preserved.`)) return;
    try {
      await api.delete(`/platform-connections/${connectionId}`);
      setConnections(prev => prev.filter(c => c.id !== connectionId));
      toast.success(`${platformLabel} disconnected`);
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  const connectedCount = connections.filter(c => c.status === 'connected').length;
  const groups = [...new Set(PLATFORMS.map(p => p.group))];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Connect Platforms</h1>
          <p className="text-sm text-gray-400 mt-1">
            Connect once — data syncs automatically. No more manual report downloads.
          </p>
        </div>
        <div className="card px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{connectedCount}/{PLATFORMS.length}</p>
            <p className="text-xs text-gray-400">platforms connected</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-brand-50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-800 rounded-xl flex gap-3">
        <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <div className="text-sm text-brand-800 dark:text-brand-300">
          <strong>How it works:</strong> Click "Connect" — you'll be taken to that platform's login page. Grant Cerebre read-only access. You'll be redirected back here. Data syncs automatically every hour, no further action needed. Cerebre never posts on your behalf.
        </div>
      </div>

      {groups.map(group => (
        <div key={group}>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
             {GROUP_LABELS[group as keyof typeof GROUP_LABELS] || group}
          </h2>
          <div className="grid gap-3">
            {PLATFORMS.filter(p => p.group === group).map(platform => {
              const conn = getConnection(platform.id);
              const isConnected = conn?.status === 'connected';
              const isSyncing = syncing === platform.id;

              return (
                <div key={platform.id}
                  className={clsx('card overflow-hidden transition-all',
                    isConnected ? 'border-green-200 dark:border-green-900' : ''
                  )}>
                  <div className="flex items-start gap-4 p-5">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl"
                      style={{ background: `${platform.color}18` }}>
                      {platform.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{platform.label}</h3>
                        <StatusBadge status={conn?.status || 'disconnected'} />
                        {platform.note && (
                          <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-100">
                            ⚠ {platform.note}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{platform.description}</p>

                      {/* Connected detail */}
                      {isConnected && conn && (
                        <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                          {conn.account_name && <span className="font-medium text-gray-600 dark:text-gray-300">{conn.account_name}</span>}
                          {conn.last_sync_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Last synced {formatDistanceToNow(new Date(conn.last_sync_at), { addSuffix: true })}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-green-500" />
                            {platform.dataFrequency}
                          </span>
                        </div>
                      )}

                      {/* Not connected: show what metrics we'll get */}
                      {!isConnected && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {platform.metrics.map(m => (
                            <span key={m} className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full">{m}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isConnected ? (
                        <>
                          <button
                            onClick={() => handleSync(platform.id, conn.id)}
                            disabled={isSyncing}
                            className="btn-secondary text-xs py-1.5">
                            {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Sync now
                          </button>
                          <button
                            onClick={() => handleDisconnect(conn.id, platform.label)}
                            className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                            <Unlink className="w-3.5 h-3.5" /> Disconnect
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleConnect(platform.id)}
                          className="btn-primary text-xs py-1.5">
                          <Link2 className="w-3.5 h-3.5" /> Connect
                        </button>
                      )}
                    </div>
                  </div>

                  {/* How to connect (collapsed helper) */}
                  {!isConnected && (
                    <div className="px-5 pb-4 pt-0">
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Info className="w-3 h-3 shrink-0" />
                        {platform.howToConnect}
                      </p>
                    </div>
                  )}

                  {/* Error state */}
                  {conn?.status === 'error' && conn.last_error && (
                    <div className="mx-5 mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-lg">
                      <p className="text-xs text-red-600">{conn.last_error}</p>
                      <button onClick={() => handleConnect(platform.id)} className="text-xs text-red-700 font-semibold mt-1 hover:underline">
                        Reconnect →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

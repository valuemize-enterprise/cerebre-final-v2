'use client';
import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Building2, AlertTriangle, Zap } from 'lucide-react';
import { PageHeader, Card, Badge, Button, SearchInput, TOKENS } from '@/components';
import axios from 'axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const PLATFORMS = [
  { id: 'instagram',  name: 'Instagram',     icon: '📸', colour: '#E1306C', bg: 'rgba(225,48,108,0.12)',  desc: 'Posts, Stories, Reels, and audience insights' },
  { id: 'facebook',   name: 'Facebook',      icon: '👥', colour: '#1877F2', bg: 'rgba(24,119,242,0.12)', desc: 'Pages, ads, and engagement metrics' },
  { id: 'tiktok',     name: 'TikTok',        icon: '🎵', colour: '#010101', bg: 'rgba(255,255,255,0.08)', desc: 'Video performance and audience demographics' },
  { id: 'twitter',    name: 'X / Twitter',   icon: '🐦', colour: '#14171A', bg: 'rgba(255,255,255,0.08)', desc: 'Tweet analytics and follower trends' },
  { id: 'linkedin',   name: 'LinkedIn',      icon: '💼', colour: '#0A66C2', bg: 'rgba(10,102,194,0.12)', desc: 'Company page and post performance' },
  { id: 'youtube',    name: 'YouTube',       icon: '▶️', colour: '#FF0000', bg: 'rgba(255,0,0,0.12)',    desc: 'Video views, subscribers, and watch time' },
  { id: 'google_analytics', name: 'Google Analytics', icon: '📊', colour: '#E37400', bg: 'rgba(227,116,0,0.12)', desc: 'Website traffic, sessions, and conversions' },
  { id: 'google_ads', name: 'Google Ads',    icon: '💰', colour: '#4285F4', bg: 'rgba(66,133,244,0.12)', desc: 'Campaign spend, clicks, and conversion rates' },
];

interface Connection {
  platform: string;
  brand_id: string;
  brand_name: string;
  status: 'connected' | 'expired' | 'error';
  last_synced: string | null;
  account_name?: string;
}

export default function ConnectPage() {
  const [brands,       setBrands]      = useState<any[]>([]);
  const [connections,  setConnections] = useState<Connection[]>([]);
  const [brandFilter,  setBrandFilter] = useState('');
  const [search,       setSearch]      = useState('');
  const [syncing,      setSyncing]     = useState<string>('');
  const [loading,      setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/admin/brands`,           { headers: hdrs() }).catch(() => ({ data: { brands: [] } })),
      axios.get(`${API}/platform-connections`,   { headers: hdrs() }).catch(() => ({ data: { connections: [] } })),
    ]).then(([b, c]) => {
      setBrands(b.data.brands || []);
      setConnections(c.data.connections || []);
    }).finally(() => setLoading(false));
  }, []);

  const getConn = (platform: string, brandId: string) =>
    connections.find(c => c.platform === platform && c.brand_id === brandId);

  const connect = async (platform: string, brandId: string) => {
    if (!brandId) { toast.error('Select a brand first'); return; }
    setSyncing(`${platform}-${brandId}`);
    try {
      const { data } = await axios.post(`${API}/platform-connections/connect`, { platform, brand_id: brandId }, { headers: hdrs() });
      if (data.auth_url) {
        // OAuth redirect
        window.location.href = data.auth_url;
      } else {
        setConnections(prev => {
          const without = prev.filter(c => !(c.platform === platform && c.brand_id === brandId));
          return [...without, { platform, brand_id: brandId, brand_name: brands.find(b => b.id === brandId)?.name || '', status: 'connected', last_synced: new Date().toISOString() }];
        });
        toast.success(`${platform} connected!`);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Connection failed');
    } finally { setSyncing(''); }
  };

  const syncNow = async (platform: string, brandId: string) => {
    setSyncing(`sync-${platform}-${brandId}`);
    try {
      await axios.post(`${API}/platform-connections/sync`, { platform, brand_id: brandId }, { headers: hdrs() });
      setConnections(prev => prev.map(c => c.platform === platform && c.brand_id === brandId ? { ...c, last_synced: new Date().toISOString() } : c));
      toast.success('Synced!');
    } catch { toast.error('Sync failed'); } finally { setSyncing(''); }
  };

  const disconnect = async (platform: string, brandId: string) => {
    if (!confirm(`Disconnect ${platform} from this brand?`)) return;
    await axios.delete(`${API}/platform-connections/${platform}/${brandId}`, { headers: hdrs() }).catch(() => {});
    setConnections(prev => prev.filter(c => !(c.platform === platform && c.brand_id === brandId)));
    toast.success('Disconnected');
  };

  const filteredBrands = brandFilter ? brands.filter(b => b.id === brandFilter) : brands;
  const filteredPlatforms = search ? PLATFORMS.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : PLATFORMS;

  const totalConnected = connections.filter(c => c.status === 'connected').length;
  const totalExpired   = connections.filter(c => c.status !== 'connected').length;

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <PageHeader
        eyebrow="Integrations"
        title="Connect Platforms"
        subtitle="Link social media and analytics accounts to start pulling live data into Sabi."
      />

      {/* Summary */}
      <div className="flex items-center gap-6 mb-7 p-4 rounded-xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: TOKENS.border }}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-white/70">{totalConnected} active connections</span>
        </div>
        {totalExpired > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-300/70">{totalExpired} need attention</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search platforms…" className="w-52" />
        <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
          className="text-sm rounded-xl px-4 py-2.5 outline-none min-w-[200px]"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
          <option value="">All brands</option>
          {brands.map(b => <option key={b.id} value={b.id} style={{ background: '#0f0a2e' }}>{b.name}</option>)}
        </select>
      </div>

      {/* Platform cards */}
      <div className="space-y-4">
        {filteredPlatforms.map(platform => (
          <Card key={platform.id} padding="none">
            {/* Platform header */}
            <div className="flex items-center gap-4 p-5 border-b" style={{ borderColor: TOKENS.border }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: platform.bg }}>
                {platform.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-white">{platform.name}</p>
                <p className="text-xs text-white/40">{platform.desc}</p>
              </div>
              <div className="text-xs font-semibold text-white/30">
                {connections.filter(c => c.platform === platform.id && c.status === 'connected').length} brands connected
              </div>
            </div>

            {/* Per-brand rows */}
            <div className="divide-y" style={{ borderColor: TOKENS.border }}>
              {(brandFilter ? filteredBrands : brands).map(brand => {
                const conn = getConn(platform.id, brand.id);
                const key  = `${platform.id}-${brand.id}`;
                const isSyncing = syncing === `sync-${key}` || syncing === key;
                return (
                  <div key={brand.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>🏢</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white/70">{brand.name}</p>
                      {conn?.account_name && <p className="text-xs text-white/30">{conn.account_name}</p>}
                      {conn?.last_synced && <p className="text-[10px] text-white/25">Last sync: {new Date(conn.last_synced).toLocaleDateString('en-GB', { day:'numeric',month:'short',hour:'2-digit',minute:'2-digit' })}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {conn ? (
                        <>
                          <Badge variant={conn.status === 'connected' ? 'success' : 'warning'} dot>
                            {conn.status === 'connected' ? 'Connected' : 'Token expired'}
                          </Badge>
                          {conn.status === 'connected' && (
                            <button onClick={() => syncNow(platform.id, brand.id)} disabled={!!syncing}
                              className="p-1.5 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/5 transition-colors">
                              <RefreshCw className={clsx('w-3.5 h-3.5', isSyncing && 'animate-spin')} />
                            </button>
                          )}
                          {conn.status !== 'connected' && (
                            <Button variant="secondary" size="xs" loading={isSyncing} onClick={() => connect(platform.id, brand.id)}>Reconnect</Button>
                          )}
                          <button onClick={() => disconnect(platform.id, brand.id)}
                            className="p-1.5 rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <Button size="xs" loading={isSyncing} onClick={() => connect(platform.id, brand.id)}>
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* Auto-sync notice */}
      <div className="mt-6 p-4 rounded-xl border flex items-start gap-3 text-sm" style={{ background: 'rgba(109,40,217,0.06)', borderColor: 'rgba(109,40,217,0.2)', color: 'rgba(167,139,250,0.7)' }}>
        <Zap className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-400" />
        <p>Connected platforms sync automatically every hour. Data populates in your clients' dashboards within a few minutes of connection.</p>
      </div>
    </div>
  );
}

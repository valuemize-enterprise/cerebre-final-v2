'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Trash2, Loader2, ArrowLeft, Search, ExternalLink, RefreshCw, Radar } from 'lucide-react';
import { PageHeader, Card, Badge, Button, Input, EmptyState, Modal, Confirm, TOKENS } from '@/components';
import axios from 'axios';
import toast from 'react-hot-toast';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const PLATFORM_ICONS: Record<string,string> = {
  instagram:'📸', facebook:'👥', tiktok:'🎵', twitter:'🐦',
  linkedin:'💼', youtube:'▶️', website:'🌐',
};

const PLATFORMS = [
  {value:'instagram',label:'Instagram'},{value:'facebook',label:'Facebook'},
  {value:'tiktok',label:'TikTok'},{value:'twitter',label:'X/Twitter'},
  {value:'linkedin',label:'LinkedIn'},{value:'youtube',label:'YouTube'},
  {value:'website',label:'Website'},
];

interface Competitor {
  id: string;
  name: string;
  platform: string;
  handle: string;
  profile_url: string;
  followers: number;
  engagement_rate: number;
  last_synced: string;
  is_active: boolean;
}

export default function BrandCompetitorsPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const [brand,       setBrand]       = useState<any>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(false);
  const [syncing,     setSyncing]     = useState('');
  const [deleteId,    setDeleteId]    = useState<string|null>(null);
  const [saving,      setSaving]      = useState(false);

  const [form, setForm] = useState({
    name: '', platform: 'instagram', handle: '', profile_url: '',
  });

  const load = async () => {
    setLoading(true);
    await Promise.all([
      axios.get(`${API}/admin/brands/${brandId}`,            { headers: hdrs() }).then(r => setBrand(r.data.brand || r.data)).catch(() => {}),
      axios.get(`${API}/client/depth-view?brand_id=${brandId}`, { headers: hdrs() }).then(r => setCompetitors(r.data.competitors || [])).catch(() => {}),
    ]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [brandId]);

  const addCompetitor = async () => {
    if (!form.name || !form.handle) { toast.error('Enter competitor name and handle'); return; }
    setSaving(true);
    try {
      const { data } = await axios.post(`${API}/agency/brands/${brandId}/competitors`, { ...form, brand_id: brandId }, { headers: hdrs() });
      setCompetitors(c => [...c, data.competitor || data]);
      setModal(false);
      setForm({ name:'', platform:'instagram', handle:'', profile_url:'' });
      toast.success('Competitor added — ARIA will start tracking them');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); } finally { setSaving(false); }
  };

  const syncCompetitor = async (competitorId: string) => {
    setSyncing(competitorId);
    try {
      await axios.post(`${API}/agency/brands/${brandId}/competitors/${competitorId}/sync`, {}, { headers: hdrs() });
      await load();
      toast.success('Synced!');
    } catch { toast.error('Sync failed'); } finally { setSyncing(''); }
  };

  const deleteCompetitor = async () => {
    if (!deleteId) return;
    await axios.delete(`${API}/agency/brands/${brandId}/competitors/${deleteId}`, { headers: hdrs() }).catch(() => {});
    setCompetitors(c => c.filter(x => x.id !== deleteId));
    setDeleteId(null);
    toast.success('Competitor removed');
  };

  const fmtNum = (n: any) => {
    const num = parseFloat(n);
    if (isNaN(num)) return '—';
    if (num >= 1000000) return `${(num/1000000).toFixed(1)}M`;
    if (num >= 1000)    return `${(num/1000).toFixed(1)}K`;
    return Math.round(num).toLocaleString();
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <PageHeader
        back={`/clients/${brandId}`}
        eyebrow={brand?.name}
        title="Competitor tracking"
        subtitle="Brands ARIA monitors to power DepthView™ in the client portal"
        actions={<Button icon={<Plus className="w-4 h-4"/>} onClick={() => setModal(true)}>Add competitor</Button>}
      />

      {/* DepthView explainer */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border mb-7"
        style={{ background:'rgba(109,40,217,0.07)', borderColor:'rgba(109,40,217,0.2)' }}>
        <Radar className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5"/>
        <div>
          <p className="text-sm font-bold text-purple-300">DepthView™ tracking</p>
          <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
            ARIA monitors each competitor's public metrics daily and surfaces comparison data inside the client portal. Add the brands your client competes with directly — up to 8 competitors per brand.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center h-48 items-center"><Loader2 className="w-8 h-8 text-purple-400 animate-spin"/></div>
      ) : competitors.length === 0 ? (
        <EmptyState icon={<Radar className="w-8 h-8"/>}
          title="No competitors tracked yet"
          description="Add competitor brands to start powering DepthView™ in your client's portal."
          action={<Button icon={<Plus className="w-4 h-4"/>} onClick={() => setModal(true)}>Add first competitor</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {competitors.map(c => (
            <Card key={c.id}>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{PLATFORM_ICONS[c.platform] || '🔗'}</span>
                  <div>
                    <p className="text-sm font-black text-white/85">{c.name}</p>
                    <p className="text-xs text-white/35">@{c.handle} · {c.platform}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => syncCompetitor(c.id)} disabled={!!syncing}
                    className="p-1.5 rounded-lg text-white/25 hover:text-white/55 hover:bg-white/5 transition-colors">
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing === c.id ? 'animate-spin' : ''}`}/>
                  </button>
                  {c.profile_url && (
                    <a href={c.profile_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-white/25 hover:text-white/55 hover:bg-white/5 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5"/>
                    </a>
                  )}
                  <button onClick={() => setDeleteId(c.id)}
                    className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  { l:'Followers',   v: fmtNum(c.followers)      },
                  { l:'Engagement',  v: c.engagement_rate ? `${parseFloat(String(c.engagement_rate)).toFixed(1)}%` : '—' },
                ].map(({ l, v }) => (
                  <div key={l} className="rounded-xl p-3 text-center" style={{ background:'rgba(255,255,255,0.04)' }}>
                    <p className="text-sm font-black text-white">{v}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{l}</p>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-white/20">
                {c.last_synced ? `Last synced ${new Date(c.last_synced).toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}` : 'Not yet synced'}
              </p>
            </Card>
          ))}

          {/* Add competitor tile */}
          {competitors.length < 8 && (
            <button onClick={() => setModal(true)}
              className="rounded-2xl border border-dashed flex flex-col items-center justify-center gap-3 p-8 transition-all hover:border-purple-500/50 hover:bg-purple-900/10 min-h-[140px]"
              style={{ borderColor:'rgba(109,40,217,0.25)', background:'rgba(109,40,217,0.04)' }}>
              <Plus className="w-8 h-8 text-purple-400/50"/>
              <p className="text-sm font-semibold text-white/40">Add competitor</p>
            </button>
          )}
        </div>
      )}

      {/* Add modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add competitor" width="480px">
        <div className="p-6 space-y-4">
          <Input label="Competitor brand name *" placeholder="e.g. Zenith Bank" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>Platform *</label>
              <select className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ background:'#0f0a2e', border:'1px solid rgba(255,255,255,0.1)', color:'#fff' }}
                value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                {PLATFORMS.map(p => <option key={p.value} value={p.value} style={{ background:'#0f0a2e' }}>{p.label}</option>)}
              </select>
            </div>
            <Input label="Handle / username *" placeholder="@zenithbank" value={form.handle} onChange={e => setForm(f => ({ ...f, handle: e.target.value.replace('@','') }))} />
          </div>
          <Input label="Profile URL (optional)" placeholder="https://instagram.com/zenithbank" value={form.profile_url} onChange={e => setForm(f => ({ ...f, profile_url: e.target.value }))} />
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" full onClick={() => setModal(false)}>Cancel</Button>
            <Button full loading={saving} onClick={addCompetitor} disabled={!form.name || !form.handle}>
              Add and track
            </Button>
          </div>
        </div>
      </Modal>

      <Confirm
        open={!!deleteId}
        title="Remove competitor?"
        message="ARIA will stop tracking this brand. Their historical comparison data will also be removed from the client portal."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={deleteCompetitor}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Save, Loader2, ArrowLeft, Building2, Trash2, AlertTriangle
} from 'lucide-react';
import { PageHeader, Card, Input, Select, Confirm, Callout, TOKENS } from '@/components';
import axios from 'axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const INDUSTRIES = [
  {value:'banking',label:'Banking & Finance'},{value:'fmcg',label:'FMCG & Consumer Goods'},
  {value:'telecom',label:'Telecom'},{value:'real_estate',label:'Real estate'},
  {value:'restaurant',label:'Restaurant & Food'},{value:'fashion',label:'Fashion & Retail'},
  {value:'tech',label:'Technology'},{value:'healthcare',label:'Healthcare'},
  {value:'education',label:'Education'},{value:'entertainment',label:'Entertainment & Media'},
  {value:'other',label:'Other'},
];

const ALL_PLATFORMS = [
  {id:'instagram',label:'Instagram',icon:'📸'},
  {id:'facebook', label:'Facebook', icon:'👥'},
  {id:'tiktok',   label:'TikTok',   icon:'🎵'},
  {id:'twitter',  label:'X/Twitter',icon:'🐦'},
  {id:'linkedin', label:'LinkedIn', icon:'💼'},
  {id:'youtube',  label:'YouTube',  icon:'▶️'},
  {id:'website',  label:'Website',  icon:'🌐'},
  {id:'google_ads',label:'Google Ads',icon:'💰'},
];

export default function BrandSettingsPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const router      = useRouter();
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [form, setForm]           = useState({
    name: '', industry: '', country: 'Nigeria', website: '',
    tagline: '', brand_color: '#6d28d9', active_platforms: [] as string[],
    is_active: true,
  });

  useEffect(() => {
    axios.get(`${API}/admin/brands/${brandId}`, { headers: hdrs() })
      .then(r => {
        const b = r.data.brand || r.data;
        setForm({
          name:             b.name || '',
          industry:         b.industry || '',
          country:          b.country || 'Nigeria',
          website:          b.website || '',
          tagline:          b.tagline || '',
          brand_color:      b.brand_color || '#6d28d9',
          active_platforms: b.active_platforms || [],
          is_active:        b.is_active ?? true,
        });
      }).catch(() => toast.error('Failed to load brand'))
      .finally(() => setLoading(false));
  }, [brandId]);

  const save = async () => {
    if (!form.name.trim()) { toast.error('Brand name is required'); return; }
    setSaving(true);
    try {
      await axios.put(`${API}/admin/brands/${brandId}`, form, { headers: hdrs() });
      toast.success('Brand updated!');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const archive = async () => {
    setArchiving(true);
    try {
      await axios.patch(`${API}/admin/brands/${brandId}`, { is_active: false }, { headers: hdrs() });
      toast.success('Brand archived — it will no longer appear in the active portfolio');
      setTimeout(() => router.push('/clients'), 1200);
    } catch { toast.error('Archive failed'); } finally { setArchiving(false); setConfirmArchive(false); }
  };

  const togglePlatform = (id: string) =>
    setForm(f => ({
      ...f,
      active_platforms: f.active_platforms.includes(id)
        ? f.active_platforms.filter(x => x !== id)
        : [...f.active_platforms, id],
    }));

  const f = (k: string) => (e: any) => setForm(x => ({ ...x, [k]: e.target.value }));
  const LABEL_STYLE = { color: '#a78bfa' };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin"/>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <PageHeader
        back={`/clients/${brandId}`}
        eyebrow="Brand management"
        title="Brand settings"
        subtitle={`Editing ${form.name}`}
      />

      <div className="space-y-5">
        {/* Basic info */}
        <Card>
          <div className="flex items-center gap-3 mb-5 pb-4 border-b" style={{ borderColor: TOKENS.border }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(109,40,217,0.15)', border: '1px solid rgba(109,40,217,0.25)' }}>
              <Building2 className="w-5 h-5 text-purple-400"/>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Brand information</h2>
              <p className="text-xs text-white/40">Core details about this client brand</p>
            </div>
          </div>
          <div className="space-y-4">
            <Input label="Brand / company name *" value={form.name} onChange={f('name')} />
            <Select label="Industry" options={INDUSTRIES} value={form.industry} onChange={f('industry')} placeholder="Select industry…" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Country" value={form.country} onChange={f('country')} />
              <Input label="Website" value={form.website} onChange={f('website')} placeholder="https://brand.com" />
            </div>
            <Input label="Brand tagline" value={form.tagline} onChange={f('tagline')} placeholder="e.g. 'Africa's most trusted bank'" />
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={LABEL_STYLE}>Brand colour</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.brand_color} onChange={f('brand_color')}
                  className="w-11 h-11 rounded-xl cursor-pointer border-0 p-1.5"
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}/>
                <p className="text-sm font-mono text-white/50">{form.brand_color}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Active platforms */}
        <Card>
          <h2 className="text-sm font-bold text-white mb-1">Active platforms</h2>
          <p className="text-xs text-white/35 mb-4">Which platforms does this brand use? (Used for connection suggestions and analytics filtering)</p>
          <div className="grid grid-cols-4 gap-2">
            {ALL_PLATFORMS.map(({ id, label, icon }) => {
              const active = form.active_platforms.includes(id);
              return (
                <button key={id} onClick={() => togglePlatform(id)}
                  className={clsx('p-3 rounded-xl border transition-all flex flex-col items-center gap-1.5', active ? '' : 'hover:border-white/20')}
                  style={{
                    background:   active ? 'rgba(109,40,217,0.18)' : 'rgba(255,255,255,0.03)',
                    borderColor:  active ? 'rgba(109,40,217,0.5)'  : 'rgba(255,255,255,0.08)',
                  }}>
                  <span className="text-xl">{icon}</span>
                  <span className="text-[10px] font-semibold text-white/55">{label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Status */}
        {!form.is_active && (
          <Callout variant="warning">
            This brand is archived and hidden from the active portfolio. Re-activate it below to make it visible again.
          </Callout>
        )}

        {/* Save button */}
        <button onClick={save} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold text-white disabled:opacity-40 hover:brightness-110 transition-all"
          style={{ background:'linear-gradient(135deg,#6d28d9,#9333ea)', boxShadow:'0 4px 20px rgba(109,40,217,0.3)' }}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin"/>Saving…</> : <><Save className="w-4 h-4"/>Save changes</>}
        </button>

        {/* Danger zone */}
        <div className="rounded-2xl border p-5" style={{ borderColor:'rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400"/>
            <p className="text-sm font-bold text-red-400">Danger zone</p>
          </div>
          <p className="text-xs text-white/40 leading-relaxed mb-4">
            Archiving this brand hides it from the active portfolio and stops data syncing. All historical data is preserved and the brand can be re-activated at any time. This does <strong className="text-white/60">not</strong> delete any data.
          </p>
          <button onClick={() => setConfirmArchive(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-red-500/15"
            style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#fca5a5' }}>
            <Trash2 className="w-4 h-4"/>
            {form.is_active ? 'Archive this brand' : 'Re-activate this brand'}
          </button>
        </div>
      </div>

      <Confirm
        open={confirmArchive}
        title={`Archive ${form.name}?`}
        message="This will hide the brand from your active portfolio and pause data syncing. All data is kept and can be restored anytime."
        confirmLabel="Archive brand"
        variant="danger"
        loading={archiving}
        onConfirm={archive}
        onCancel={() => setConfirmArchive(false)}
      />
    </div>
  );
}

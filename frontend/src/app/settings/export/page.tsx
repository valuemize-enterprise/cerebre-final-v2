'use client';
import { useState } from 'react';
import { Download, FileText, Table2, BarChart2, Users, CheckSquare, Loader2, CheckCircle2 } from 'lucide-react';
import { PageHeader, Card, Select, TOKENS } from '@/components';
import axios from 'axios';
import toast from 'react-hot-toast';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const EXPORTS = [
  { id:'metrics', icon:'📊', label:'Brand metrics (all time)',  desc:'Platform followers, engagement, impressions per brand per month', ext:'csv' },
  { id:'tasks',   icon:'✅', label:'Task log',                  desc:'Every task logged by every staff member across all brands',       ext:'csv' },
  { id:'goals',   icon:'🎯', label:'Goals and progress',        desc:'All goals, targets, and current values',                          ext:'csv' },
  { id:'staff',   icon:'⭐', label:'Staff ratings',             desc:'All client ratings and feedback per staff member',                ext:'csv' },
  { id:'reports', icon:'📄', label:'Report index',             desc:'List of all uploaded reports with metadata and clarity scores',   ext:'csv' },
];

export default function DataExportPage() {
  const [downloading, setDownloading] = useState('');
  const [brandId,  setBrandId]  = useState('');
  const [brands,   setBrands]   = useState<any[]>([]);
  const [done,     setDone]     = useState<Record<string,boolean>>({});

  useState(() => {
    axios.get(`${API}/admin/brands`, { headers: hdrs() }).then(r => setBrands(r.data.brands || [])).catch(() => {});
  });

  const exportData = async (id: string, ext: string) => {
    setDownloading(id);
    try {
      const q = brandId ? `?brand_id=${brandId}` : '';
      const { data } = await axios.get(`${API}/settings/export/${id}${q}`, { headers: hdrs(), responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url; a.download = `sabi-${id}-${new Date().toISOString().split('T')[0]}.${ext}`; a.click();
      setDone(d => ({ ...d, [id]: true }));
      toast.success('Exported!');
      setTimeout(() => setDone(d => ({ ...d, [id]: false })), 3000);
    } catch { toast.error('Export failed — please try again'); } finally { setDownloading(''); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <PageHeader back="/settings" eyebrow="Settings" title="Data Export" subtitle="Download your Sabi data as CSV files for Excel or Google Sheets"/>
      <div className="mb-6">
        <Select label="Filter by brand (optional)" options={brands.map(b => ({ value:b.id, label:b.name }))} placeholder="All brands" value={brandId} onChange={e => setBrandId(e.target.value)}/>
      </div>
      <div className="space-y-3">
        {EXPORTS.map(({ id, icon, label, desc, ext }) => (
          <div key={id} className="flex items-center gap-4 p-5 rounded-2xl border" style={{ background:'rgba(255,255,255,0.03)', borderColor:'rgba(255,255,255,0.08)' }}>
            <span className="text-2xl flex-shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white/80">{label}</p>
              <p className="text-xs text-white/35 mt-0.5">{desc}</p>
            </div>
            <button onClick={() => exportData(id, ext)} disabled={!!downloading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex-shrink-0"
              style={done[id]?{background:'rgba(5,150,105,0.2)',border:'1px solid rgba(5,150,105,0.3)',color:'#6ee7b7'}:{background:'rgba(109,40,217,0.2)',border:'1px solid rgba(109,40,217,0.3)',color:'#c4b5fd'}}>
              {downloading===id?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:done[id]?<CheckCircle2 className="w-3.5 h-3.5"/>:<Download className="w-3.5 h-3.5"/>}
              {downloading===id?'Exporting…':done[id]?'Done!':'Export'}
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-white/20 text-center mt-6">Files are generated fresh on demand. No data is cached or stored server-side after download.</p>
    </div>
  );
}

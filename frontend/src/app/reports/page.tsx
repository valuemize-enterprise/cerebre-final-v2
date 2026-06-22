'use client';
import { useEffect, useState } from 'react';
import { FileText, Download, Eye, Search, Filter, Loader2, Plus, Zap, Building2, Calendar } from 'lucide-react';
import { PageHeader, Card, Badge, Button, SearchInput, Tabs, EmptyState, TOKENS } from '@/components';
import axios from 'axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const TYPE_LABELS: Record<string, string> = {
  monthly: 'Monthly', weekly: 'Weekly', campaign: 'Campaign',
  quarterly: 'Quarterly', instagram: 'Instagram', facebook: 'Facebook',
  google_analytics: 'Google Analytics', tiktok: 'TikTok', ad_account: 'Ad Account',
};

const statusOf = (r: any) => {
  if (r.ai_processed)        return { label: 'AI analysed', variant: 'success'  as const };
  if (r.processing_status === 'processing') return { label: 'Processing', variant: 'warning' as const };
  if (r.processing_status === 'error')      return { label: 'Failed',     variant: 'danger'  as const };
  return { label: 'Uploaded', variant: 'default' as const };
};

export default function ReportsPage() {
  const [reports,  setReports]  = useState<any[]>([]);
  const [brands,   setBrands]   = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [tab,      setTab]      = useState('all');
  const [brand,    setBrand]    = useState('');
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/reports`,         { headers: hdrs() }).catch(() => ({ data: { reports: [] } })),
      axios.get(`${API}/admin/brands`,    { headers: hdrs() }).catch(() => ({ data: { brands: [] } })),
    ]).then(([r, b]) => {
      setReports(r.data.reports || []);
      setBrands(b.data.brands  || []);
    }).finally(() => setLoading(false));
  }, []);

  const downloadPDF = async (report: any) => {
    setDownloading(report.id);
    try {
      if (report.pdf_url) { window.open(report.pdf_url, '_blank'); return; }
      const { data } = await axios.get(`${API}/reports/${report.id}/pdf`,
        { headers: hdrs(), responseType: 'blob' });
      const url  = URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url; link.download = `${report.brand_name}-${report.report_period || report.id}.pdf`;
      link.click();
    } catch { toast.error('PDF not available yet'); }
    finally { setDownloading(''); }
  };

  const filtered = reports
    .filter(r => tab === 'all' || (tab === 'analysed' ? r.ai_processed : !r.ai_processed))
    .filter(r => !brand || r.brand_id === brand)
    .filter(r => !search || r.brand_name?.toLowerCase().includes(search.toLowerCase()) || r.report_type?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <PageHeader
        eyebrow="Intelligence"
        title="Reports"
        subtitle={`${reports.length} report${reports.length !== 1 ? 's' : ''} across all clients`}
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => window.location.href = '/upload'}>
            Upload report
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by brand or type…" className="w-60" />
        <select value={brand} onChange={e => setBrand(e.target.value)}
          className="text-sm rounded-xl px-4 py-2.5 outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: brand ? '#fff' : 'rgba(255,255,255,0.4)' }}>
          <option value="">All brands</option>
          {brands.map(b => <option key={b.id} value={b.id} style={{ background: '#0f0a2e' }}>{b.name}</option>)}
        </select>
        <Tabs tabs={[
          { key: 'all',      label: 'All',      count: reports.length                             },
          { key: 'analysed', label: 'Analysed', count: reports.filter(r => r.ai_processed).length },
          { key: 'pending',  label: 'Pending',  count: reports.filter(r => !r.ai_processed).length },
        ]} active={tab} onChange={setTab} />
      </div>

      {/* Report list */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<FileText className="w-8 h-8" />}
          title={search || brand ? 'No reports match those filters' : 'No reports yet'}
          description="Upload a PDF report and ARIA will extract and analyse the data automatically."
          action={!search && !brand ? <Button icon={<Plus className="w-4 h-4" />} onClick={() => window.location.href = '/upload'}>Upload first report</Button> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const status = statusOf(r);
            return (
              <div key={r.id}
                className="flex items-center gap-4 p-4 rounded-xl border transition-all hover:border-purple-500/20 group"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>

                {/* Icon */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: r.ai_processed ? 'rgba(109,40,217,0.15)' : 'rgba(255,255,255,0.06)' }}>
                  {r.ai_processed
                    ? <Zap className="w-5 h-5 text-purple-400" />
                    : <FileText className="w-5 h-5 text-white/30" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white/80">{r.brand_name || 'Unknown brand'}</p>
                    <Badge variant="purple">{TYPE_LABELS[r.report_type] || r.report_type || 'Report'}</Badge>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    {r.report_period && (
                      <div className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <Calendar className="w-3 h-3" />{r.report_period}
                      </div>
                    )}
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      Uploaded {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {r.ai_processed && r.clarity_score && (
                    <p className="text-[10px] text-purple-400 mt-0.5">ClarityScore™ {r.clarity_score}/1000</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={`/reports/${r.id}`}
                    className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors" title="View report">
                    <Eye className="w-4 h-4" />
                  </a>
                  <button onClick={() => downloadPDF(r)} disabled={downloading === r.id}
                    className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors" title="Download PDF">
                    {downloading === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Download, ArrowLeft, Zap, TrendingUp, TrendingDown, FileText,
  BarChart2, Loader2, Calendar, Building2, Eye, Share2, RefreshCw
} from 'lucide-react';
import { Card, Badge, Button, ScoreGauge, TOKENS } from '@/components';
import axios from 'axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const fmtNum = (n: any) => {
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  if (num >= 1_000_000) return `${(num/1_000_000).toFixed(1)}M`;
  if (num >= 1_000)     return `${(num/1_000).toFixed(1)}K`;
  return num.toLocaleString();
};

const PLATFORM_ICONS: Record<string, string> = {
  instagram:'📸', facebook:'👥', tiktok:'🎵', twitter:'🐦',
  linkedin:'💼', youtube:'▶️', google_analytics:'📊', website:'🌐',
};

export default function ReportViewerPage() {
  const { id }     = useParams<{ id: string }>();
  const [report,   setReport]    = useState<any>(null);
  const [loading,  setLoading]   = useState(true);
  const [reanalyse,setReanalyse] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/reports/${id}`, { headers: hdrs() })
      .then(r => setReport(r.data.report || r.data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [id]);

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      if (report?.pdf_url) { window.open(report.pdf_url, '_blank'); return; }
      const { data } = await axios.get(`${API}/reports/${id}/pdf`, { headers: hdrs(), responseType:'blob' });
      const url = URL.createObjectURL(new Blob([data]));
      const a   = document.createElement('a');
      a.href = url; a.download = `${report?.brand_name}-report-${id}.pdf`; a.click();
    } catch { toast.error('PDF not ready yet'); } finally { setDownloading(false); }
  };

  const triggerReanalysis = async () => {
    setReanalyse(true);
    try {
      const { data } = await axios.post(`${API}/reports/${id}/reanalyse`, {}, { headers: hdrs() });
      setReport((r: any) => ({ ...r, ...data.report }));
      toast.success('Reanalysis complete!');
    } catch { toast.error('Reanalysis failed'); } finally { setReanalyse(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin"/>
    </div>
  );

  if (!report) return (
    <div className="p-8 text-center">
      <FileText className="w-12 h-12 mx-auto text-white/10 mb-3"/>
      <p className="text-white/40 font-semibold">Report not found</p>
      <a href="/reports" className="text-purple-400 text-sm mt-2 inline-block hover:underline">← Back to reports</a>
    </div>
  );

  const metrics    = report.extracted_metrics || {};
  const insights   = report.ai_insights       || [];
  const platforms  = Object.keys(metrics).filter(k => k !== 'general');

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-7">
        <div>
          <a href="/reports" className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 mb-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5"/> All reports
          </a>
          <div className="flex items-center gap-2 mb-1.5">
            <Building2 className="w-4 h-4 text-purple-400"/>
            <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">{report.brand_name}</p>
          </div>
          <h1 className="text-2xl font-black text-white capitalize">
            {report.report_type?.replace('_',' ')} Report
          </h1>
          <div className="flex items-center gap-4 mt-2">
            {report.report_period && (
              <span className="flex items-center gap-1 text-xs text-white/40">
                <Calendar className="w-3.5 h-3.5"/> {report.report_period}
              </span>
            )}
            <span className="text-xs text-white/25">
              Uploaded {new Date(report.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
            </span>
            {report.ai_processed && (
              <Badge variant="success">AI analysed</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!report.ai_processed && (
            <Button variant="secondary" size="sm" loading={reanalyse} icon={<RefreshCw className="w-4 h-4"/>} onClick={triggerReanalysis}>
              Analyse
            </Button>
          )}
          {report.ai_processed && (
            <Button variant="secondary" size="sm" loading={reanalyse} icon={<RefreshCw className="w-4 h-4"/>} onClick={triggerReanalysis}>
              Re-analyse
            </Button>
          )}
          <Button size="sm" loading={downloading} icon={<Download className="w-4 h-4"/>} onClick={downloadPDF}>
            Download PDF
          </Button>
        </div>
      </div>

      {/* ── ClarityScore ─────────────────────────────────────── */}
      {report.clarity_score && (
        <div className="grid sm:grid-cols-3 gap-5 mb-7">
          <div className="rounded-2xl border p-5 flex items-center gap-5" style={{ background:'rgba(109,40,217,0.07)', borderColor:'rgba(109,40,217,0.25)' }}>
            <ScoreGauge score={report.clarity_score} max={1000} size={90}/>
            <div>
              <p className="text-2xl font-black text-white">{report.clarity_score}</p>
              <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">ClarityScore™</p>
              <p className="text-xs text-white/35 mt-0.5">out of 1,000</p>
            </div>
          </div>
          {[
            { label:'Period label', value: report.period_label || report.report_period || '—' },
            { label:'Processed by', value: 'ARIA · ' + new Date(report.updated_at || report.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl border p-5 flex flex-col justify-center" style={{ background:'rgba(255,255,255,0.03)', borderColor:'rgba(255,255,255,0.08)' }}>
              <p className="text-xs font-bold uppercase tracking-wider text-white/30 mb-2">{label}</p>
              <p className="text-sm font-semibold text-white/75">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* ARIA insights */}
          {insights.length > 0 && (
            <Card>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
                  <Zap className="w-4 h-4 text-white"/>
                </div>
                <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">ARIA's Key Insights</p>
              </div>
              <div className="space-y-3">
                {insights.map((insight: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                    <div className={clsx('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', insight.type === 'positive' ? 'bg-emerald-400' : insight.type === 'negative' ? 'bg-red-400' : 'bg-purple-400')}/>
                    <div>
                      {insight.title && <p className="text-sm font-bold text-white/80 mb-0.5">{insight.title}</p>}
                      <p className="text-sm text-white/60 leading-relaxed">{insight.text || insight.message || String(insight)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ARIA summary */}
          {report.ai_summary && (
            <Card>
              <p className="text-xs font-bold text-white/35 uppercase tracking-wider mb-3">Full analysis</p>
              <p className="text-sm text-white/65 leading-relaxed whitespace-pre-line">{report.ai_summary}</p>
            </Card>
          )}

          {/* Extracted metrics per platform */}
          {platforms.length > 0 && (
            <div>
              <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-4">Extracted metrics</p>
              <div className="space-y-4">
                {platforms.map(platform => {
                  const platformMetrics = metrics[platform] || {};
                  const entries = Object.entries(platformMetrics).filter(([,v]) => v !== null && v !== undefined);
                  if (entries.length === 0) return null;
                  return (
                    <Card key={platform} padding="none">
                      <div className="flex items-center gap-3 px-5 py-3.5 border-b" style={{ borderColor: TOKENS.border }}>
                        <span className="text-lg">{PLATFORM_ICONS[platform] || '🔗'}</span>
                        <p className="text-sm font-bold text-white/70 capitalize">{platform.replace('_',' ')}</p>
                      </div>
                      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {entries.map(([key, value]) => (
                          <div key={key}>
                            <p className="text-xs font-bold text-white/50 capitalize">{fmtNum(value as any)}</p>
                            <p className="text-[10px] text-white/25 mt-0.5 capitalize">{key.replace(/_/g,' ')}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Meta info ───────────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-4">Report details</p>
            <div className="space-y-3">
              {[
                { label:'Brand',      value: report.brand_name },
                { label:'Type',       value: report.report_type?.replace('_',' ') },
                { label:'Period',     value: report.report_period || '—' },
                { label:'File',       value: report.original_filename || `report-${id.slice(0,8)}.pdf` },
                { label:'AI status',  value: report.ai_processed ? 'Analysed by ARIA' : report.processing_status || 'Pending' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <p className="text-[11px] text-white/30 font-semibold uppercase tracking-wider flex-shrink-0">{label}</p>
                  <p className="text-xs text-white/65 text-right capitalize">{value || '—'}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-4">Actions</p>
            <div className="space-y-2">
              <button onClick={downloadPDF}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left">
                <Download className="w-4 h-4 text-white/35"/>
                <span className="text-sm text-white/60">Download report PDF</span>
              </button>
              <a href={`/clients/${report.brand_id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
                <Building2 className="w-4 h-4 text-white/35"/>
                <span className="text-sm text-white/60">View brand hub</span>
              </a>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left">
                <Share2 className="w-4 h-4 text-white/35"/>
                <span className="text-sm text-white/60">Copy share link</span>
              </button>
            </div>
          </Card>

          {/* Client visibility toggle */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white/50">Visible to client</p>
                <p className="text-[10px] text-white/25 mt-0.5">If on, client sees this in their portal</p>
              </div>
              <button
                onClick={async () => {
                  const next = !report.client_visible;
                  setReport((r: any) => ({ ...r, client_visible: next }));
                  await axios.patch(`${API}/reports/${id}`, { client_visible: next }, { headers: hdrs() }).catch(() => {});
                  toast.success(next ? 'Now visible to client' : 'Hidden from client');
                }}
                className="relative w-11 h-6 rounded-full transition-all"
                style={{ background: report.client_visible ? '#6d28d9' : 'rgba(255,255,255,0.1)' }}>
                <div className={clsx('absolute top-1 w-4 h-4 rounded-full bg-white transition-transform', report.client_visible ? 'translate-x-6' : 'translate-x-1')}/>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

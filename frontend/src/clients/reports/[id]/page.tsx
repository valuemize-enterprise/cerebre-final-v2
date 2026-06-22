'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Zap, FileText, Loader2, BarChart2, Calendar } from 'lucide-react';
import { Card, Badge, ScoreGauge, TOKENS } from '@/components';
import { BRAND } from '@/lib/brand';
import axios from 'axios';
import toast from 'react-hot-toast';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem(BRAND.storage.clientToken)}` });

const fmtNum = (n: any) => { const num = parseFloat(n); if (isNaN(num)) return '—'; if (num >= 1000000) return `${(num/1000000).toFixed(1)}M`; if (num >= 1000) return `${(num/1000).toFixed(1)}K`; return Math.round(num).toLocaleString(); };

export default function ClientReportViewerPage() {
  const { id }    = useParams<{ id: string }>();
  const [report,  setReport]  = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/client/reports/${id}`, { headers: hdrs() })
      .then(r => setReport(r.data.report || r.data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [id]);

  const downloadPDF = async () => {
    if (report?.pdf_url) { window.open(report.pdf_url, '_blank'); return; }
    toast.error('PDF not available yet');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-purple-400 animate-spin"/></div>;
  if (!report) return <div className="p-8 text-center"><p className="text-white/40">Report not found.</p><a href="/client/reports" className="text-purple-400 text-sm mt-2 inline-block hover:underline">← Back to reports</a></div>;

  const insights = report.ai_insights || [];

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-7">
        <a href="/client/reports" className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 mb-4 transition-colors"><ArrowLeft className="w-3.5 h-3.5"/>All reports</a>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-white capitalize mb-1">{report.report_type?.replace('_',' ')} Report</h1>
            <div className="flex items-center gap-3">
              {report.report_period && <span className="flex items-center gap-1 text-xs text-white/35"><Calendar className="w-3 h-3"/>{report.report_period}</span>}
              {report.ai_processed && <Badge variant="success">Analysed by {BRAND.aria}</Badge>}
            </div>
          </div>
          {(report.pdf_url || report.ai_processed) && (
            <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white/80 transition-colors" style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)' }}>
              <Download className="w-4 h-4"/>Download
            </button>
          )}
        </div>
      </div>

      {report.clarity_score && (
        <Card className="flex items-center gap-5 mb-5">
          <ScoreGauge score={report.clarity_score} max={1000} size={90}/>
          <div>
            <p className="text-2xl font-black text-white">{report.clarity_score}</p>
            <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">ClarityScore™</p>
            <p className="text-xs text-white/30 mt-0.5">Your brand's intelligence score</p>
          </div>
        </Card>
      )}

      {insights.length > 0 && (
        <Card className="mb-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:'linear-gradient(135deg,#6d28d9,#a78bfa)' }}><Zap className="w-4 h-4 text-white"/></div>
            <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">{BRAND.aria} Key Insights</p>
          </div>
          <div className="space-y-3">
            {insights.map((ins: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${ins.type==='positive'?'bg-emerald-400':ins.type==='negative'?'bg-red-400':'bg-purple-400'}`}/>
                <p className="text-sm text-white/65 leading-relaxed">{ins.text || ins.message || String(ins)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {report.ai_summary && (
        <Card>
          <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3">Full analysis</p>
          <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{report.ai_summary}</p>
        </Card>
      )}
    </div>
  );
}

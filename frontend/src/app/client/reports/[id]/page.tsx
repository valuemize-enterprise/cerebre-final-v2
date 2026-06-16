'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, ArrowLeft, Loader2, Target, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('cerebre_client_token')}` });
const scoreColour = (s: number) => s >= 80 ? '#059669' : s >= 60 ? '#6d28d9' : s >= 40 ? '#d97706' : '#ef4444';

export default function ReportViewPage() {
  const { id }  = useParams();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [client, setClient]   = useState<any>(null);

  useEffect(() => {
    const info = localStorage.getItem('cerebre_client_info');
    if (info) setClient(JSON.parse(info));
    axios.get(`${API}/client/reports/${id}`, { headers: hdrs() })
      .then(r => setReport(r.data.report))
      .catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const downloadPDF = async () => {
    const r = await axios.get(`${API}/client/reports/${id}/pdf`, { headers: hdrs(), responseType: 'blob' });
    const url = URL.createObjectURL(r.data);
    const a   = document.createElement('a');
    a.href = url; a.download = `cerebre-report-${id}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>;
  if (!report) return <div className="p-8 text-white/40 text-center">Report not found</div>;

  const analysis = (() => { try { return typeof report.analysis === 'string' ? JSON.parse(report.analysis) : (report.analysis || {}); } catch { return {}; } })();
  const score    = report.clarity_score || report.overall_score;
  const colour   = score ? scoreColour(score) : '#6d28d9';

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <a href="/client/reports" className="p-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-white truncate">{report.period_label || 'Intelligence Report'}</h1>
          <p className="text-white/30 text-sm">{new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>

      {/* Score hero */}
      {score && (
        <div className="rounded-2xl p-6 mb-6 flex items-center gap-6"
          style={{ background: `${colour}12`, border: `1px solid ${colour}25` }}>
          <div className="text-center">
            <p className="text-5xl font-black" style={{ color: colour }}>{Math.round(score)}</p>
            <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: `${colour}80` }}>
              {score >= 80 ? 'Excellent' : score >= 60 ? 'Healthy' : score >= 40 ? 'Developing' : 'Needs Attention'}
            </p>
          </div>
          <div>
            <p className="text-sm font-bold text-white/60 mb-1">ClarityScore™</p>
            {analysis.headline && <p className="text-white/80 text-base font-medium leading-relaxed">{analysis.headline}</p>}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-5">
        {/* Board summary */}
        {(analysis.board_summary || analysis.executive_summary) && (
          <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">Executive Summary</p>
            <p className="text-white/70 text-sm leading-relaxed">{analysis.board_summary || analysis.executive_summary}</p>
          </div>
        )}

        {/* Recommendations */}
        {analysis.agency_recommendations?.length > 0 && (
          <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-4">The Agency Recommends</p>
            <div className="space-y-3">
              {analysis.agency_recommendations.slice(0,3).map((rec: any, i: number) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl" style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(109,40,217,0.2)' }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black text-white"
                    style={{ background: '#6d28d9' }}>{i + 1}</div>
                  <div>
                    <p className="text-white/80 text-sm font-semibold">{rec.action || rec.recommendation || rec}</p>
                    {rec.expected_outcome && <p className="text-white/40 text-xs mt-1">{rec.expected_outcome}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Watch list */}
        {analysis.watch_list?.length > 0 && (
          <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Watch List</p>
            <div className="space-y-2">
              {analysis.watch_list.map((item: any, i: number) => (
                <p key={i} className="text-sm text-white/60 flex items-start gap-2">
                  <span className="text-amber-400 shrink-0">▸</span>
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

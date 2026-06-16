'use client';
import { useEffect, useState } from 'react';
import { FileText, Download, Eye, TrendingUp, TrendingDown, Minus, Loader2, Filter } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('cerebre_client_token')}` });

const SCORE_COLOUR = (s: number) => s >= 80 ? '#059669' : s >= 60 ? '#6d28d9' : s >= 40 ? '#d97706' : '#ef4444';
const SCORE_LABEL  = (s: number) => s >= 80 ? 'Excellent' : s >= 60 ? 'Healthy' : s >= 40 ? 'Developing' : 'Needs attention';

const downloadPDF = async (reportId: string, brandName: string) => {
  const r = await axios.get(`${API}/client/reports/${reportId}/pdf`, { headers: hdrs(), responseType: 'blob' });
  const url = URL.createObjectURL(r.data);
  const a   = document.createElement('a');
  a.href = url; a.download = `cerebre-${brandName.replace(/\s+/g,'-')}-${reportId.slice(0,8)}.pdf`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [client, setClient]   = useState<any>(null);

  useEffect(() => {
    const info = localStorage.getItem('cerebre_client_info');
    if (info) setClient(JSON.parse(info));
    axios.get(`${API}/client/reports`, { headers: hdrs() })
      .then(r => setReports(r.data.reports || []))
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? reports : reports.filter(r => r.report_type === filter);
  const types = [...new Set(reports.map(r => r.report_type).filter(Boolean))];

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Intelligence Reports</h1>
          <p className="text-white/40 text-sm mt-1">{reports.length} report{reports.length !== 1 ? 's' : ''} available</p>
        </div>
        {types.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {['all', ...types].map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all',
                  filter === t ? 'text-white' : 'text-white/30 hover:text-white/60')}
                style={filter === t ? { background: 'rgba(109,40,217,0.4)', border: '1px solid rgba(109,40,217,0.4)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 mx-auto text-white/10 mb-4" />
          <p className="text-white/30 font-semibold">No reports yet</p>
          <p className="text-white/15 text-sm mt-1">Your account manager will upload reports here</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((r: any) => {
            const score = r.clarity_score || r.overall_score;
            const colour = score ? SCORE_COLOUR(score) : '#6d28d9';
            return (
              <div key={r.id} className="flex items-center gap-5 p-5 rounded-2xl border transition-all hover:border-purple-500/30"
                style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${colour}18`, border: `1px solid ${colour}30` }}>
                  <FileText className="w-5 h-5" style={{ color: colour }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white/90">{r.period_label || `${r.report_type || 'Report'} — ${new Date(r.created_at).toLocaleDateString('en-GB',{month:'long',year:'numeric'})}`}</p>
                  <p className="text-xs text-white/30 mt-0.5">{new Date(r.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>
                </div>
                {score && (
                  <div className="text-center flex-shrink-0">
                    <p className="text-xl font-black" style={{ color: colour }}>{Math.round(score)}</p>
                    <p className="text-[10px] font-semibold" style={{ color: `${colour}80` }}>{SCORE_LABEL(score)}</p>
                  </div>
                )}
                <div className="flex gap-2 flex-shrink-0">
                  <a href={`/client/reports/${r.id}`} className="p-2 rounded-xl text-white/40 hover:text-white/70 transition-colors hover:bg-white/5">
                    <Eye className="w-4 h-4" />
                  </a>
                  <button onClick={() => downloadPDF(r.id, client?.brandName || 'report')}
                    className="p-2 rounded-xl text-white/40 hover:text-purple-400 transition-colors hover:bg-purple-500/10">
                    <Download className="w-4 h-4" />
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

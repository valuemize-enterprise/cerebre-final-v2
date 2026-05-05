'use client';
import { useEffect, useState } from 'react';
import {
  ArrowUp, ArrowDown, Minus, Plus, Trash2,
  TrendingUp, Users, BarChart2, Loader2,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const DeltaTag = ({ our, comp }: { our: number; comp: number }) => {
  if (!comp || comp === 0) return <span className="text-gray-400 text-xs">—</span>;
  const diff = ((our - comp) / comp) * 100;
  return (
    <span className={clsx('flex items-center gap-0.5 text-xs font-semibold',
      diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-gray-400')}>
      {diff > 0 ? <ArrowUp className="w-3 h-3" /> : diff < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {Math.abs(diff).toFixed(1)}%
    </span>
  );
};

const PLATFORMS = ['instagram','facebook','tiktok','twitter','linkedin','youtube','google_ads','email','website'];

export default function BenchmarksPage() {
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newComp, setNewComp] = useState({ name: '', industry: '', instagram_handle: '', website: '' });

  useEffect(() => {
    Promise.all([
      api.get('/benchmarks/competitors'),
      api.get('/benchmarks/reports'),
    ]).then(([cRes, rRes]) => {
      setCompetitors(cRes.data.competitors || []);
      setReports(rRes.data.reports || []);
    }).finally(() => setLoading(false));
  }, []);

  const addCompetitor = async () => {
    if (!newComp.name) return;
    try {
      const { data } = await api.post('/benchmarks/competitors', newComp);
      setCompetitors(prev => [...prev, data.competitor]);
      setNewComp({ name: '', industry: '', instagram_handle: '', website: '' });
      setShowAdd(false);
      toast.success('Competitor added');
    } catch {
      toast.error('Failed to add competitor');
    }
  };

  const generateBenchmark = async (competitorId: string) => {
    try {
      await api.post('/benchmarks/generate', { competitorId });
      toast.success('Benchmark analysis started');
    } catch {
      toast.error('Failed to generate benchmark');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>;

  const latestReport = reports[0];

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Benchmarks</h1>
          <p className="text-sm text-gray-400 mt-1">Compare your brand with competitors and industry averages</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add competitor
        </button>
      </div>

      {/* Add competitor form */}
      {showAdd && (
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Add a competitor</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Company name *</label>
              <input className="input-base" placeholder="Competitor Brand" value={newComp.name}
                onChange={e => setNewComp(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Industry</label>
              <input className="input-base" placeholder="e.g. FMCG" value={newComp.industry}
                onChange={e => setNewComp(p => ({ ...p, industry: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Instagram handle</label>
              <input className="input-base" placeholder="@competitorbrand" value={newComp.instagram_handle}
                onChange={e => setNewComp(p => ({ ...p, instagram_handle: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Website</label>
              <input className="input-base" placeholder="https://competitor.com" value={newComp.website}
                onChange={e => setNewComp(p => ({ ...p, website: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addCompetitor} className="btn-primary text-sm">Add competitor</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Competitors list */}
      {competitors.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Tracked competitors ({competitors.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {competitors.map(c => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-semibold text-gray-500">
                  {c.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.industry} {c.instagram_handle && `· ${c.instagram_handle}`}</p>
                </div>
                <button onClick={() => generateBenchmark(c.id)} className="btn-secondary text-xs py-1.5">
                  <BarChart2 className="w-3.5 h-3.5" /> Benchmark
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest benchmark report */}
      {latestReport ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">
              Latest benchmark — {latestReport.period_label}
            </h2>
            <span className={clsx('badge',
              latestReport.competitive_position === 'leader' ? 'badge-success' :
              latestReport.competitive_position === 'challenger' ? 'badge-info' :
              latestReport.competitive_position === 'follower' ? 'badge-warning' : 'badge-neutral'
            )}>
              {latestReport.competitive_position}
            </span>
          </div>

          {/* Platform comparison table */}
          {latestReport.platform_comparison?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Platform-by-platform comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
                      {['Platform','Our ER','Comp ER','Difference','Our Followers','Comp Followers'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {latestReport.platform_comparison.map((p: any) => (
                      <tr key={p.platform} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">{p.platform.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{(parseFloat(p.our_er || 0) * 100).toFixed(2)}%</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{(parseFloat(p.comp_er || 0) * 100).toFixed(2)}%</td>
                        <td className="px-4 py-3">
                          <DeltaTag our={parseFloat(p.our_er || 0)} comp={parseFloat(p.comp_er || 0)} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{Number(p.our_followers || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{Number(p.comp_followers || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI insights */}
          {latestReport.ai_insights && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card p-5">
                <p className="section-title text-green-600 mb-2">Our advantages</p>
                {latestReport.our_advantages?.map((a: string, i: number) => (
                  <p key={i} className="text-sm text-gray-600 dark:text-gray-300 flex gap-2 mb-1.5">
                    <span className="text-green-500 font-bold shrink-0">✓</span>{a}
                  </p>
                ))}
              </div>
              <div className="card p-5">
                <p className="section-title text-amber-600 mb-2">Areas to improve</p>
                {latestReport.their_advantages?.map((a: string, i: number) => (
                  <p key={i} className="text-sm text-gray-600 dark:text-gray-300 flex gap-2 mb-1.5">
                    <span className="text-amber-500 font-bold shrink-0">→</span>{a}
                  </p>
                ))}
              </div>
            </div>
          )}

          {latestReport.strategic_recommendations?.length > 0 && (
            <div className="card p-5">
              <p className="section-title mb-3">Strategic recommendations</p>
              {latestReport.strategic_recommendations.map((r: string, i: number) => (
                <div key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300 mb-2">
                  <span className="text-brand-500 font-bold shrink-0">{i + 1}.</span>{r}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : competitors.length > 0 ? (
        <div className="card text-center py-12 border-dashed">
          <BarChart2 className="w-8 h-8 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No benchmark reports yet</p>
          <p className="text-sm text-gray-400 mt-1">Click "Benchmark" on a competitor to generate a comparison</p>
        </div>
      ) : (
        <div className="card text-center py-16 border-dashed">
          <Users className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No competitors added yet</p>
          <p className="text-sm text-gray-400 mt-1">Add competitor brands to see how you compare</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" /> Add first competitor
          </button>
        </div>
      )}
    </div>
  );
}

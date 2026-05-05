'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileBarChart, Plus, TrendingUp, Download, Calendar, Loader2, ChevronRight } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  'A+': { bg: 'bg-green-100 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400' },
  'A':  { bg: 'bg-green-100 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400' },
  'B+': { bg: 'bg-lime-100 dark:bg-lime-950/30',   text: 'text-lime-700 dark:text-lime-400'   },
  'B':  { bg: 'bg-yellow-100 dark:bg-yellow-950/30', text: 'text-yellow-700 dark:text-yellow-400' },
  'C':  { bg: 'bg-amber-100 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400' },
  'D':  { bg: 'bg-red-100 dark:bg-red-950/30',     text: 'text-red-700 dark:text-red-400'     },
  'F':  { bg: 'bg-red-100 dark:bg-red-950/30',     text: 'text-red-700 dark:text-red-400'     },
};

const GradeBadge = ({ grade }: { grade: string }) => {
  const gc = GRADE_COLORS[grade] || GRADE_COLORS['B'];
  return (
    <span className={clsx('text-lg font-bold px-2.5 py-0.5 rounded-lg', gc.bg, gc.text)}>
      {grade}
    </span>
  );
};

export default function ScorecardsPage() {
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  const loadScorecards = async () => {
    api.get(`/scorecards?period_type=${tab}`)
      .then(({ data }) => setScorecards(data.scorecards || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setLoading(true); loadScorecards(); }, [tab]);

  const generateLatest = async () => {
    setGenerating(true);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0,10);
    const label = now.toLocaleString('en-NG', { month: 'long', year: 'numeric' });

    try {
      await api.post('/scorecards/generate', {
        period_type: tab,
        period_start: start,
        period_end: end,
        period_label: label,
      });
      toast.success('Scorecard generated!');
      loadScorecards();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Performance Scorecards</h1>
          <p className="text-sm text-gray-400 mt-1">
            Monthly, quarterly & yearly digital performance reports with ROI, leads, and cost insights
          </p>
        </div>
        <button onClick={generateLatest} disabled={generating} className="btn-primary">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {generating ? 'Generating...' : `Generate ${tab}`}
        </button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {(['monthly', 'quarterly', 'yearly'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors',
              tab === t
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      ) : scorecards.length === 0 ? (
        <div className="card text-center py-16 border-dashed">
          <FileBarChart className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No {tab} scorecards yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Generate your first scorecard to get AI-powered ROI, lead attribution, and performance grades
          </p>
          <button onClick={generateLatest} disabled={generating} className="btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" />
            Generate {tab === 'monthly' ? 'this month' : tab === 'quarterly' ? 'this quarter' : 'this year'}
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scorecards.map(sc => (
            <Link key={sc.id} href={`/scorecards/${sc.id}`}
              className="card p-5 hover:shadow-md transition-all group block">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{sc.period_label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(sc.created_at).toLocaleDateString('en-NG')}
                  </p>
                </div>
                <GradeBadge grade={sc.performance_grade || 'B'} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {parseFloat(sc.blended_roas || 0).toFixed(2)}x
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">ROAS</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {Number(sc.total_leads || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Leads</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {parseFloat(sc.roi_percentage || 0).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">ROI</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <p className={clsx('text-sm font-semibold',
                    sc.goals_on_track > 0 ? 'text-green-600' : 'text-gray-900 dark:text-white')}>
                    {sc.goals_on_track}/{(sc.goals_on_track || 0) + (sc.goals_at_risk || 0) + (sc.goals_missed || 0)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Goals met</p>
                </div>
              </div>

              <div className="flex items-center text-xs text-gray-400 group-hover:text-brand-500 transition-colors">
                View full report <ChevronRight className="w-3 h-3 ml-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

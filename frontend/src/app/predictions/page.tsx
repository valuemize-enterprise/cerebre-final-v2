'use client';
import { useEffect, useState } from 'react';
import { TrendingUp, Zap, Loader2, Target, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import api from '../../lib/api';

export default function PredictionsPage() {
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { api.get('/predictions/latest').then(({ data }) => setPrediction(data.prediction)).finally(() => setLoading(false)); }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/predictions/generate');
      setPrediction(data.prediction);
    } finally { setGenerating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>;

  const trajectories = prediction?.goal_trajectories || (typeof prediction?.goal_trajectories === 'string' ? JSON.parse(prediction.goal_trajectories) : []);

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Predictive Analytics</h1>
          <p className="text-sm text-gray-400 mt-1">30-day forecasts and goal trajectory analysis</p></div>
        <button onClick={generate} disabled={generating} className="btn-primary">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {generating ? 'Generating...' : 'Generate forecast'}
        </button>
      </div>
      {prediction ? (
        <div className="space-y-4">
          {trajectories.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Goal trajectories</h3>
              <div className="space-y-3">
                {trajectories.map((t: any, i: number) => {
                  const pct = parseFloat(t.predicted_achievement_pct || 0);
                  const color = pct >= 90 ? 'bg-green-500' : pct >= 60 ? 'bg-brand-500' : 'bg-red-400';
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{t.goal_title}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            {t.will_achieve_by_deadline ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{Math.round(pct)}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        {!t.will_achieve_by_deadline && t.corrective_actions_if_behind?.length > 0 && (
                          <p className="text-xs text-amber-600 mt-1">⚡ {t.corrective_actions_if_behind[0]}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {prediction.model_confidence && (
            <div className="card p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-950/30 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Model confidence</p>
                <p className="text-2xl font-bold text-brand-600">{Math.round(parseFloat(prediction.model_confidence) * 100)}%</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-16 border-dashed">
          <TrendingUp className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No predictions yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload platform data and generate your first forecast</p>
          <button onClick={generate} disabled={generating} className="btn-primary mt-4 inline-flex">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Generate forecast
          </button>
        </div>
      )}
    </div>
  );
}

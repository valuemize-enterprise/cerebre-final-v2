'use client';
import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2, Database } from 'lucide-react';
import api from '../../lib/api';
import clsx from 'clsx';

const ScoreBadge = ({score}: {score:number}) => (
  <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full',
    score>=80?'bg-green-100 text-green-700':score>=60?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700')}>
    {Math.round(score)}/100
  </span>
);

export default function DataHealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const load = () => api.get('/data-health').then(({data}) => setHealth(data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const runCheck = async () => {
    setChecking(true);
    await api.post('/data-health/check');
    await load();
    setChecking(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>;

  const platformScores = health?.platform_scores ? (typeof health.platform_scores==='string'?JSON.parse(health.platform_scores):health.platform_scores) : {};
  const gaps = health?.gaps_detected ? (typeof health.gaps_detected==='string'?JSON.parse(health.gaps_detected):health.gaps_detected) : [];
  const recs = health?.recommendations ? (typeof health.recommendations==='string'?JSON.parse(health.recommendations):health.recommendations) : [];

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1"><Database className="w-4 h-4 text-brand-500" /><span className="section-title text-brand-600">Data Quality</span></div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Data Health Monitor</h1>
          <p className="text-sm text-gray-400 mt-1">How complete and reliable is the data powering your AI analysis?</p>
        </div>
        <button onClick={runCheck} disabled={checking} className="btn-primary">
          {checking?<Loader2 className="w-4 h-4 animate-spin"/>:<RefreshCw className="w-4 h-4"/>}
          {checking?'Checking...':'Run health check'}
        </button>
      </div>

      {health ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="card p-5 text-center col-span-2 sm:col-span-1">
              <p className="text-5xl font-bold text-brand-600">{Math.round(health.overall_score||0)}</p>
              <p className="text-xs text-gray-400 mt-1">Overall health score</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{health.critical_gaps||0}</p>
              <p className="text-xs text-gray-400 mt-1">Critical gaps</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold text-gray-700 dark:text-gray-200">{Object.keys(platformScores).length}</p>
              <p className="text-xs text-gray-400 mt-1">Platforms tracked</p>
            </div>
          </div>

          {Object.keys(platformScores).length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Data completeness by platform</h3>
              <div className="space-y-3">
                {Object.entries(platformScores).map(([platform,ps]:any) => {
                  const score = typeof ps==='object'?ps.completeness:ps;
                  return (
                    <div key={platform}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400 capitalize">{platform.replace('_',' ')}</span>
                        <ScoreBadge score={score} />
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className={clsx('h-full rounded-full',score>=80?'bg-green-500':score>=60?'bg-amber-500':'bg-red-400')} style={{width:`${score}%`}} />
                      </div>
                      {typeof ps==='object'&&ps.missing_fields?.length>0&&<p className="text-xs text-gray-400 mt-0.5">Missing: {ps.missing_fields.join(', ')}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {gaps.length>0&&(
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Detected gaps</h3>
              {gaps.map((g:string,i:number) => (
                <div key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300 mb-1.5">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5"/>{g}
                </div>
              ))}
            </div>
          )}

          {recs.length>0&&(
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">How to improve</h3>
              {recs.map((r:string,i:number) => (
                <div key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300 mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0 mt-0.5"/>{r}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-16 border-dashed"><Activity className="w-10 h-10 mx-auto text-gray-300 mb-3"/><p className="text-gray-500 font-medium">No health data yet</p><button onClick={runCheck} className="btn-primary mt-4 inline-flex">Run first check</button></div>
      )}
    </div>
  );
}
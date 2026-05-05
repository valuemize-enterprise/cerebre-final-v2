'use client';
import { useEffect, useState } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Shield, TrendingUp, TrendingDown, Minus, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import api from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import clsx from 'clsx';

const getScoreColor = (score: number) => {
  if (score >= 80) return { text: 'text-green-600', bg: 'bg-green-500', ring: 'stroke-green-500' };
  if (score >= 65) return { text: 'text-brand-600', bg: 'bg-brand-500', ring: 'stroke-brand-500' };
  if (score >= 50) return { text: 'text-amber-600', bg: 'bg-amber-500', ring: 'stroke-amber-500' };
  return { text: 'text-red-600', bg: 'bg-red-500', ring: 'stroke-red-500' };
};

const ScoreGauge = ({ score, label, size = 'sm' }: { score: number; label: string; size?: 'sm' | 'lg' }) => {
  const c = getScoreColor(score);
  const r = size === 'lg' ? 52 : 32;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const dim = r * 2 + 20;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle cx={dim/2} cy={dim/2} r={r} fill="none" stroke="currentColor"
            strokeWidth={size === 'lg' ? 8 : 5} className="text-gray-100 dark:text-gray-800" />
          <circle cx={dim/2} cy={dim/2} r={r} fill="none"
            strokeWidth={size === 'lg' ? 8 : 5}
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeLinecap="round"
            className={c.ring}
            style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={clsx('font-bold', c.text, size === 'lg' ? 'text-2xl' : 'text-sm')}>
            {Math.round(score)}
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-500 text-center leading-tight">{label}</p>
    </div>
  );
};

const DIMENSIONS = [
  { key: 'visibility_score',   label: 'Visibility',   desc: 'Reach & impressions trend' },
  { key: 'engagement_score',   label: 'Engagement',   desc: 'Quality of audience interaction' },
  { key: 'sentiment_score',    label: 'Sentiment',    desc: 'Positive vs negative perception' },
  { key: 'content_score',      label: 'Content',      desc: 'Content quality & resonance' },
  { key: 'audience_score',     label: 'Audience',     desc: 'Growth & loyalty quality' },
  { key: 'conversion_score',   label: 'Conversion',   desc: 'Social → business outcomes' },
  { key: 'consistency_score',  label: 'Consistency',  desc: 'Posting regularity & voice' },
  { key: 'competitor_score',   label: 'Competitive',  desc: 'Position vs competitors' },
];

export default function BrandHealthPage() {
  const { colors } = useTheme();
  const [health, setHealth] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const load = async () => {
    Promise.all([
      api.get('/brand-health/latest'),
      api.get('/brand-health/history'),
    ]).then(([hRes, histRes]) => {
      setHealth(hRes.data.health);
      setHistory(histRes.data.history || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const recalculate = async () => {
    setRecalculating(true);
    try {
      await api.post('/brand-health/calculate');
      await load();
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>;

  const score = health?.overall_score || 0;
  const sc = getScoreColor(score);
  const radarData = DIMENSIONS.map(d => ({
    dimension: d.label,
    score: health?.[d.key] || 0,
    fullMark: 100,
  }));

  const trendIcon = health?.score_trend === 'improving'
    ? <TrendingUp className="w-4 h-4 text-green-500" />
    : health?.score_trend === 'declining'
    ? <TrendingDown className="w-4 h-4 text-red-500" />
    : <Minus className="w-4 h-4 text-gray-400" />;

  const platforms = health?.platform_scores
    ? (typeof health.platform_scores === 'string' ? JSON.parse(health.platform_scores) : health.platform_scores)
    : {};

  const strengths = typeof health?.strengths === 'string' ? JSON.parse(health.strengths) : (health?.strengths || []);
  const vulnerabilities = typeof health?.vulnerabilities === 'string' ? JSON.parse(health.vulnerabilities) : (health?.vulnerabilities || []);
  const actions = typeof health?.immediate_actions === 'string' ? JSON.parse(health.immediate_actions) : (health?.immediate_actions || []);

  return (
    <div className="p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-brand-500" />
            <span className="section-title text-brand-600">Brand Intelligence</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Brand Health Monitor</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time health score across 8 brand performance dimensions</p>
        </div>
        <button onClick={recalculate} disabled={recalculating} className="btn-secondary">
          {recalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {recalculating ? 'Calculating...' : 'Recalculate'}
        </button>
      </div>

      {health ? (
        <>
          {/* Hero score + radar */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Overall score */}
            <div className="card p-7 flex flex-col items-center justify-center text-center">
              <ScoreGauge score={score} label="" size="lg" />
              <p className="text-3xl font-bold mt-2" style={{ color: getScoreColor(score).text.replace('text-', '').includes('green') ? '#16a34a' : getScoreColor(score).text.includes('amber') ? '#d97706' : getScoreColor(score).text.includes('red') ? '#dc2626' : '#7c3aed' }}>
                {Math.round(score)}<span className="text-lg font-normal text-gray-400">/100</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {trendIcon}
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 capitalize">
                  {health.score_trend?.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-4 max-w-[160px]">Overall brand health score</p>
            </div>

            {/* Radar chart */}
            <div className="card p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">8-dimension health profile</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={colors.grid} />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: colors.textMuted }} />
                  <Radar name="Score" dataKey="score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 8 dimension scores */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-4 card p-5">
            {DIMENSIONS.map(d => (
              <div key={d.key} className="flex flex-col items-center">
                <ScoreGauge score={health[d.key] || 0} label={d.label} />
              </div>
            ))}
          </div>

          {/* Platform health */}
          {Object.keys(platforms).length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Platform health</h3>
              <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(platforms).map(([platform, data]: [string, any]) => {
                  const pc = getScoreColor(data.score);
                  return (
                    <div key={platform} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
                      <p className="text-xs font-medium text-gray-500 capitalize mb-2">{platform.replace('_', ' ')}</p>
                      <ScoreGauge score={data.score || 0} label="" />
                      {data.issues?.length > 0 && (
                        <p className="text-xs text-amber-500 mt-1.5 leading-tight">{data.issues[0]}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI narrative */}
          {health.health_summary && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">AI Health Assessment</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">{health.health_summary}</p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="section-title text-green-600 mb-2">Strengths</p>
                  {strengths.map((s: string, i: number) => (
                    <div key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300 mb-1.5">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />{s}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="section-title text-amber-600 mb-2">Vulnerabilities</p>
                  {vulnerabilities.map((v: string, i: number) => (
                    <div key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300 mb-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />{v}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Immediate actions */}
          {actions.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Immediate actions to improve health score</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {actions.map((a: any, i: number) => (
                  <div key={i} className="p-4 border border-brand-100 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/20 rounded-xl">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{a.action}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {a.priority_goal_served && (
                        <span className="badge-info text-xs">{a.priority_goal_served}</span>
                      )}
                      {a.timeline && (
                        <span className="badge-neutral text-xs">{a.timeline}</span>
                      )}
                    </div>
                    {a.expected_health_impact && (
                      <p className="text-xs text-brand-600 dark:text-brand-400 mt-1">{a.expected_health_impact}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History trend */}
          {history.length > 1 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Health score trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={history.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis dataKey="period_date" tick={{ fontSize: 10, fill: colors.textMuted }}
                    tickFormatter={d => d?.slice(0, 7)} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: colors.textMuted }} />
                  <Tooltip formatter={(v: any) => [`${Math.round(v)}/100`, 'Health score']} />
                  <Line type="monotone" dataKey="overall_score" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: '#7c3aed' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-16 border-dashed">
          <Shield className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No health data yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload platform reports to calculate your brand health score</p>
          <button onClick={recalculate} className="btn-primary mt-4 inline-flex">
            <Zap className="w-4 h-4" /> Calculate health score
          </button>
        </div>
      )}
    </div>
  );
}

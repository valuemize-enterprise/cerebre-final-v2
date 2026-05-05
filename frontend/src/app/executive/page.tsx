'use client';
import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, AlertTriangle, Shield,
  DollarSign, Users, Target, BarChart2, Zap,
  Download, ChevronRight, Loader2,
} from 'lucide-react';
import api from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import clsx from 'clsx';

const GRADE_COLORS: Record<string, string> = {
  'A+': '#059669', 'A': '#16a34a', 'B+': '#65a30d', 'B': '#ca8a04',
  'C+': '#d97706', 'C': '#ea580c', 'D': '#dc2626', 'F': '#7f1d1d',
};

const KpiTile = ({ label, value, sub, trend, icon: Icon, accent = 'brand' }: any) => {
  const accentMap: Record<string, string> = {
    brand: 'bg-brand-500', green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="section-title">{label}</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={clsx('p-2.5 rounded-lg shrink-0', accentMap[accent] || accentMap.brand)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={clsx('mt-3 flex items-center gap-1 text-xs font-medium',
          trend >= 0 ? 'text-green-600' : 'text-red-500')}>
          {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {Math.abs(trend).toFixed(1)}% vs last period
        </div>
      )}
    </div>
  );
};

const GradeCircle = ({ grade }: { grade: string }) => (
  <div className="flex items-center justify-center w-16 h-16 rounded-full border-4"
    style={{ borderColor: GRADE_COLORS[grade] || '#6b7280', color: GRADE_COLORS[grade] || '#6b7280' }}>
    <span className="text-xl font-bold">{grade}</span>
  </div>
);

export default function ExecutiveDashboard() {
  const { colors } = useTheme();
  const [data, setData] = useState<any>(null);
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestScorecard, setLatestScorecard] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get('/reports/summary/dashboard'),
      api.get('/scorecards?period_type=monthly'),
      api.get('/goals'),
    ]).then(([dashRes, scRes, goalsRes]) => {
      setData(dashRes.data);
      const sc = scRes.data.scorecards || [];
      setScorecards(sc);
      setLatestScorecard(sc[0] || null);
      setGoals(goalsRes.data.goals || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  );

  const topPlatforms = data?.topPlatforms || [];
  const execSnap = data?.latestReport?.executive_snapshot || {};
  const goalStats = {
    onTrack:  goals.filter(g => g.status === 'active' || g.status === 'achieved').length,
    atRisk:   goals.filter(g => g.status === 'at_risk').length,
    missed:   goals.filter(g => g.status === 'missed').length,
  };

  return (
    <div className="p-6 max-w-6xl space-y-6">
      {/* Executive header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-brand-500" />
            <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">Executive View</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Board Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Cross-platform social media intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          {latestScorecard && (
            <div className="flex items-center gap-3 card px-4 py-2.5">
              <GradeCircle grade={latestScorecard.performance_grade || 'B'} />
              <div>
                <p className="text-xs text-gray-400">Overall grade</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{latestScorecard.period_label}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => api.post('/scorecards/generate', {
              period_type: 'monthly',
              period_start: new Date(Date.now() - 30 * 86400000).toISOString().slice(0,10),
              period_end: new Date().toISOString().slice(0,10),
              period_label: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
            }).then(() => window.location.reload())}
            className="btn-primary text-sm">
            <Zap className="w-4 h-4" /> Generate scorecard
          </button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Blended ROAS"
          value={latestScorecard ? `${parseFloat(latestScorecard.blended_roas || 0).toFixed(2)}x` : '—'}
          sub="Revenue per ₦1 spent"
          icon={DollarSign} accent="green" />
        <KpiTile label="Total leads"
          value={latestScorecard ? Number(latestScorecard.total_leads).toLocaleString() : '—'}
          sub="This period"
          icon={Target} accent="brand" />
        <KpiTile label="Goals on track"
          value={`${goalStats.onTrack}/${goals.length}`}
          sub={goalStats.atRisk > 0 ? `${goalStats.atRisk} at risk` : 'All healthy'}
          icon={BarChart2} accent={goalStats.atRisk > 0 ? 'amber' : 'green'} />
        <KpiTile label="ROI"
          value={latestScorecard ? `${parseFloat(latestScorecard.roi_percentage || 0).toFixed(1)}%` : '—'}
          sub="Return on ad spend"
          icon={TrendingUp} accent="brand" />
      </div>

      {/* Executive summary + scorecard */}
      {latestScorecard?.executive_summary && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">AI Executive Brief</h2>
            <span className="text-xs text-gray-400 ml-auto">{latestScorecard.period_label}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {latestScorecard.executive_summary}
          </p>
          {latestScorecard.recommendations && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="section-title mb-2">Board recommendations</p>
              <div className="space-y-2">
                {(typeof latestScorecard.recommendations === 'string'
                  ? JSON.parse(latestScorecard.recommendations)
                  : latestScorecard.recommendations
                ).slice(0, 3).map((r: any, i: number) => (
                  <div key={i} className="flex gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-bold text-brand-500 shrink-0">{i + 1}.</span>
                    <span>{typeof r === 'string' ? r : r.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Platform grades */}
      {latestScorecard?.platform_grades && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Platform report cards</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
            {Object.entries(
              typeof latestScorecard.platform_grades === 'string'
                ? JSON.parse(latestScorecard.platform_grades)
                : latestScorecard.platform_grades
            ).map(([platform, grade]: [string, any]) => (
              <div key={platform} className="text-center">
                <GradeCircle grade={grade} />
                <p className="text-xs text-gray-500 mt-2 capitalize">{platform.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals health */}
      {goals.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Goals health</h2>
            <a href="/goals" className="text-xs text-brand-500 hover:underline flex items-center gap-1">
              Manage goals <ChevronRight className="w-3 h-3" />
            </a>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {goals.slice(0, 6).map((g: any) => {
              const pct = Math.min(100, parseFloat(g.progress_pct || 0));
              const colors_map: Record<string, string> = {
                achieved: 'bg-green-500', active: 'bg-brand-500',
                at_risk: 'bg-amber-500', missed: 'bg-red-500',
              };
              return (
                <div key={g.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="text-lg">{GOAL_ICONS[g.goal_type] || '✦'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{g.title}</p>
                      <span className="text-xs font-semibold text-gray-500 shrink-0 ml-2">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className={clsx('h-full rounded-full', colors_map[g.status] || 'bg-brand-500')}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className={clsx('text-xs font-medium capitalize shrink-0',
                    g.status === 'achieved' ? 'text-green-600' :
                    g.status === 'at_risk' ? 'text-amber-600' :
                    g.status === 'missed' ? 'text-red-500' : 'text-brand-600'
                  )}>{g.status.replace('_', ' ')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Platform performance bar chart */}
      {topPlatforms.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Platform performance (impressions)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topPlatforms} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.grid} />
              <XAxis type="number" tick={{ fontSize: 11, fill: colors.textMuted }}
                tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="platform" type="category" tick={{ fontSize: 11, fill: colors.textMuted }} width={90} />
              <Tooltip formatter={(v: any) => Number(v).toLocaleString()} />
              <Bar dataKey="total_impressions" name="Impressions" radius={[0, 4, 4, 0]}>
                {topPlatforms.map((_: any, i: number) => (
                  <Cell key={i} fill={['#E1306C','#1877F2','#69C9D0','#4285F4','#10B981'][i % 5]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Past scorecards table */}
      {scorecards.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Scorecard history</h2>
            <a href="/scorecards" className="text-xs text-brand-500 hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </a>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                {['Period','Grade','ROAS','Leads','ROI','Goals'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scorecards.slice(0, 6).map(sc => (
                <tr key={sc.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{sc.period_label}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-sm" style={{ color: GRADE_COLORS[sc.performance_grade] || '#6b7280' }}>
                      {sc.performance_grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {parseFloat(sc.blended_roas || 0).toFixed(2)}x
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {Number(sc.total_leads).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {parseFloat(sc.roi_percentage || 0).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="text-green-600">{sc.goals_on_track}✓</span>
                    {sc.goals_at_risk > 0 && <span className="text-amber-500 ml-1">{sc.goals_at_risk}!</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const GOAL_ICONS: Record<string, string> = {
  brand_awareness: '📣', lead_generation: '🎯', sales_conversion: '💰',
  community_growth: '👥', customer_retention: '🔄', content_engagement: '❤️',
  website_traffic: '🌐', app_downloads: '📱', event_promotion: '🎪', custom: '✦',
};

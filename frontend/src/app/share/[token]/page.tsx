'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  TrendingUp, TrendingDown, Zap, Target, AlertTriangle,
  Lightbulb, Users, ArrowUp, ArrowDown, Loader2, Lock,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { reportsApi } from '../../../lib/api';
import { ContentAnalysis } from '../../../components/reports/ContentAnalysis';
import clsx from 'clsx';

const DeltaBadge = ({ value }: { value: number }) => (
  <span className={clsx('flex items-center gap-0.5 text-xs font-semibold',
    value >= 0 ? 'text-green-600' : 'text-red-500')}>
    {value >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
    {Math.abs(value).toFixed(1)}%
  </span>
);

export default function SharedReportPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reportsApi.getShared(token)
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.error || 'Report not found'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 gap-4">
      <div className="w-14 h-14 bg-red-100 dark:bg-red-950/30 rounded-xl flex items-center justify-center">
        <Lock className="w-7 h-7 text-red-500" />
      </div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Report unavailable</h1>
      <p className="text-sm text-gray-400">{error}</p>
    </div>
  );

  const { report, metrics, expiresAt } = data;
  const exec = report.executive_snapshot || {};
  const content = report.content_analysis || {};
  const recs = report.strategic_recommendations || {};
  const risk = report.risk_opportunity || {};
  const funnel = report.funnel_analysis || {};

  const metricsChart = metrics.map((m: any) => ({
    name: m.platform,
    Impressions: Number(m.impressions),
    Conversions: Number(m.conversions),
  }));

  const dirColor = exec.overall_direction === 'growing' ? 'text-green-500'
    : exec.overall_direction === 'declining' ? 'text-red-500' : 'text-amber-500';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Public banner */}
      <div className="bg-brand-600 text-white text-xs text-center py-2 px-4">
        Shared report from <span className="font-semibold">Cerebre Media Africa</span>
        {expiresAt && (
          <span className="ml-2 opacity-75">
            · Expires {new Date(expiresAt).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-medium text-brand-600">Cerebre Media Africa</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {report.period_label}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Marketing Intelligence Report · {new Date(report.created_at).toLocaleDateString('en-NG', { dateStyle: 'long' })}
            </p>
          </div>
          <span className={clsx('flex items-center gap-1 text-sm font-semibold capitalize', dirColor)}>
            {exec.overall_direction === 'growing' && <TrendingUp className="w-4 h-4" />}
            {exec.overall_direction === 'declining' && <TrendingDown className="w-4 h-4" />}
            {exec.overall_direction}
          </span>
        </div>

        {/* Executive Snapshot */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-500" /> Executive snapshot
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="section-title text-green-700 dark:text-green-400 mb-2">Key wins</p>
              <ul className="space-y-1.5">
                {(exec.key_wins || []).map((w: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-green-500 font-bold shrink-0">✓</span>{w}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="section-title text-amber-600 mb-2">Key concerns</p>
              <ul className="space-y-1.5">
                {(exec.key_concerns || []).map((c: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-amber-500 font-bold shrink-0">!</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {exec.strategic_focus && (
            <div className="mt-4 p-4 bg-brand-50 dark:bg-brand-950/20 rounded-lg border border-brand-100 dark:border-brand-800">
              <p className="section-title text-brand-600 mb-1">Strategic focus</p>
              <p className="text-sm text-brand-800 dark:text-brand-300">{exec.strategic_focus}</p>
            </div>
          )}
        </div>

        {/* Metrics chart */}
        {metricsChart.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Platform metrics</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={metricsChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Impressions" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Conversions" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Funnel */}
        {funnel.biggest_drop_off && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" /> Funnel analysis
            </h2>
            <div className="grid sm:grid-cols-3 gap-3 mb-3">
              {[
                { label: 'Traffic', value: funnel.traffic_volume },
                { label: 'Engagement', value: funnel.engagement_rate_overall },
                { label: 'Conversion', value: funnel.conversion_rate_overall },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{value || '—'}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{funnel.biggest_drop_off}</p>
          </div>
        )}

        {/* Content analysis */}
        {content && Object.keys(content).length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" /> Content analysis
            </h2>
            <ContentAnalysis data={content} />
          </div>
        )}

        {/* Recommendations */}
        {(recs.immediate_actions || []).length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-brand-500" /> Strategic recommendations
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {(recs.immediate_actions || []).map((a: any, i: number) => (
                <div key={i} className="p-4 rounded-lg border border-gray-100 dark:border-gray-800 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">{a.action}</p>
                    <span className={clsx('badge shrink-0',
                      a.priority === 'high' ? 'badge-danger' : a.priority === 'medium' ? 'badge-warning' : 'badge-neutral'
                    )}>{a.priority}</span>
                  </div>
                  <p className="text-xs text-gray-500">{a.expected_impact}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk & Opportunity */}
        {risk.biggest_risk && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Risk & opportunity
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-950/10">
                <p className="section-title text-red-600 mb-2">Biggest risk</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{risk.biggest_risk}</p>
                {risk.risk_mitigation && <p className="text-xs text-gray-500 mt-1">{risk.risk_mitigation}</p>}
              </div>
              <div className="p-4 rounded-lg border border-green-100 dark:border-green-900 bg-green-50/50 dark:bg-green-950/10">
                <p className="section-title text-green-600 mb-2">Biggest opportunity</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{risk.biggest_opportunity}</p>
                {risk.opportunity_how_to_capture && <p className="text-xs text-gray-500 mt-1">{risk.opportunity_how_to_capture}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400">
            Generated by <span className="font-medium text-brand-600">Cerebre Media Africa</span> · AI Marketing Intelligence Platform
          </p>
        </div>
      </div>
    </div>
  );
}

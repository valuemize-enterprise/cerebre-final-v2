'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Target, AlertTriangle,
  Lightbulb, Users, Zap, ArrowUp, ArrowDown, Loader2,
  Download, FileJson, FileText as FileCsv,
} from 'lucide-react';
import { reportsApi } from '../../../lib/api';
import { useReportExport } from '../../../hooks/useReportExport';
import { ContentAnalysis } from '../../../components/reports/ContentAnalysis';
import { FunnelVisualizer } from '../../../components/reports/FunnelVisualizer';
import { ReportPageSkeleton } from '../../../components/ui/Skeletons';
import { Breadcrumb } from '../../../components/ui/Breadcrumb';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// ── Sub-components ────────────────────────────────────────────

const Section = ({ title, icon: Icon, children, color = 'text-brand-500' }: any) => (
  <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
    <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
      <Icon className={clsx('w-4 h-4', color)} />
      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
    </div>
    <div className="p-6">{children}</div>
  </section>
);

const Pill = ({ label, variant = 'neutral' }: any) => (
  <span className={clsx(
    'inline-block px-2.5 py-0.5 rounded-full text-xs font-medium',
    variant === 'success' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    variant === 'warning' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    variant === 'danger'  && 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    variant === 'neutral' && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    variant === 'info'    && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  )}>
    {label}
  </span>
);

const DeltaBadge = ({ value }: { value: number }) => (
  <span className={clsx(
    'flex items-center gap-0.5 text-xs font-semibold',
    value >= 0 ? 'text-green-600' : 'text-red-500'
  )}>
    {value >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
    {Math.abs(value).toFixed(1)}%
  </span>
);

const ActionCard = ({ action, priority, impact, effort }: any) => (
  <div className="p-4 rounded-lg border border-gray-100 dark:border-gray-800 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">{action}</p>
      <Pill
        label={priority}
        variant={priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'neutral'}
      />
    </div>
    <p className="text-xs text-gray-500">{impact}</p>
    <div className="flex gap-2">
      <Pill label={`Effort: ${effort}`} variant="neutral" />
    </div>
  </div>
);

// ── Main report page ──────────────────────────────────────────
export default function ReportPage() {
  const params = useParams();
  const reportId = params.reportId as string;
  const [report, setReport] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const { exportReport, exporting } = useReportExport();

  const handleShare = async () => {
    if (shareUrl) { navigator.clipboard.writeText(shareUrl); toast.success('Copied!'); return; }
    setSharing(true);
    try {
      const { data } = await reportsApi.share(reportId);
      setShareUrl(data.shareUrl);
      navigator.clipboard.writeText(data.shareUrl);
      toast.success('Share link created and copied!');
    } catch { toast.error('Failed to create share link'); }
    finally { setSharing(false); }
  };

  useEffect(() => {
    reportsApi.get(reportId)
      .then(({ data }) => {
        setReport(data.report);
        setMetrics(data.metrics || []);
      })
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, [reportId]);

  if (loading) return <ReportPageSkeleton />;
  if (!report) return <p className="p-6 text-gray-400">Report not found.</p>;

  const exec = report.executive_snapshot || {};
  const cross = report.cross_platform_perf || {};
  const platforms = report.platform_breakdown || [];
  const content = report.content_analysis || {};
  const audience = report.audience_insights || {};
  const funnel = report.funnel_analysis || {};
  const worked = report.what_worked_failed || {};
  const recs = report.strategic_recommendations || {};
  const risk = report.risk_opportunity || {};

  // Chart data
  const metricsChartData = metrics.map((m) => ({
    name: m.platform,
    Impressions: m.impressions,
    Clicks: m.clicks,
    Conversions: m.conversions,
  }));

  const radarData = metrics.map((m) => ({
    platform: m.platform,
    Reach: Math.min(100, (m.reach / 100000) * 100),
    Engagement: Math.min(100, (m.engagement_rate || 0) * 100 * 20),
    Conversions: Math.min(100, (m.conversions / 100) * 10),
    Revenue: Math.min(100, (m.revenue / 100000) * 100),
  }));

  const directionColor = exec.overall_direction === 'growing'
    ? 'text-green-500' : exec.overall_direction === 'declining'
    ? 'text-red-500' : 'text-amber-500';

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <Breadcrumb
        crumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Reports', href: '/reports' },
          { label: report.period_label || 'Report' },
        ]}
      />
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {report.period_label}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Analysis report · {new Date(report.created_at).toLocaleDateString('en-NG', { dateStyle: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx('flex items-center gap-1 text-sm font-semibold capitalize', directionColor)}>
            {exec.overall_direction === 'growing' && <TrendingUp className="w-4 h-4" />}
            {exec.overall_direction === 'declining' && <TrendingDown className="w-4 h-4" />}
            {exec.overall_direction || 'Unknown'}
          </span>
          {/* Export buttons */}
          <button
            onClick={handleShare}
            disabled={sharing}
            className="btn-secondary text-xs py-1.5 px-3"
            title={shareUrl ? 'Copy share link' : 'Create share link'}
          >
            {sharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            )}
            {shareUrl ? 'Copy link' : 'Share'}
          </button>
          <button
            className="btn-secondary text-xs py-1.5 px-3"
            title="Export as CSV"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCsv className="w-3.5 h-3.5" />}
            CSV
          </button>
          <button
            onClick={() => exportReport(reportId, 'json')}
            disabled={exporting}
            className="btn-secondary text-xs py-1.5 px-3"
            title="Export as JSON"
          >
            <FileJson className="w-3.5 h-3.5" />
            JSON
          </button>
        </div>
      </div>

      {/* 1. Executive Snapshot */}
      <Section title="Executive snapshot" icon={Zap} color="text-brand-500">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">Key wins</p>
            <ul className="space-y-1.5">
              {(exec.key_wins || []).map((w: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="text-green-500 font-bold shrink-0">✓</span>{w}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Key concerns</p>
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
            <p className="text-xs font-semibold text-brand-700 dark:text-brand-400 uppercase tracking-wider mb-1">
              Strategic focus
            </p>
            <p className="text-sm text-brand-800 dark:text-brand-300">{exec.strategic_focus}</p>
          </div>
        )}
        {exec.cross_platform_insight && (
          <p className="mt-3 text-sm text-gray-500 italic">{exec.cross_platform_insight}</p>
        )}
      </Section>

      {/* Metrics chart */}
      {metricsChartData.length > 0 && (
        <Section title="Platform metrics comparison" icon={BarChart2 as any} color="text-blue-500">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={metricsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="Impressions" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Clicks" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Conversions" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* 2. Platform Breakdown */}
      {platforms.length > 0 && (
        <Section title="Platform breakdown" icon={TrendingUp} color="text-blue-500">
          <div className="space-y-4">
            {platforms.map((p: any, i: number) => (
              <div key={i} className="p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm capitalize text-gray-800 dark:text-gray-200">
                    {p.platform}
                  </p>
                  {p.period && <p className="text-xs text-gray-400">{p.period}</p>}
                </div>
                {(p.key_metrics || []).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    {(p.key_metrics || []).map((m: any, j: number) => (
                      <div key={j} className="text-center">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{m.current}</p>
                        <p className="text-xs text-gray-400">{m.name}</p>
                        {m.change_pct !== undefined && <DeltaBadge value={m.change_pct} />}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-300">{p.insight}</p>
                {p.recommendation && (
                  <p className="mt-2 text-sm text-brand-600 dark:text-brand-400 font-medium">
                    → {p.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 3. Funnel Analysis */}
      <Section title="Funnel analysis" icon={Target} color="text-emerald-500">
        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Traffic', value: funnel.traffic_volume, color: 'bg-blue-500' },
            { label: 'Engagement', value: funnel.engagement_rate_overall, color: 'bg-brand-500' },
            { label: 'Conversion', value: funnel.conversion_rate_overall, color: 'bg-emerald-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className={clsx('w-2 h-2 rounded-full mx-auto mb-2', color)} />
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{value || '—'}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>
        <FunnelVisualizer />
        {funnel.biggest_drop_off && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-800">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
              Biggest drop-off — {funnel.drop_off_stage}
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300">{funnel.biggest_drop_off}</p>
            {funnel.drop_off_reason && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{funnel.drop_off_reason}</p>
            )}
          </div>
        )}
      </Section>

      {/* 4. What Worked vs Failed */}
      {(worked.worked || worked.failed) && (
        <Section title="What worked vs failed" icon={AlertTriangle} color="text-amber-500">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">What worked</p>
              <div className="space-y-2">
                {(worked.worked || []).map((w: any, i: number) => (
                  <div key={i} className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-100 dark:border-green-900">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{w.what}</p>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-1">{w.evidence}</p>
                    {w.why_it_worked && (
                      <p className="text-xs text-gray-500 mt-1">{w.why_it_worked}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">What failed</p>
              <div className="space-y-2">
                {(worked.failed || []).map((f: any, i: number) => (
                  <div key={i} className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{f.what}</p>
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{f.evidence}</p>
                    {f.why_it_failed && (
                      <p className="text-xs text-gray-500 mt-1">{f.why_it_failed}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* 5. Strategic Recommendations */}
      <Section title="Strategic recommendations" icon={Lightbulb} color="text-brand-500">
        {(recs.immediate_actions || []).length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Immediate actions
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {(recs.immediate_actions || []).map((a: any, i: number) => (
                <ActionCard key={i} {...a} />
              ))}
            </div>
          </div>
        )}
        {(recs.growth_experiments || []).length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Growth experiments
            </p>
            <div className="space-y-2">
              {(recs.growth_experiments || []).map((e: any, i: number) => (
                <div key={i} className="p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{e.experiment}</p>
                  <p className="text-xs text-gray-500 mt-1">{e.hypothesis}</p>
                  <div className="flex gap-3 mt-2">
                    <Pill label={`KPI: ${e.kpi}`} variant="info" />
                    <Pill label={e.timeline} variant="neutral" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {recs.platform_focus_strategy && (
          <div className="p-4 bg-brand-50 dark:bg-brand-950/20 rounded-lg border border-brand-100 dark:border-brand-800">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1">Platform focus</p>
            <p className="text-sm text-brand-800 dark:text-brand-300">{recs.platform_focus_strategy}</p>
          </div>
        )}
      </Section>

      {/* Content analysis */}
      {content && Object.keys(content).length > 0 && (
        <Section title="Content analysis" icon={Lightbulb} color="text-amber-500">
          <ContentAnalysis data={content} />
        </Section>
      )}

      {/* 6. Risk & Opportunity */}
      <Section title="Risk & opportunity" icon={AlertTriangle} color="text-red-500">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Biggest risk</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{risk.biggest_risk}</p>
            {risk.risk_mitigation && (
              <p className="text-xs text-gray-500 mt-2">{risk.risk_mitigation}</p>
            )}
          </div>
          <div className="p-4 rounded-lg border border-green-100 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">Biggest opportunity</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{risk.biggest_opportunity}</p>
            {risk.opportunity_how_to_capture && (
              <p className="text-xs text-gray-500 mt-2">{risk.opportunity_how_to_capture}</p>
            )}
          </div>
        </div>
      </Section>

      {/* Audience */}
      {audience.primary_location && (
        <Section title="Audience insights" icon={Users} color="text-blue-500">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Primary location</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">{audience.primary_location}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Device split</p>
              {audience.device_split && (
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  {audience.device_split.mobile}% mobile
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Nigeria insight</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {audience.nigeria_specific_insight || '—'}
              </p>
            </div>
          </div>
          {audience.audience_behavior_insight && (
            <p className="mt-3 text-sm text-gray-500 italic">{audience.audience_behavior_insight}</p>
          )}
        </Section>
      )}
    </div>
  );
}

function BarChart2({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

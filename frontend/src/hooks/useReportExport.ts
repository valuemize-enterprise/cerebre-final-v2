'use client';
import { useState, useCallback } from 'react';
import { reportsApi } from '../lib/api';
import toast from 'react-hot-toast';

type ExportFormat = 'json' | 'csv';

const flattenForCSV = (report: any, metrics: any[]): string => {
  const rows: string[][] = [];
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  // ── Executive Snapshot ──
  rows.push(['Section', 'Field', 'Value']);
  const exec = report.executive_snapshot || {};
  rows.push(['Executive Snapshot', 'Direction', exec.overall_direction || '']);
  rows.push(['Executive Snapshot', 'Strategic Focus', exec.strategic_focus || '']);
  (exec.key_wins || []).forEach((w: string, i: number) =>
    rows.push(['Executive Snapshot', `Win ${i + 1}`, w])
  );
  (exec.key_concerns || []).forEach((c: string, i: number) =>
    rows.push(['Executive Snapshot', `Concern ${i + 1}`, c])
  );

  rows.push(['', '', '']);

  // ── Platform Metrics ──
  if (metrics.length > 0) {
    rows.push(['Platform Metrics', '', '']);
    rows.push([
      'Platform', 'Period Start', 'Period End',
      'Impressions', 'Reach', 'Followers Total', 'Followers Gained',
      'Likes', 'Comments', 'Shares', 'Clicks', 'Engagement Rate (%)',
      'Website Visits', 'Sessions', 'Conversions', 'Conversion Rate (%)',
      'Revenue (₦)', 'Ad Spend', 'ROAS', 'Posts Published',
    ]);
    metrics.forEach((m) => {
      rows.push([
        m.platform, m.report_period_start || '', m.report_period_end || '',
        m.impressions, m.reach, m.followers_total, m.followers_gained,
        m.likes, m.comments, m.shares, m.clicks,
        (parseFloat(m.engagement_rate) * 100).toFixed(2),
        m.website_visits, m.sessions, m.conversions,
        (parseFloat(m.conversion_rate) * 100).toFixed(2),
        m.revenue, m.ad_spend, m.roas, m.posts_published,
      ]);
    });
  }

  rows.push(['', '', '']);

  // ── Platform Breakdown insights ──
  const breakdown = report.platform_breakdown || [];
  if (breakdown.length > 0) {
    rows.push(['Platform Insights', '', '']);
    rows.push(['Platform', 'Insight', 'Business Implication', 'Recommendation']);
    breakdown.forEach((p: any) => {
      rows.push([p.platform || '', p.insight || '', p.business_implication || '', p.recommendation || '']);
    });
  }

  rows.push(['', '', '']);

  // ── Recommendations ──
  const recs = report.strategic_recommendations || {};
  if ((recs.immediate_actions || []).length > 0) {
    rows.push(['Strategic Actions', '', '']);
    rows.push(['Action', 'Priority', 'Expected Impact', 'Effort']);
    (recs.immediate_actions || []).forEach((a: any) => {
      rows.push([a.action || '', a.priority || '', a.expected_impact || '', a.effort || '']);
    });
  }

  rows.push(['', '', '']);

  // ── Risk & Opportunity ──
  const ro = report.risk_opportunity || {};
  rows.push(['Risk & Opportunity', '', '']);
  rows.push(['Risk & Opportunity', 'Biggest Risk', ro.biggest_risk || '']);
  rows.push(['Risk & Opportunity', 'Risk Mitigation', ro.risk_mitigation || '']);
  rows.push(['Risk & Opportunity', 'Biggest Opportunity', ro.biggest_opportunity || '']);
  rows.push(['Risk & Opportunity', 'How to Capture', ro.opportunity_how_to_capture || '']);

  return rows.map((row) => row.map(esc).join(',')).join('\n');
};

export const useReportExport = () => {
  const [exporting, setExporting] = useState(false);

  const exportReport = useCallback(async (reportId: string, format: ExportFormat = 'csv') => {
    setExporting(true);
    try {
      const { data } = await reportsApi.get(reportId);
      const { report, metrics } = data;

      let blob: Blob;
      let filename: string;
      const period = (report.period_label || 'report').replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '');

      if (format === 'json') {
        const exportData = {
          period_label: report.period_label,
          created_at: report.created_at,
          executive_snapshot: report.executive_snapshot,
          cross_platform_perf: report.cross_platform_perf,
          platform_breakdown: report.platform_breakdown,
          content_analysis: report.content_analysis,
          audience_insights: report.audience_insights,
          funnel_analysis: report.funnel_analysis,
          what_worked_failed: report.what_worked_failed,
          strategic_recommendations: report.strategic_recommendations,
          risk_opportunity: report.risk_opportunity,
          metrics,
        };
        blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        filename = `cerebre_report_${period}.json`;
      } else {
        const csv = flattenForCSV(report, metrics);
        blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        filename = `cerebre_report_${period}.csv`;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported as ${filename}`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportReport, exporting };
};

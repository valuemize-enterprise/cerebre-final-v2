/**
 * PDF Report Generator
 *
 * Generates beautiful, branded board-ready PDF reports.
 * Uses the existing analysis report data + brand health score.
 *
 * Output: A professional 8-12 page PDF in Cerebre branding.
 * Clients download this for their board presentations.
 *
 * Dependencies: puppeteer (already available on Render/Railway)
 * Fallback: HTML template if puppeteer is unavailable
 */

const path   = require('path');
const { query } = require('../db/db');
const { getCachedBrand } = require('./cache.service');
const logger = require('../utils/logger');

// ── Build the HTML template for the report ───────────────────────
const buildReportHTML = (report, brand, goals) => {
  const score = Math.round(report.clarity_score || report.overall_score || 0);
  const scoreColour = score >= 80 ? '#059669' : score >= 60 ? '#6d28d9' : score >= 40 ? '#d97706' : '#dc2626';
  const scoreLabel = score >= 80 ? 'EXCELLENT' : score >= 60 ? 'HEALTHY' : score >= 40 ? 'DEVELOPING' : 'NEEDS ATTENTION';

  const analysis = (() => {
    try { return typeof report.analysis === 'string' ? JSON.parse(report.analysis) : (report.analysis || {}); }
    catch { return {}; }
  })();

  const highlights = (() => {
    try { return typeof report.key_highlights === 'string' ? JSON.parse(report.key_highlights) : (report.key_highlights || []); }
    catch { return []; }
  })();

  const recommendations = analysis.agency_recommendations || analysis.recommendations || [];
  const platforms = analysis.platform_performance || {};

  const goalRows = goals.slice(0, 5).map(g => {
    const pct = Math.min(100, Math.round(parseFloat(g.progress_pct || 0)));
    const statusColour = g.status === 'achieved' ? '#059669' : g.status === 'at_risk' ? '#dc2626' : '#6d28d9';
    return `
      <tr>
        <td style="padding:10px 14px;font-size:13px;color:#374151;">${g.title}</td>
        <td style="padding:10px 14px;">
          <div style="height:6px;background:#f3f4f6;border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${statusColour};border-radius:3px;"></div>
          </div>
        </td>
        <td style="padding:10px 14px;font-size:13px;font-weight:700;color:${statusColour};text-align:right;">${pct}%</td>
        <td style="padding:10px 14px;font-size:11px;font-weight:700;color:${statusColour};text-align:right;text-transform:uppercase;">${g.status || 'IN PROGRESS'}</td>
      </tr>
    `;
  }).join('');

  const platformBlocks = Object.entries(platforms).slice(0, 6).map(([platform, data]: [string, any]) => {
    const grade = data.health_grade || data.grade || 'B';
    const gradeColour = grade === 'A' ? '#059669' : grade === 'B' ? '#6d28d9' : grade === 'C' ? '#d97706' : '#dc2626';
    return `
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <p style="font-size:14px;font-weight:700;color:#111827;text-transform:capitalize;">${platform.replace('_', ' ')}</p>
          <span style="width:28px;height:28px;border-radius:8px;background:${gradeColour};color:white;font-size:13px;font-weight:900;display:inline-flex;align-items:center;justify-content:center;">${grade}</span>
        </div>
        ${data.top_metrics ? `
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
            ${Object.entries(data.top_metrics || {}).slice(0, 3).map(([k, v]: [string, any]) => `
              <div>
                <p style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">${k.replace('_', ' ')}</p>
                <p style="font-size:16px;font-weight:800;color:#111827;">${typeof v === 'number' ? v.toLocaleString() : v}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${data.key_action ? `<p style="font-size:12px;color:#6b7280;margin-top:8px;padding-top:8px;border-top:1px solid #f3f4f6;">▸ ${data.key_action}</p>` : ''}
      </div>
    `;
  }).join('');

  const recBlocks = recommendations.slice(0, 3).map((rec: any, i: number) => `
    <div style="display:flex;gap:14px;padding:14px;background:#f9fafb;border-radius:10px;margin-bottom:10px;">
      <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#6d28d9,#a78bfa);color:white;font-size:13px;font-weight:900;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${i + 1}</div>
      <div>
        <p style="font-size:13px;font-weight:700;color:#111827;margin-bottom:4px;">${rec.action || rec.recommendation || rec}</p>
        ${rec.expected_outcome ? `<p style="font-size:12px;color:#6b7280;">Expected: ${rec.expected_outcome}</p>` : ''}
        ${rec.timeline ? `<p style="font-size:11px;color:#9ca3af;margin-top:2px;">Timeline: ${rec.timeline}</p>` : ''}
      </div>
    </div>
  `).join('');

  const watchList = (analysis.watch_list || []).slice(0, 3).map((item: any) => `
    <li style="font-size:13px;color:#374151;margin-bottom:8px;padding-left:4px;">
      <span style="color:#6d28d9;font-weight:700;">▸</span> ${typeof item === 'string' ? item : JSON.stringify(item)}
    </li>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; background: white; }
  @page { size: A4; margin: 0; }
  .page { width: 210mm; min-height: 297mm; padding: 0; page-break-after: always; }
</style>
</head>
<body>

<!-- PAGE 1: COVER -->
<div class="page" style="background:linear-gradient(135deg,#060320 0%,#1e1b4b 50%,#4c1d95 100%);display:flex;flex-direction:column;padding:48px;">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:auto;">
    <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#a78bfa);display:flex;align-items:center;justify-content:center;">
      <span style="color:white;font-weight:900;font-size:18px;">⚡</span>
    </div>
    <div>
      <p style="color:white;font-weight:900;font-size:16px;">Cerebre Intelligence</p>
      <p style="color:#a78bfa;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Client Intelligence Report</p>
    </div>
  </div>

  <div style="margin:auto 0;">
    <p style="font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;">⚡ ClarityScore™ Report</p>
    <h1 style="font-size:52px;font-weight:900;color:white;line-height:1;margin-bottom:16px;letter-spacing:-2px;">${brand?.name || 'Brand'}</h1>
    <p style="font-size:20px;color:#a78bfa;margin-bottom:40px;">${report.period_label || 'Performance Report'}</p>

    <div style="display:inline-flex;align-items:center;gap:24px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:20px 32px;">
      <div style="text-align:center;">
        <p style="font-size:52px;font-weight:900;color:${scoreColour};">${score}</p>
        <p style="font-size:11px;font-weight:700;color:${scoreColour};text-transform:uppercase;letter-spacing:0.1em;">ClarityScore™</p>
      </div>
      <div style="width:1px;height:48px;background:rgba(255,255,255,0.15);"></div>
      <div>
        <p style="font-size:20px;font-weight:800;color:white;">${scoreLabel}</p>
        <p style="font-size:13px;color:#a78bfa;">${brand?.industry || ''}</p>
      </div>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;padding-top:32px;border-top:1px solid rgba(255,255,255,0.1);">
    <p style="font-size:12px;color:rgba(255,255,255,0.4);">Prepared by Cerebre Media Africa · cerebre.media</p>
    <p style="font-size:12px;color:rgba(255,255,255,0.4);">Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  </div>
</div>

<!-- PAGE 2: EXECUTIVE SUMMARY -->
<div class="page" style="padding:48px;">
  <div style="border-bottom:3px solid #6d28d9;padding-bottom:16px;margin-bottom:32px;display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <p style="font-size:11px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Executive Summary</p>
      <h2 style="font-size:28px;font-weight:900;color:#111827;">The Month in Review</h2>
    </div>
    <p style="font-size:12px;color:#9ca3af;">${brand?.name} · ${report.period_label || ''}</p>
  </div>

  ${analysis.headline ? `
    <div style="background:#f9f5ff;border-left:4px solid #6d28d9;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:28px;">
      <p style="font-size:15px;font-weight:700;color:#4c1d95;line-height:1.6;">${analysis.headline}</p>
    </div>
  ` : ''}

  ${highlights.length > 0 ? `
    <h3 style="font-size:15px;font-weight:800;color:#111827;margin-bottom:14px;">Key highlights</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:28px;">
      ${highlights.slice(0, 4).map((h: any) => `
        <div style="background:#f9fafb;border-radius:10px;padding:14px;border:1px solid #e5e7eb;">
          <p style="font-size:13px;color:#374151;">${typeof h === 'string' ? h : (h.text || JSON.stringify(h))}</p>
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${analysis.board_summary || analysis.executive_summary ? `
    <h3 style="font-size:15px;font-weight:800;color:#111827;margin-bottom:10px;">Board summary</h3>
    <p style="font-size:14px;color:#374151;line-height:1.8;margin-bottom:28px;">${analysis.board_summary || analysis.executive_summary}</p>
  ` : ''}

  ${goals.length > 0 ? `
    <h3 style="font-size:15px;font-weight:800;color:#111827;margin-bottom:14px;">Goal performance</h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Goal</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Progress</th>
          <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">%</th>
          <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Status</th>
        </tr>
      </thead>
      <tbody>${goalRows}</tbody>
    </table>
  ` : ''}
</div>

<!-- PAGE 3: PLATFORM PERFORMANCE -->
<div class="page" style="padding:48px;">
  <div style="border-bottom:3px solid #6d28d9;padding-bottom:16px;margin-bottom:32px;">
    <p style="font-size:11px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Platform Intelligence</p>
    <h2 style="font-size:28px;font-weight:900;color:#111827;">Performance by Channel</h2>
  </div>
  ${platformBlocks || '<p style="color:#9ca3af;font-size:14px;">Platform data will appear here once platforms are connected or reports are uploaded.</p>'}
</div>

<!-- PAGE 4: RECOMMENDATIONS -->
<div class="page" style="padding:48px;">
  <div style="border-bottom:3px solid #6d28d9;padding-bottom:16px;margin-bottom:32px;">
    <p style="font-size:11px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Strategic Guidance</p>
    <h2 style="font-size:28px;font-weight:900;color:#111827;">The Agency Recommends</h2>
  </div>

  ${recBlocks || '<p style="color:#9ca3af;font-size:14px;">Recommendations will appear in the next AI-generated report.</p>'}

  ${watchList ? `
    <h3 style="font-size:15px;font-weight:800;color:#111827;margin-top:28px;margin-bottom:14px;">Watch List</h3>
    <ul style="list-style:none;">${watchList}</ul>
  ` : ''}

  <div style="margin-top:auto;padding-top:40px;border-top:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <p style="font-size:13px;font-weight:700;color:#111827;">Cerebre Media Africa</p>
      <p style="font-size:11px;color:#9ca3af;">World-class marketing intelligence for African brands</p>
    </div>
    <div style="text-align:right;">
      <p style="font-size:11px;color:#9ca3af;">This report was generated by Cerebre Intelligence Suite™</p>
      <p style="font-size:11px;color:#9ca3af;">cerebre.media · hello@cerebre.media</p>
    </div>
  </div>
</div>

</body>
</html>`;
};

// ── Generate PDF using puppeteer ──────────────────────────────────
const generatePDF = async (reportId, brandId) => {
  const [reportRes, brand, goals] = await Promise.all([
    query('SELECT * FROM analysis_reports WHERE id=$1 AND brand_id=$2', [reportId, brandId]),
    getCachedBrand(brandId),
    query('SELECT * FROM priority_goals WHERE brand_id=$1 AND is_active=true ORDER BY priority_rank', [brandId]),
  ]);

  const report = reportRes.rows[0];
  if (!report) throw new Error('Report not found');

  const html = buildReportHTML(report, brand, goals.rows);

  // Try puppeteer first, fall back to HTML
  let pdfBuffer;
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    await browser.close();
  } catch (puppeteerErr) {
    logger.warn('[PDF] Puppeteer unavailable, using HTML response', { error: puppeteerErr.message });
    return { html, format: 'html' };
  }

  return { buffer: pdfBuffer, format: 'pdf' };
};

// ── Build report HTML for a given brand (for reports without analysis) ──
const generateSimplePDF = async (brandId, periodLabel = 'Monthly Report') => {
  const [brand, goals] = await Promise.all([
    getCachedBrand(brandId),
    query('SELECT * FROM priority_goals WHERE brand_id=$1 AND is_active=true ORDER BY priority_rank', [brandId]),
  ]);

  const fakeReport = {
    period_label: periodLabel,
    clarity_score: null,
    overall_score: null,
    analysis: '{}',
    key_highlights: '[]',
  };

  const html = buildReportHTML(fakeReport, brand, goals.rows);
  return { html, format: 'html' };
};

module.exports = { generatePDF, generateSimplePDF, buildReportHTML };

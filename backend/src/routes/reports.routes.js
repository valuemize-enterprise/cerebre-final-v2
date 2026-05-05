const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { analysisRateLimit, retryRateLimit } = require('../middleware/ratelimit.middleware');
const { analysisQueue, ocrQueue } = require('../workers/queue');
const { query } = require('../db/db');
const logger = require('../utils/logger');

const router = express.Router();

// NOTE: All specific routes MUST come before /:reportId

// ── POST /reports/analyze ─────────────────────────────────────
router.post('/analyze', authenticate, analysisRateLimit, asyncHandler(async (req, res) => {
  const { fileId, comparisonFileId } = req.body;
  if (!fileId) return res.status(400).json({ error: 'fileId required' });
  const fileResult = await query(
    'SELECT id, status FROM report_files WHERE id = $1 AND user_id = $2',
    [fileId, req.user.userId]
  );
  if (fileResult.rows.length === 0) return res.status(404).json({ error: 'File not found' });
  if (['uploaded', 'processing'].includes(fileResult.rows[0].status))
    return res.status(409).json({ error: 'File is still being processed' });
  const job = await analysisQueue.add({ fileId, userId: req.user.userId, comparisonFileId: comparisonFileId || null });
  res.status(202).json({ message: 'Analysis queued', jobId: job.id, fileId });
}));

// ── POST /reports/retry/:fileId ───────────────────────────────
router.post('/retry/:fileId', authenticate, retryRateLimit, asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const result = await query(
    'SELECT id, status, s3_key, file_type FROM report_files WHERE id = $1 AND user_id = $2',
    [fileId, req.user.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'File not found' });
  const file = result.rows[0];
  await query("UPDATE report_files SET status='uploaded', error_message=NULL WHERE id=$1", [fileId]);
  await query("UPDATE processing_jobs SET status='pending', attempts=0, error=NULL, started_at=NULL, finished_at=NULL WHERE file_id=$1", [fileId]);
  const job = await ocrQueue.add(
    { fileId, userId: req.user.userId, s3Key: file.s3_key, mimeType: file.file_type },
    { jobId: `ocr-retry-${fileId}-${Date.now()}` }
  );
  logger.info('[Reports] Retry queued', { fileId, jobId: job.id });
  res.json({ message: 'File queued for retry', jobId: job.id });
}));

// ── GET /reports/summary/dashboard ───────────────────────────
router.get('/summary/dashboard', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const [filesCount, reportsCount, latestReport, topPlatforms] = await Promise.all([
    query('SELECT COUNT(*) FROM report_files WHERE user_id=$1', [userId]),
    query('SELECT COUNT(*) FROM analysis_reports WHERE user_id=$1', [userId]),
    query(`SELECT id, period_label, executive_snapshot, created_at FROM analysis_reports WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`, [userId]),
    query(`SELECT platform, SUM(impressions) AS total_impressions, AVG(engagement_rate) AS avg_engagement, SUM(conversions) AS total_conversions FROM platform_metrics WHERE user_id=$1 GROUP BY platform ORDER BY total_impressions DESC LIMIT 5`, [userId]),
  ]);
  res.json({
    stats: { totalFiles: parseInt(filesCount.rows[0].count), totalReports: parseInt(reportsCount.rows[0].count) },
    latestReport: latestReport.rows[0] || null,
    topPlatforms: topPlatforms.rows,
  });
}));

// ── GET /reports/history/metrics ─────────────────────────────
router.get('/history/metrics', authenticate, asyncHandler(async (req, res) => {
  const { platform, months = 6 } = req.query;
  const platformFilter = platform ? 'AND pm.platform = $3' : '';
  const params = [req.user.userId, parseInt(months)];
  if (platform) params.push(platform);
  const result = await query(
    `SELECT pm.platform, pm.report_period_start, pm.report_period_end,
            pm.impressions, pm.reach, pm.engagement_rate, pm.followers_gained,
            pm.conversions, pm.revenue, pm.website_visits, pm.ad_spend, pm.roas
     FROM platform_metrics pm
     WHERE pm.user_id=$1 AND pm.report_period_start >= NOW() - ($2||' months')::INTERVAL ${platformFilter}
     ORDER BY pm.report_period_start ASC, pm.platform`, params
  );
  const grouped = result.rows.reduce((acc, row) => {
    if (!acc[row.platform]) acc[row.platform] = [];
    acc[row.platform].push({
      period: row.report_period_start,
      periodEnd: row.report_period_end,
      impressions: Number(row.impressions),
      reach: Number(row.reach),
      engagementRate: parseFloat(row.engagement_rate),
      followersGained: Number(row.followers_gained),
      conversions: Number(row.conversions),
      revenue: parseFloat(row.revenue),
      websiteVisits: Number(row.website_visits),
      adSpend: parseFloat(row.ad_spend),
      roas: parseFloat(row.roas),
    });
    return acc;
  }, {});
  res.json({ platforms: grouped, months: parseInt(months) });
}));

// ── GET /reports/compare/:a/:b ────────────────────────────────
router.get('/compare/:reportIdA/:reportIdB', authenticate, asyncHandler(async (req, res) => {
  const { reportIdA, reportIdB } = req.params;
  const result = await query(
    `SELECT id, period_label, executive_snapshot, platform_breakdown,
            strategic_recommendations, risk_opportunity, file_ids, created_at
     FROM analysis_reports WHERE id=ANY($1) AND user_id=$2`,
    [[reportIdA, reportIdB], req.user.userId]
  );
  if (result.rows.length !== 2) return res.status(404).json({ error: 'One or both reports not found' });
  const [a, b] = result.rows.sort((x, y) => new Date(x.created_at) - new Date(y.created_at));
  const [mA, mB] = await Promise.all([
    query('SELECT platform, impressions, reach, engagement_rate, conversions, revenue, clicks FROM platform_metrics WHERE file_id=ANY($1)', [a.file_ids]),
    query('SELECT platform, impressions, reach, engagement_rate, conversions, revenue, clicks FROM platform_metrics WHERE file_id=ANY($1)', [b.file_ids]),
  ]);
  res.json({ periodA: { ...a, metrics: mA.rows }, periodB: { ...b, metrics: mB.rows } });
}));

// ── GET /reports/shared/:token — public (no auth) ─────────────
router.get('/shared/:token', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, period_label, executive_snapshot, cross_platform_perf, platform_breakdown,
            content_analysis, audience_insights, funnel_analysis, what_worked_failed,
            strategic_recommendations, risk_opportunity, file_ids, created_at, share_expires_at
     FROM analysis_reports WHERE share_token=$1`, [req.params.token]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Shared report not found' });
  const report = result.rows[0];
  if (report.share_expires_at && new Date(report.share_expires_at) < new Date())
    return res.status(410).json({ error: 'This share link has expired' });
  const metrics = await query(
    'SELECT platform, impressions, reach, engagement_rate, conversions, revenue FROM platform_metrics WHERE file_id=ANY($1)',
    [report.file_ids]
  );
  const { share_expires_at, ...safeReport } = report;
  res.json({ report: safeReport, metrics: metrics.rows, expiresAt: share_expires_at });
}));

// ── POST /reports/:reportId/share ─────────────────────────────
router.post('/:reportId/share', authenticate, asyncHandler(async (req, res) => {
  const { expiresInDays = 7 } = req.body;
  const exists = await query('SELECT id FROM analysis_reports WHERE id=$1 AND user_id=$2', [req.params.reportId, req.user.userId]);
  if (exists.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
  const shareToken = uuidv4().replace(/-/g, '');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  await query('UPDATE analysis_reports SET share_token=$1, share_expires_at=$2 WHERE id=$3', [shareToken, expiresAt.toISOString(), req.params.reportId]);
  res.json({ shareToken, shareUrl: `${process.env.FRONTEND_URL}/share/${shareToken}`, expiresAt });
}));

// ── DELETE /reports/:reportId/share ──────────────────────────
router.delete('/:reportId/share', authenticate, asyncHandler(async (req, res) => {
  await query('UPDATE analysis_reports SET share_token=NULL, share_expires_at=NULL WHERE id=$1 AND user_id=$2', [req.params.reportId, req.user.userId]);
  res.json({ message: 'Share link revoked' });
}));

// ── GET /reports — list ───────────────────────────────────────
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const result = await query(
    `SELECT id, period_label, report_type, created_at,
            executive_snapshot->>'overall_direction' AS direction,
            executive_snapshot->>'strategic_focus' AS strategic_focus,
            array_length(file_ids,1) AS file_count,
            share_token IS NOT NULL AS is_shared,
            prompt_tokens, completion_tokens
     FROM analysis_reports WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [req.user.userId, parseInt(limit), offset]
  );
  const count = await query('SELECT COUNT(*) FROM analysis_reports WHERE user_id=$1', [req.user.userId]);
  res.json({ reports: result.rows, pagination: { total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) } });
}));

// ── GET /reports/:reportId — MUST be last ─────────────────────
router.get('/:reportId', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, user_id, file_ids, period_label, report_type,
            executive_snapshot, cross_platform_perf, platform_breakdown,
            content_analysis, audience_insights, funnel_analysis,
            what_worked_failed, strategic_recommendations, risk_opportunity,
            comparison_delta, share_token, share_expires_at,
            prompt_tokens, completion_tokens, created_at
     FROM analysis_reports WHERE id=$1 AND user_id=$2`,
    [req.params.reportId, req.user.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
  const report = result.rows[0];
  const metricsResult = await query(
    `SELECT platform, impressions, reach, followers_total, followers_gained,
            likes, comments, shares, clicks, engagement_rate, website_visits,
            sessions, conversions, conversion_rate, revenue, ad_spend, roas,
            posts_published, report_period_start, report_period_end
     FROM platform_metrics WHERE file_id=ANY($1) ORDER BY platform`,
    [report.file_ids]
  );
  res.json({ report, metrics: metricsResult.rows });
}));

module.exports = router;

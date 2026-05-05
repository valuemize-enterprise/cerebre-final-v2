const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { query } = require('../db/db');

const router = express.Router();

// ── GET /metrics/platforms — aggregate per platform ──────────
router.get(
  '/platforms',
  authenticate,
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;

    const dateFilter =
      from && to
        ? `AND pm.report_period_start >= $2 AND pm.report_period_end <= $3`
        : '';
    const params = from && to
      ? [req.user.userId, from, to]
      : [req.user.userId];

    const result = await query(
      `SELECT
         pm.platform,
         COUNT(DISTINCT pm.file_id)          AS periods_tracked,
         SUM(pm.impressions)                 AS total_impressions,
         SUM(pm.reach)                       AS total_reach,
         AVG(pm.engagement_rate)             AS avg_engagement_rate,
         SUM(pm.followers_gained)            AS total_followers_gained,
         SUM(pm.likes + pm.comments + pm.shares + pm.clicks) AS total_interactions,
         SUM(pm.conversions)                 AS total_conversions,
         SUM(pm.revenue)                     AS total_revenue,
         SUM(pm.ad_spend)                    AS total_ad_spend,
         AVG(pm.roas)                        AS avg_roas,
         SUM(pm.posts_published + pm.stories_published + pm.videos_published) AS total_content,
         MAX(pm.report_period_end)           AS latest_period
       FROM platform_metrics pm
       WHERE pm.user_id = $1 ${dateFilter}
       GROUP BY pm.platform
       ORDER BY total_impressions DESC`,
      params
    );

    res.json({ platforms: result.rows });
  })
);

// ── GET /metrics/platforms/:platform — single platform detail ─
router.get(
  '/platforms/:platform',
  authenticate,
  asyncHandler(async (req, res) => {
    const { platform } = req.params;
    const { months = 12 } = req.query;

    const result = await query(
      `SELECT
         pm.*,
         rf.original_name AS source_file
       FROM platform_metrics pm
       JOIN report_files rf ON rf.id = pm.file_id
       WHERE pm.user_id = $1
         AND pm.platform = $2
         AND pm.report_period_start >= NOW() - ($3 || ' months')::INTERVAL
       ORDER BY pm.report_period_start ASC`,
      [req.user.userId, platform, parseInt(months)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `No data found for platform: ${platform}` });
    }

    // Compute MoM deltas
    const rows = result.rows;
    const NUMERIC_FIELDS = [
      'impressions', 'reach', 'engagement_rate', 'followers_gained',
      'clicks', 'conversions', 'revenue', 'ad_spend', 'roas',
    ];

    const enriched = rows.map((row, i) => {
      if (i === 0) return { ...row, deltas: {} };
      const prev = rows[i - 1];
      const deltas = {};
      NUMERIC_FIELDS.forEach((f) => {
        const c = Number(row[f]) || 0;
        const p = Number(prev[f]) || 0;
        deltas[f] = p > 0 ? parseFloat(((c - p) / p * 100).toFixed(2)) : 0;
      });
      return { ...row, deltas };
    });

    // Summary stats
    const latest = rows[rows.length - 1];
    const first = rows[0];

    res.json({
      platform,
      periods: enriched,
      summary: {
        totalPeriods: rows.length,
        latestPeriod: latest.report_period_end,
        impressionsGrowth:
          first.impressions > 0
            ? parseFloat(((latest.impressions - first.impressions) / first.impressions * 100).toFixed(2))
            : 0,
        avgEngagementRate: parseFloat(
          (rows.reduce((s, r) => s + Number(r.engagement_rate), 0) / rows.length * 100).toFixed(4)
        ),
        totalRevenue: rows.reduce((s, r) => s + Number(r.revenue), 0),
        totalConversions: rows.reduce((s, r) => s + Number(r.conversions), 0),
      },
    });
  })
);

// ── GET /metrics/compare — compare two date ranges ───────────
router.get(
  '/compare',
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentStart, currentEnd, prevStart, prevEnd, platform } = req.query;

    if (!currentStart || !currentEnd || !prevStart || !prevEnd) {
      return res.status(400).json({
        error: 'Required: currentStart, currentEnd, prevStart, prevEnd',
      });
    }

    const platformFilter = platform ? 'AND platform = $6' : '';
    const params = platform
      ? [req.user.userId, currentStart, currentEnd, prevStart, prevEnd, platform]
      : [req.user.userId, currentStart, currentEnd, prevStart, prevEnd];

    const result = await query(
      `SELECT
         platform,
         SUM(CASE WHEN report_period_start >= $2 AND report_period_end <= $3
           THEN impressions ELSE 0 END)          AS cur_impressions,
         SUM(CASE WHEN report_period_start >= $4 AND report_period_end <= $5
           THEN impressions ELSE 0 END)          AS prev_impressions,
         SUM(CASE WHEN report_period_start >= $2 AND report_period_end <= $3
           THEN reach ELSE 0 END)                AS cur_reach,
         SUM(CASE WHEN report_period_start >= $4 AND report_period_end <= $5
           THEN reach ELSE 0 END)                AS prev_reach,
         AVG(CASE WHEN report_period_start >= $2 AND report_period_end <= $3
           THEN engagement_rate END)             AS cur_engagement,
         AVG(CASE WHEN report_period_start >= $4 AND report_period_end <= $5
           THEN engagement_rate END)             AS prev_engagement,
         SUM(CASE WHEN report_period_start >= $2 AND report_period_end <= $3
           THEN conversions ELSE 0 END)          AS cur_conversions,
         SUM(CASE WHEN report_period_start >= $4 AND report_period_end <= $5
           THEN conversions ELSE 0 END)          AS prev_conversions,
         SUM(CASE WHEN report_period_start >= $2 AND report_period_end <= $3
           THEN revenue ELSE 0 END)              AS cur_revenue,
         SUM(CASE WHEN report_period_start >= $4 AND report_period_end <= $5
           THEN revenue ELSE 0 END)              AS prev_revenue
       FROM platform_metrics
       WHERE user_id = $1 ${platformFilter}
       GROUP BY platform
       ORDER BY cur_impressions DESC`,
      params
    );

    // Calculate deltas
    const withDeltas = result.rows.map((r) => {
      const delta = () => {
        const c = Number(cur) || 0, p = Number(prev) || 0;
        return p > 0 ? parseFloat(((c - p) / p * 100).toFixed(2)) : 0;
      };
      return {
        ...r,
        delta_impressions: delta(r.cur_impressions, r.prev_impressions),
        delta_reach: delta(r.cur_reach, r.prev_reach),
        delta_engagement: delta(r.cur_engagement, r.prev_engagement),
        delta_conversions: delta(r.cur_conversions, r.prev_conversions),
        delta_revenue: delta(r.cur_revenue, r.prev_revenue),
      };
    });

    res.json({
      current: { start: currentStart, end: currentEnd },
      previous: { start: prevStart, end: prevEnd },
      platforms: withDeltas,
    });
  })
);

// ── GET /metrics/funnel — cross-platform funnel summary ───────
router.get(
  '/funnel',
  authenticate,
  asyncHandler(async (req, res) => {
    const { months = 1 } = req.query;

    const result = await query(
      `SELECT
         SUM(impressions)                              AS total_impressions,
         SUM(reach)                                    AS total_reach,
         SUM(clicks)                                   AS total_clicks,
         SUM(website_visits + sessions)                AS total_visits,
         SUM(leads)                                    AS total_leads,
         SUM(conversions)                              AS total_conversions,
         SUM(revenue)                                  AS total_revenue,
         AVG(engagement_rate)                          AS avg_engagement_rate,
         AVG(bounce_rate)                              AS avg_bounce_rate,
         AVG(conversion_rate)                          AS avg_conversion_rate
       FROM platform_metrics
       WHERE user_id = $1
         AND report_period_start >= NOW() - ($2 || ' months')::INTERVAL`,
      [req.user.userId, parseInt(months)]
    );

    const r = result.rows[0];
    const imp = Number(r.total_impressions) || 1;

    res.json({
      stages: [
        { stage: 'Awareness', metric: 'Impressions', value: Number(r.total_impressions), rate: 100 },
        { stage: 'Reach', metric: 'Unique reach', value: Number(r.total_reach), rate: parseFloat(((r.total_reach / imp) * 100).toFixed(2)) },
        { stage: 'Engagement', metric: 'Clicks', value: Number(r.total_clicks), rate: parseFloat(((r.total_clicks / imp) * 100).toFixed(2)) },
        { stage: 'Traffic', metric: 'Site visits', value: Number(r.total_visits), rate: parseFloat(((r.total_visits / imp) * 100).toFixed(2)) },
        { stage: 'Leads', metric: 'Leads captured', value: Number(r.total_leads), rate: parseFloat(((r.total_leads / imp) * 100).toFixed(2)) },
        { stage: 'Conversion', metric: 'Conversions', value: Number(r.total_conversions), rate: parseFloat(((r.total_conversions / imp) * 100).toFixed(2)) },
      ],
      totals: {
        revenue: Number(r.total_revenue),
        avgEngagementRate: parseFloat((Number(r.avg_engagement_rate) * 100).toFixed(4)),
        avgBounceRate: parseFloat((Number(r.avg_bounce_rate) * 100).toFixed(2)),
        avgConversionRate: parseFloat((Number(r.avg_conversion_rate) * 100).toFixed(4)),
      },
    });
  })
);

// ── GET /metrics/leaderboard — best performing periods ────────
router.get(
  '/leaderboard',
  authenticate,
  asyncHandler(async (req, res) => {
    const { metric = 'impressions', limit = 5 } = req.query;

    const ALLOWED = ['impressions', 'reach', 'engagement_rate', 'conversions', 'revenue', 'roas'];
    if (!ALLOWED.includes(metric)) {
      return res.status(400).json({ error: `metric must be one of: ${ALLOWED.join(', ')}` });
    }

    const result = await query(
      `SELECT
         pm.platform,
         pm.report_period_start,
         pm.report_period_end,
         pm.${metric} AS value,
         rf.original_name AS source_file
       FROM platform_metrics pm
       JOIN report_files rf ON rf.id = pm.file_id
       WHERE pm.user_id = $1
       ORDER BY pm.${metric} DESC
       LIMIT $2`,
      [req.user.userId, parseInt(limit)]
    );

    res.json({ metric, leaderboard: result.rows });
  })
);

module.exports = router;

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { generateScorecard } = require('../services/ai_v2.service');
const { fetchCRMMetrics } = require('../services/crm.service');
const { getCompanyGoals } = require('../services/goals.service');
const { query } = require('../db/db');
const config = require('../config');

const router = express.Router();

// GET /scorecards — list all scorecards for company
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { period_type } = req.query;
  const result = await query(
    `SELECT id, period_type, period_label, period_start, period_end,
            performance_grade, overall_goal_score, total_ad_spend,
            blended_roas, roi_percentage, total_leads, created_at
     FROM scorecards
     WHERE company_id = $1 ${period_type ? 'AND period_type = $2' : ''}
     ORDER BY period_start DESC
     LIMIT 24`,
    period_type ? [req.user.companyId, period_type] : [req.user.companyId]
  );
  res.json({ scorecards: result.rows });
}));

// GET /scorecards/:id — full scorecard
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT * FROM scorecards WHERE id=$1 AND company_id=$2',
    [req.params.id, req.user.companyId]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Scorecard not found' });
  res.json({ scorecard: result.rows[0] });
}));

// POST /scorecards/generate — trigger AI scorecard generation
router.post('/generate', authenticate, asyncHandler(async (req, res) => {
  const { period_type = 'monthly', period_start, period_end, period_label } = req.body;
  const companyId = req.user.companyId;

  if (!period_start || !period_end) {
    return res.status(400).json({ error: 'period_start and period_end required' });
  }

  // Fetch all data needed for scorecard
  const [metricsResult, prevMetricsResult, goals, crmData] = await Promise.all([
    query(
      'SELECT * FROM platform_metrics_v2 WHERE company_id=$1 AND report_period_start>=$2 AND report_period_end<=$3',
      [companyId, period_start, period_end]
    ),
    query(
      `SELECT * FROM platform_metrics_v2 WHERE company_id=$1
       AND report_period_start >= ($2::DATE - INTERVAL '1 month')
       AND report_period_end < $2::DATE`,
      [companyId, period_start]
    ),
    getCompanyGoals(companyId, { status: 'active' }),
    fetchCRMMetrics(companyId, period_start, period_end).catch(() => null),
  ]);

  // Generate AI scorecard
  const aiScorecard = await generateScorecard({
    metrics: metricsResult.rows,
    prevMetrics: prevMetricsResult.rows,
    goals,
    crmMetrics: crmData,
    periodLabel: period_label || `${period_start} to ${period_end}`,
    apiKey: config.anthropic.apiKey,
  });

  // Aggregate raw metrics
  const totals = metricsResult.rows.reduce((acc, m) => {
    acc.total_ad_spend       += Number(m.ad_spend || 0);
    acc.total_revenue        += Number(m.revenue || 0);
    acc.total_impressions    += Number(m.impressions || 0);
    acc.total_reach          += Number(m.reach || 0);
    acc.total_leads          += Number(m.leads || 0);
    acc.total_conversions    += Number(m.conversions || 0);
    acc.new_followers        += Number(m.followers_gained || 0);
    return acc;
  }, { total_ad_spend: 0, total_revenue: 0, total_impressions: 0, total_reach: 0, total_leads: 0, total_conversions: 0, new_followers: 0 });

  const blendedRoas = totals.total_ad_spend > 0 ? totals.total_revenue / totals.total_ad_spend : 0;
  const costPerLead = totals.total_leads > 0 ? totals.total_ad_spend / totals.total_leads : 0;

  // Count goal statuses
  const goalsOn     = goals.filter(g => ['active', 'achieved'].includes(g.status) && g.progress_pct >= 70).length;
  const goalsAtRisk = goals.filter(g => g.status === 'at_risk').length;
  const goalsMissed = goals.filter(g => g.status === 'missed').length;

  // Store scorecard
  const insertResult = await query(
    `INSERT INTO scorecards
     (company_id, period_type, period_label, period_start, period_end,
      total_ad_spend, total_revenue_attributed, blended_roas, roi_percentage,
      cost_per_lead, total_leads, total_impressions, total_reach,
      new_followers_total, goals_on_track, goals_at_risk, goals_missed,
      overall_goal_score, performance_grade, executive_summary,
      key_wins, key_concerns, platform_grades, recommendations,
      raw_metrics_snapshot, generated_by_ai)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,true)
     RETURNING id`,
    [
      companyId, period_type, period_label || `${period_start} to ${period_end}`, period_start, period_end,
      totals.total_ad_spend, totals.total_revenue, blendedRoas.toFixed(4),
      totals.total_ad_spend > 0 ? ((totals.total_revenue - totals.total_ad_spend) / totals.total_ad_spend * 100).toFixed(2) : 0,
      costPerLead.toFixed(4), totals.total_leads, totals.total_impressions, totals.total_reach,
      totals.new_followers, goalsOn, goalsAtRisk, goalsMissed,
      aiScorecard.goals_performance ?
        (aiScorecard.goals_performance.filter(g => g.status === 'achieved' || g.status === 'on_track').length /
         Math.max(1, aiScorecard.goals_performance.length) * 100).toFixed(1) : null,
      aiScorecard.performance_grade || 'B',
      aiScorecard.executive_summary || '',
      JSON.stringify(aiScorecard.board_recommendations?.map(r => r.action) || []),
      JSON.stringify([]),
      JSON.stringify(
        (aiScorecard.platform_report_cards || []).reduce((acc, p) => {
          acc[p.platform] = p.grade; return acc;
        }, {})
      ),
      JSON.stringify(aiScorecard.board_recommendations || []),
      JSON.stringify({ ...totals, ai_data: aiScorecard }),
    ]
  );

  const scorecardId = insertResult.rows[0].id;
  res.status(201).json({ scorecardId, scorecard: aiScorecard });
}));

module.exports = router;

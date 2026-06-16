/**
 * Proof of Work Engine — ARIA's most important service
 *
 * This is what makes Cerebre impossible to fire.
 *
 * Every month, the engine:
 * 1. Pulls all tasks Cerebre completed for a brand
 * 2. Looks at metric changes before and after each task
 * 3. Calculates correlation strength between tasks and outcomes
 * 4. Generates an AI narrative that PROVES Cerebre's value
 * 5. Assigns a "Value Score" — a 0-100 measure of impact delivered
 *
 * The output becomes the monthly Proof of Work report — the
 * document that prevents client churn and wins renewals.
 */

const { query }  = require('../db/db');
const { getCachedBrand, getCachedGoals, getCachedApiKey } = require('./cache.service');
const logger     = require('../utils/logger');

// ── Correlation calculator ────────────────────────────────────
// For each task, compare metrics in the 7 days before vs 7 days after
const correlateTaskToMetrics = async (task, brandId) => {
  if (!task.completed_date) return null;
  const completedDate = new Date(task.completed_date);
  const beforeStart = new Date(completedDate.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const afterEnd    = new Date(completedDate.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const completedStr = completedDate.toISOString().slice(0, 10);

  // The relevant metric depends on what task type was performed
  const metricMap = {
    content_published:  ['impressions', 'reach', 'engagement_rate'],
    campaign_launched:  ['ad_impressions', 'ad_clicks', 'conversions'],
    campaign_optimised: ['ad_roas', 'ad_cpc', 'conversions'],
    seo_work:           ['sessions', 'organic_reach'],
    influencer_outreach:['impressions', 'reach', 'followers_total'],
    community_management: ['engagement_rate', 'comments', 'replies'],
    analytics_review:   null, // no direct metric correlation
    client_meeting:     null,
    report_submitted:   null,
  };

  const relevantMetrics = metricMap[task.task_type] || ['impressions', 'engagement_rate'];
  if (!relevantMetrics) return null;

  const platform = task.platform || 'instagram';

  const [before, after] = await Promise.all([
    query(`SELECT metric_type, AVG(value) as avg_val FROM live_metrics
           WHERE brand_id=$1 AND platform=$2 AND metric_type = ANY($3)
           AND period_start >= $4 AND period_start < $5
           GROUP BY metric_type`,
      [brandId, platform, relevantMetrics, beforeStart, completedStr]),

    query(`SELECT metric_type, AVG(value) as avg_val FROM live_metrics
           WHERE brand_id=$1 AND platform=$2 AND metric_type = ANY($3)
           AND period_start >= $5 AND period_start <= $4
           GROUP BY metric_type`,
      [brandId, platform, relevantMetrics, afterEnd, completedStr]),
  ]);

  const beforeMap = {};
  before.rows.forEach(r => { beforeMap[r.metric_type] = parseFloat(r.avg_val); });

  let bestMetric = null, bestChange = 0, bestBefore = 0, bestAfter = 0;

  after.rows.forEach(r => {
    const afterVal  = parseFloat(r.avg_val);
    const beforeVal = beforeMap[r.metric_type] || 0;
    if (beforeVal === 0) return;
    const changePct = ((afterVal - beforeVal) / beforeVal) * 100;
    if (Math.abs(changePct) > Math.abs(bestChange)) {
      bestChange  = changePct;
      bestMetric  = r.metric_type;
      bestBefore  = beforeVal;
      bestAfter   = afterVal;
    }
  });

  if (!bestMetric) return null;

  const strength = Math.abs(bestChange) >= 20 ? 'strong'
    : Math.abs(bestChange) >= 10 ? 'moderate'
    : Math.abs(bestChange) >= 5  ? 'weak'
    : 'none';

  return {
    correlated_metric:  bestMetric,
    metric_before:      bestBefore,
    metric_after:       bestAfter,
    metric_change_pct:  Math.round(bestChange * 10) / 10,
    correlation_strength: strength,
  };
};

// ── Strategy validation (pre-execution) ──────────────────────
const validateStrategy = async (strategy, brand, historicalMetrics, goals, apiKey) => {
  const prompt = `You are ARIA, the Cerebre Intelligence Engine. You are validating a marketing strategy BEFORE it is executed.

Your role is to be an honest, objective referee — like a brilliant Chief Strategy Officer reviewing the plan.
Be supportive but rigorous. If something will not work, say so clearly. If the plan is strong, say why.

BRAND: ${brand.name} | INDUSTRY: ${brand.industry} | COUNTRY: ${brand.country || 'Nigeria'}

STRATEGY BEING VALIDATED:
Title: ${strategy.title}
Type: ${strategy.strategy_type} strategy
Period: ${strategy.period_start} to ${strategy.period_end}
Budget: ₦${(strategy.budget_allocated || 0).toLocaleString()}

Objectives:
${(strategy.objectives || []).map((o, i) => `${i+1}. Goal: ${o.goal || o} | Target: ${o.target || ''} | Method: ${o.method || ''}`).join('\n') || 'Not specified'}

Tactics:
${(strategy.tactics || []).map((t, i) => `${i+1}. ${t.platform || ''} — ${t.tactic || t} (Budget: ₦${(t.budget || 0).toLocaleString()})`).join('\n') || 'Not specified'}

KPIs:
${(strategy.kpis || []).map(k => `• ${typeof k === 'string' ? k : JSON.stringify(k)}`).join('\n') || 'Not specified'}

BRAND CONTEXT (last 30 days):
${JSON.stringify(historicalMetrics.slice(0, 15), null, 2)}

ACTIVE GOALS:
${goals.slice(0, 3).map(g => `- ${g.title}: ${g.progress_pct || 0}% complete`).join('\n') || 'None set'}

Assess this strategy and return ONLY valid JSON:
{
  "viability_score": <0-100 — how likely is this to work?>,
  "overall_verdict": "STRONG|SOLID|NEEDS_WORK|RISKY|LIKELY_TO_FAIL",
  "verdict_reason": "<one clear sentence explaining the verdict>",
  "strengths": ["<specific strength based on brand data>", "..."],
  "risk_flags": [
    { "severity": "high|medium|low", "flag": "<the risk>", "mitigation": "<how to avoid it>" }
  ],
  "suggested_tweaks": [
    { "tweak": "<specific change>", "reason": "<why this will improve results>", "expected_impact": "<measurable outcome>" }
  ],
  "budget_assessment": "<is the budget allocation sensible for the objectives?>",
  "alignment_with_goals": "<does this strategy serve the brand's active goals? be specific>",
  "prediction": "<what results are likely if this strategy executes well? be specific with numbers>",
  "missing_elements": ["<what is this strategy missing that would make it stronger?>"]
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`AI error: ${response.status}`);
  const data = await response.json();
  const raw = data.content?.[0]?.text?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try { return JSON.parse(raw); }
  catch { return { viability_score: 50, overall_verdict: 'NEEDS_WORK', verdict_reason: raw, parse_error: true }; }
};

// ── Generate Proof of Work narrative ─────────────────────────
const generateProofOfWork = async (brandId, periodStart, periodEnd, apiKey) => {
  const brand  = await getCachedBrand(brandId);
  const goals  = await getCachedGoals(brandId);

  // Get all completed tasks in the period
  const { rows: tasks } = await query(
    `SELECT at.*, sp.full_name as staff_name, sp.role_title
     FROM agency_tasks at
     LEFT JOIN staff_profiles sp ON sp.id = at.staff_id
     WHERE at.brand_id=$1 AND at.completed_date BETWEEN $2 AND $3
     AND at.status='completed' AND at.is_visible_to_client=true
     ORDER BY at.completed_date ASC`,
    [brandId, periodStart, periodEnd]
  );

  // Get strategies executed in the period
  const { rows: strategies } = await query(
    `SELECT title, strategy_type, impact_score, impact_notes
     FROM agency_strategies
     WHERE brand_id=$1 AND period_start >= $2 AND period_end <= $3
     AND status IN ('completed','active')`,
    [brandId, periodStart, periodEnd]
  );

  // Get metric changes over the period
  const { rows: currentMetrics } = await query(
    `SELECT platform, metric_type, SUM(value) as total
     FROM live_metrics WHERE brand_id=$1 AND period_start BETWEEN $2 AND $3
     GROUP BY platform, metric_type`,
    [brandId, periodStart, periodEnd]
  );

  const prevStart = new Date(new Date(periodStart).getTime() - (new Date(periodEnd).getTime() - new Date(periodStart).getTime())).toISOString().slice(0,10);
  const { rows: prevMetrics } = await query(
    `SELECT platform, metric_type, SUM(value) as total
     FROM live_metrics WHERE brand_id=$1 AND period_start BETWEEN $2 AND $3
     GROUP BY platform, metric_type`,
    [brandId, prevStart, periodStart]
  );

  const prevMap = {};
  prevMetrics.forEach(r => { prevMap[`${r.platform}:${r.metric_type}`] = parseFloat(r.total); });

  const changes = currentMetrics.map(r => {
    const prev = prevMap[`${r.platform}:${r.metric_type}`];
    const curr = parseFloat(r.total);
    const pct  = prev ? Math.round(((curr - prev) / prev) * 100) : null;
    return { platform: r.platform, metric: r.metric_type, current: curr, changePct: pct };
  }).filter(c => c.changePct !== null && Math.abs(c.changePct) > 2);

  // Correlate tasks to outcomes
  const correlations = tasks
    .filter(t => t.correlation_strength === 'strong' || t.correlation_strength === 'moderate')
    .slice(0, 10)
    .map(t => `${t.staff_name || 'Team'} — ${t.title}: ${t.correlated_metric?.replace('_',' ')} moved ${t.metric_change_pct > 0 ? '+' : ''}${t.metric_change_pct}%`);

  const taskSummary = Object.entries(
    tasks.reduce((acc, t) => { acc[t.task_type] = (acc[t.task_type] || 0) + 1; return acc; }, {})
  ).map(([type, count]) => `${count}x ${type.replace(/_/g, ' ')}`).join(', ');

  const powPrompt = `You are ARIA, the Cerebre Intelligence Engine. Generate a Proof of Work report.

This report answers one question: "What did Cerebre Media Africa do for this client, and did it work?"
Be honest. Be specific. Use data. The goal is to make the client feel like Cerebre's work is visible,
measurable, and valuable — not just "we posted some content."

BRAND: ${brand?.name} | INDUSTRY: ${brand?.industry}
PERIOD: ${periodStart} to ${periodEnd}

WHAT CEREBRE DID THIS PERIOD:
Total tasks completed: ${tasks.length}
Task breakdown: ${taskSummary || 'No tasks logged'}
Strategies executed: ${strategies.length}

KEY ACTIONS WITH MEASURED IMPACT:
${correlations.join('\n') || 'Correlation analysis pending for this period'}

METRIC CHANGES VS PREVIOUS PERIOD:
${changes.slice(0, 10).map(c => `${c.platform} ${c.metric}: ${c.current.toLocaleString()} (${c.changePct > 0 ? '+' : ''}${c.changePct}%)`).join('\n') || 'Insufficient comparison data'}

GOAL PROGRESS:
${goals.slice(0, 4).map(g => `${g.title}: ${g.progress_pct || 0}%`).join('\n') || 'No goals configured'}

Return ONLY valid JSON:
{
  "value_score": <0-100 — overall value delivered this period>,
  "value_score_label": "EXCEPTIONAL|HIGH|SOLID|ADEQUATE|LOW",
  "headline": "<bold one-sentence summary of Cerebre's impact this period>",
  "narrative": "<4-6 sentence proof of work narrative. Specific. Evidence-based. Connects actions to outcomes. No fluff.>",
  "key_wins": [
    { "win": "<specific win>", "evidence": "<the data that proves it>", "owned_by": "<which team member/action drove it>" }
  ],
  "honest_assessment": "<one honest paragraph: what worked, what underperformed, and what needs to change next period>",
  "next_period_focus": "<based on this period's data, what should Cerebre prioritise next period?>",
  "value_delivered_statement": "<a boardroom-ready statement Cerebre's account manager can present: 'This month, Cerebre delivered...'>"
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 1800,
      messages: [{ role: 'user', content: powPrompt }],
    }),
  });

  if (!response.ok) throw new Error(`AI error: ${response.status}`);
  const data = await response.json();
  const raw  = data.content?.[0]?.text?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(raw);
    // Store the report
    const { rows } = await query(
      `INSERT INTO proof_of_work_reports
       (brand_id, period_start, period_end, period_label, total_tasks_completed,
        total_strategies, ai_narrative, ai_value_score, ai_summary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (brand_id, period_start) DO UPDATE
       SET ai_narrative=$7, ai_value_score=$8, ai_summary=$9, updated_at=NOW()
       RETURNING id`,
      [brandId, periodStart, periodEnd,
       `${new Date(periodStart).toLocaleDateString('en-GB', {month:'long',year:'numeric'})}`,
       tasks.length, strategies.length,
       parsed.narrative, parsed.value_score, parsed.headline]
    ).catch(() => ({ rows: [{}] }));
    return { ...parsed, reportId: rows[0]?.id };
  } catch {
    return { value_score: 50, headline: raw, parse_error: true };
  }
};

// ── Auto-correlate tasks on completion ───────────────────────
const correlateTask = async (taskId) => {
  const { rows } = await query('SELECT * FROM agency_tasks WHERE id=$1', [taskId]);
  const task = rows[0];
  if (!task || !task.platform) return;

  const result = await correlateTaskToMetrics(task, task.brand_id);
  if (result) {
    await query(
      `UPDATE agency_tasks SET correlated_metric=$1, metric_before=$2, metric_after=$3,
       metric_change_pct=$4, correlation_strength=$5 WHERE id=$6`,
      [result.correlated_metric, result.metric_before, result.metric_after,
       result.metric_change_pct, result.correlation_strength, taskId]
    );
  }
};

module.exports = { validateStrategy, generateProofOfWork, correlateTask, correlateTaskToMetrics };
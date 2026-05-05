/**
 * Priority Goals Engine
 *
 * CORE PRINCIPLE: Every AI output from this system — recommendations,
 * scorecards, brand health insights, content briefs, budget suggestions —
 * MUST first load active goals in priority order and align all outputs to them.
 *
 * Goals can be reprioritised at any time. No restart needed.
 */

const { query } = require('../db/db');
const logger = require('../utils/logger');

// ── Load priority goals for a brand ──────────────────────────
const loadPriorityGoals = async (brandId) => {
  const result = await query(
    `SELECT * FROM priority_goals
     WHERE brand_id = $1 AND is_active = true
     ORDER BY priority_rank ASC, created_at ASC`,
    [brandId]
  );
  return result.rows;
};

// ── Build the goal context block injected into EVERY AI prompt ─
const buildGoalContext = (goals) => {
  if (!goals || goals.length === 0) {
    return `NO ACTIVE GOALS SET. Ask the user to set their business priorities before providing recommendations.`;
  }

  const lines = goals.map((g, i) => {
    const progress = g.progress_pct ? `${parseFloat(g.progress_pct).toFixed(1)}% achieved` : 'just started';
    const deadline = g.deadline ? `deadline: ${g.deadline}` : '';
    const platforms = g.relevant_platforms?.length
      ? `platforms: ${g.relevant_platforms.join(', ')}`
      : 'all active platforms';

    return `
PRIORITY ${g.priority_rank} [${g.status?.toUpperCase() || 'ACTIVE'}]: "${g.title}"
  Category: ${g.goal_category}${g.custom_category ? ` (${g.custom_category})` : ''}
  Target: ${g.target_value ? `${g.target_value} ${g.target_unit || ''}` : 'not specified'} of ${g.target_metric || 'unspecified metric'}
  Progress: ${progress}
  Scope: ${platforms}
  ${deadline}`;
  });

  return `═══════════════════════════════════════
BRAND PRIORITY GOALS (ranked — #1 is most important):
Every recommendation MUST directly serve one or more of these goals.
Label each recommendation with which priority goal it serves.
Higher-priority goals get more focus, more budget, more tactics.
═══════════════════════════════════════
${lines.join('\n')}
═══════════════════════════════════════`;
};

// ── Build industry-neutral context ───────────────────────────
const buildIndustryContext = (brand) => {
  return `
BRAND CONTEXT:
- Company: ${brand.name}
- Industry: ${brand.industry}${brand.sub_industry ? ` / ${brand.sub_industry}` : ''}
- Target audience: ${brand.target_audience || 'not specified'}
- Brand voice: ${brand.brand_voice || 'not specified'}
- Active platforms: ${brand.active_platforms?.join(', ') || 'not configured'}

IMPORTANT: Tailor ALL recommendations to this specific industry and audience.
Do NOT give generic social media advice. Every recommendation must make sense
for a ${brand.industry} company trying to reach their specific audience.`;
};

// ── Reorder goal priorities ───────────────────────────────────
const reorderPriorities = async (brandId, goalOrderArray) => {
  // goalOrderArray = [{id: 'uuid', priority_rank: 1}, {id: 'uuid', priority_rank: 2}, ...]
  const updates = goalOrderArray.map(({ id, priority_rank }) =>
    query(
      'UPDATE priority_goals SET priority_rank = $1, updated_at = NOW() WHERE id = $2 AND brand_id = $3',
      [priority_rank, id, brandId]
    )
  );
  await Promise.all(updates);
  logger.info('[Goals] Priorities reordered', { brandId, count: goalOrderArray.length });
};

// ── Create a goal (industry-agnostic) ────────────────────────
const createPriorityGoal = async (brandId, userId, data) => {
  const {
    title, description, goal_category, custom_category,
    relevant_platforms, target_metric, target_value, target_unit,
    baseline_value, horizon, deadline, priority_rank,
  } = data;

  // Get next priority rank if not specified
  let rank = priority_rank;
  if (!rank) {
    const countResult = await query(
      'SELECT COUNT(*) FROM priority_goals WHERE brand_id = $1 AND is_active = true',
      [brandId]
    );
    rank = parseInt(countResult.rows[0].count) + 1;
  }

  const result = await query(
    `INSERT INTO priority_goals
     (brand_id, title, description, goal_category, custom_category,
      relevant_platforms, target_metric, target_value, target_unit,
      baseline_value, current_value, horizon, deadline, priority_rank, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12,$13,'active')
     RETURNING *`,
    [
      brandId, title, description, goal_category, custom_category || null,
      JSON.stringify(relevant_platforms || []),
      target_metric, target_value || null, target_unit || null,
      baseline_value || 0, horizon || null, deadline || null, rank,
    ]
  );

  return result.rows[0];
};

// ── Toggle a goal active/inactive ────────────────────────────
const toggleGoal = async (goalId, brandId, isActive) => {
  const result = await query(
    'UPDATE priority_goals SET is_active = $1, updated_at = NOW() WHERE id = $2 AND brand_id = $3 RETURNING *',
    [isActive, goalId, brandId]
  );
  return result.rows[0];
};

// ── Update goal progress from latest metrics ──────────────────
const refreshGoalProgress = async (brandId) => {
  const goals = await loadPriorityGoals(brandId);

  for (const goal of goals) {
    if (!goal.target_metric || !goal.target_value) continue;

    try {
      // Try to find the metric in platform_metrics_v2
      const metric = goal.target_metric.toLowerCase().replace(/\s+/g, '_');
      const platforms = goal.relevant_platforms?.length > 0
        ? `AND platform = ANY($4)` : '';

      const params = goal.relevant_platforms?.length > 0
        ? [brandId, goal.period_start || '2000-01-01', goal.deadline || '2099-12-31', goal.relevant_platforms]
        : [brandId, goal.period_start || '2000-01-01', goal.deadline || '2099-12-31'];

      const sql = `SELECT COALESCE(SUM(${metric}::NUMERIC), 0) AS val
                   FROM platform_metrics_v2
                   WHERE brand_id = $1
                     AND report_period_start >= $2
                     AND report_period_end <= $3
                     ${platforms}`;

      // Validate column name to prevent SQL injection
      const ALLOWED_METRICS = [
        'impressions', 'reach', 'followers_total', 'followers_gained',
        'likes', 'comments', 'shares', 'clicks', 'engagement_rate',
        'website_visits', 'sessions', 'leads', 'conversions',
        'conversion_rate', 'revenue', 'ad_spend', 'roas',
      ];

      if (!ALLOWED_METRICS.includes(metric)) continue;

      const r = await query(sql, params);
      const currentValue = parseFloat(r.rows[0]?.val || 0);
      const target = parseFloat(goal.target_value);
      const baseline = parseFloat(goal.baseline_value || 0);
      const progressPct = target > baseline
        ? Math.min(100, ((currentValue - baseline) / (target - baseline)) * 100)
        : 0;

      const now = new Date();
      const deadline = goal.deadline ? new Date(goal.deadline) : null;
      const daysLeft = deadline ? Math.max(0, (deadline - now) / 86400000) : null;
      const totalDays = goal.created_at && deadline
        ? (deadline - new Date(goal.created_at)) / 86400000
        : null;
      const expectedPct = totalDays && daysLeft !== null
        ? ((totalDays - daysLeft) / totalDays) * 100 : null;

      let status = 'active';
      if (progressPct >= 100) status = 'achieved';
      else if (expectedPct !== null && progressPct < expectedPct * 0.65) status = 'at_risk';
      else if (daysLeft === 0 && progressPct < 100) status = 'missed';

      await query(
        `UPDATE priority_goals
         SET current_value=$1, progress_pct=$2, status=$3, updated_at=NOW()
         WHERE id=$4`,
        [currentValue, progressPct.toFixed(2), status, goal.id]
      );
    } catch (err) {
      logger.warn('[Goals] Progress refresh failed for goal', { goalId: goal.id, error: err.message });
    }
  }
};

module.exports = {
  loadPriorityGoals,
  buildGoalContext,
  buildIndustryContext,
  reorderPriorities,
  createPriorityGoal,
  toggleGoal,
  refreshGoalProgress,
};

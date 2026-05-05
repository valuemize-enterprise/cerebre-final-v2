const { query, withTransaction } = require('../db/db');
const { PLATFORM_CONFIGS, GOAL_TYPES } = require('../config/platforms');
const logger = require('../utils/logger');

// ── AI goal breakdown ─────────────────────────────────────────
const breakdownGoalWithAI = async (goal, anthropicKey) => {
  const goalType = GOAL_TYPES[goal.goal_type] || GOAL_TYPES.custom;
  const months = Math.ceil(
    (new Date(goal.period_end) - new Date(goal.period_start)) / (1000 * 60 * 60 * 24 * 30)
  );

  const prompt = `You are a digital marketing strategist for African brands.

A business has set this ${goal.horizon} goal:
- Type: ${goalType.label}
- Target: ${goal.target_value} ${goal.unit} of ${goal.primary_metric}
- Baseline (current): ${goal.baseline_value} ${goal.unit}
- Period: ${goal.period_start} to ${goal.period_end} (${months} months)
- Target platforms: ${JSON.stringify(goal.target_platforms)}
- Context: Nigerian/African market

Create a SMART breakdown. Return ONLY valid JSON (no markdown):
{
  "strategy": "2-3 sentence overall strategy",
  "monthly_targets": [
    {
      "month": "YYYY-MM",
      "label": "January 2025",
      "target": <number>,
      "focus": "What to focus on this month",
      "tactics": ["tactic 1", "tactic 2", "tactic 3"]
    }
  ],
  "quarterly_targets": [
    { "quarter": "Q1 2025", "target": <number>, "milestone": "What this quarter achieves" }
  ],
  "platform_allocation": {
    "<platform>": { "budget_pct": <number>, "role": "awareness|engagement|conversion", "kpi": "<metric>" }
  },
  "risks": ["risk 1", "risk 2"],
  "quick_wins": ["What to do in week 1", "What to do in week 2"]
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`AI error: ${response.status}`);
  const data = await response.json();
  const text = data.content?.[0]?.text || '{}';

  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    logger.error('[Goals] Failed to parse AI breakdown');
    return { strategy: 'Unable to generate breakdown', monthly_targets: [], quarterly_targets: [] };
  }
};

// ── Create a new goal ─────────────────────────────────────────
const createGoal = async (companyId, userId, goalData, anthropicKey) => {
  const {
    goal_type, title, description, horizon,
    period_start, period_end, primary_metric,
    target_value, baseline_value, unit, target_platforms,
  } = goalData;

  // Insert goal
  const result = await query(
    `INSERT INTO business_goals
     (company_id, created_by, goal_type, title, description, horizon,
      period_start, period_end, primary_metric, target_value,
      baseline_value, current_value, unit, target_platforms, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,$12,$13,'active')
     RETURNING *`,
    [
      companyId, userId, goal_type, title, description, horizon,
      period_start, period_end, primary_metric, target_value,
      baseline_value, unit, JSON.stringify(target_platforms || []),
    ]
  );

  const goal = result.rows[0];

  // Generate AI breakdown asynchronously
  if (anthropicKey && anthropicKey !== 'test') {
    try {
      const breakdown = await breakdownGoalWithAI(goal, anthropicKey);
      await query(
        `UPDATE business_goals
         SET monthly_targets = $1, quarterly_targets = $2,
             ai_strategy = $3, ai_last_updated = NOW()
         WHERE id = $4`,
        [
          JSON.stringify(breakdown.monthly_targets || []),
          JSON.stringify(breakdown.quarterly_targets || []),
          breakdown.strategy || '',
          goal.id,
        ]
      );
      goal.monthly_targets = breakdown.monthly_targets || [];
      goal.quarterly_targets = breakdown.quarterly_targets || [];
      goal.ai_strategy = breakdown.strategy || '';
    } catch (err) {
      logger.error('[Goals] AI breakdown failed', { error: err.message });
    }
  }

  return goal;
};

// ── Update goal progress from latest metrics ──────────────────
const updateGoalProgress = async (companyId) => {
  const goals = await query(
    `SELECT * FROM business_goals WHERE company_id = $1 AND status = 'active'`,
    [companyId]
  );

  for (const goal of goals.rows) {
    const metricsResult = await query(
      `SELECT SUM(${goal.primary_metric}::NUMERIC) as total
       FROM platform_metrics_v2
       WHERE company_id = $1
         AND report_period_start >= $2
         AND report_period_end <= $3
         ${goal.target_platforms?.length ? `AND platform = ANY($4)` : ''}`,
      goal.target_platforms?.length
        ? [companyId, goal.period_start, goal.period_end, goal.target_platforms]
        : [companyId, goal.period_start, goal.period_end]
    );

    const currentValue = parseFloat(metricsResult.rows[0]?.total || 0);
    const targetValue = parseFloat(goal.target_value);
    const baselineValue = parseFloat(goal.baseline_value || 0);

    const progressPct = targetValue > 0
      ? Math.min(100, ((currentValue - baselineValue) / (targetValue - baselineValue)) * 100)
      : 0;

    // Determine status
    const daysLeft = Math.max(0,
      (new Date(goal.period_end) - new Date()) / (1000 * 60 * 60 * 24)
    );
    const totalDays = (new Date(goal.period_end) - new Date(goal.period_start)) / (1000 * 60 * 60 * 24);
    const expectedProgress = ((totalDays - daysLeft) / totalDays) * 100;

    let status = 'active';
    if (progressPct >= 100) status = 'achieved';
    else if (progressPct < expectedProgress * 0.7) status = 'at_risk';
    else if (daysLeft === 0 && progressPct < 100) status = 'missed';

    await query(
      `UPDATE business_goals
       SET current_value = $1, progress_pct = $2, status = $3, updated_at = NOW()
       WHERE id = $4`,
      [currentValue, progressPct.toFixed(2), status, goal.id]
    );
  }
};

// ── Get company goals with progress ──────────────────────────
const getCompanyGoals = async (companyId, filters = {}) => {
  const { status, horizon } = filters;
  const conditions = ['company_id = $1'];
  const params = [companyId];

  if (status) { conditions.push(`status = $${params.length + 1}`); params.push(status); }
  if (horizon) { conditions.push(`horizon = $${params.length + 1}`); params.push(horizon); }

  const result = await query(
    `SELECT * FROM business_goals WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    params
  );
  return result.rows;
};

module.exports = { createGoal, updateGoalProgress, getCompanyGoals, breakdownGoalWithAI };

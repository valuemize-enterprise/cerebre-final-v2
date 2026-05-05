/**
 * Master AI Analysis Engine — Enterprise Version
 *
 * DESIGN PRINCIPLES:
 * 1. Industry-neutral: Works for any sector — no hardcoded industry assumptions
 * 2. Goals-first: Every prompt starts with active priority goals
 * 3. Platform-selective: Only analyses platforms the brand is actually on
 * 4. Future-aligned: Multi-modal awareness, zero-party data, AI-native marketing signals
 */

const { loadPriorityGoals, buildGoalContext, buildIndustryContext } = require('./priority-goals.service');
const logger = require('../utils/logger');

// ════════════════════════════════════════════════════════════════
// MASTER SYSTEM PROMPT — Industry neutral, goals-driven
// ════════════════════════════════════════════════════════════════
const MASTER_SYSTEM_PROMPT = `You are an elite Senior Marketing Intelligence Analyst with 20 years of experience across all industries.

CORE OPERATING RULES:
1. GOALS-FIRST: Every insight, recommendation, and analysis MUST tie directly to the brand's stated priority goals (provided at the top of each request). If a data point doesn't connect to a goal, don't mention it.
2. INDUSTRY-SPECIFIC: Never give generic marketing advice. Research and apply insights specific to the brand's industry and audience.
3. PLATFORM-SELECTIVE: Only analyse platforms the brand is actually using. Do NOT mention or recommend platforms they haven't selected.
4. EVIDENCE-BASED: Every claim must cite a specific metric. Say "engagement dropped 23% (from 4.1% to 3.2%)" not "engagement dropped".
5. BUSINESS IMPACT: Always translate metrics into business outcomes. Leads generated, revenue attributed, customer acquisition cost.
6. FUTURE-AWARE: Consider AI-driven search, social commerce, creator economy, zero-party data, and the shift from follower counts to community quality.
7. ACTIONABLE: Every recommendation must be executable within the stated timeframe. No vague advice.`;

// ════════════════════════════════════════════════════════════════
// BUILD ANALYSIS PROMPT — dynamically built per request
// ════════════════════════════════════════════════════════════════
const buildAnalysisPrompt = async ({ brandId, brand, metrics, crmData, periodLabel, prevMetrics }) => {
  const goals = await loadPriorityGoals(brandId);
  const goalsContext = buildGoalContext(goals);
  const industryContext = buildIndustryContext(brand);

  // Only include active platform metrics
  const activePlatforms = brand.active_platforms || [];
  const filteredMetrics = activePlatforms.length
    ? metrics.filter(m => activePlatforms.includes(m.platform))
    : metrics;

  return `${industryContext}

${goalsContext}

REPORT PERIOD: ${periodLabel}
ACTIVE PLATFORMS (only these are being tracked): ${activePlatforms.join(', ') || 'all'}

CURRENT PERIOD METRICS:
${JSON.stringify(filteredMetrics, null, 2)}

${prevMetrics?.length ? `PREVIOUS PERIOD METRICS (for comparison):
${JSON.stringify(prevMetrics.filter(m => !activePlatforms.length || activePlatforms.includes(m.platform)), null, 2)}` : ''}

${crmData ? `CRM DATA (customer impact):
${JSON.stringify(crmData, null, 2)}` : ''}

Return ONLY valid JSON in this exact structure:

{
  "executive_brief": "4-5 sentences. No jargon. What a CEO needs to know: what happened, why it matters, what to do now.",

  "goal_performance": [
    {
      "priority_rank": <number>,
      "goal_title": "<string>",
      "status": "ahead|on_track|behind|at_risk|achieved",
      "progress_narrative": "<what happened and why>",
      "gap_analysis": "<what specific gap exists and how large>",
      "corrective_actions": ["<specific action>", "<specific action>"]
    }
  ],

  "platform_analysis": [
    {
      "platform": "<string>",
      "health_grade": "A|B|C|D|F",
      "key_metrics": [
        { "name": "<metric>", "value": "<current>", "prev": "<previous>", "change_pct": <number>, "vs_industry_benchmark": "above|at|below" }
      ],
      "what_drove_performance": "<specific explanation — not generic>",
      "goal_contribution": { "goal": "<which priority goal>", "contribution": "<how this platform served that goal>" },
      "platform_specific_insights": "<insights specific to HOW this platform works, not generic>",
      "30_day_playbook": [
        { "week": 1, "action": "<specific>", "goal_served": "<priority #>" },
        { "week": 2, "action": "<specific>", "goal_served": "<priority #>" },
        { "week": 3, "action": "<specific>", "goal_served": "<priority #>" },
        { "week": 4, "action": "<specific>", "goal_served": "<priority #>" }
      ]
    }
  ],

  "top_recommendations": [
    {
      "priority": <1-5>,
      "action": "<specific, not vague>",
      "goal_served": "<priority goal title>",
      "rationale": "<why this specific action for this specific brand/industry>",
      "expected_impact": "<measurable expected outcome>",
      "effort": "low|medium|high",
      "timeline": "<specific timeframe>",
      "platform": "<which platform(s)>"
    }
  ],

  "budget_intelligence": {
    "most_efficient_platform": "<which platform has best ROI for goals>",
    "reallocation_suggestion": "<specific shift with expected outcome>",
    "waste_identified": "<any budget being spent ineffectively>"
  },

  "audience_signals": {
    "growth_quality": "organic|mixed|suspect",
    "engagement_depth": "superficial|moderate|deep",
    "key_audience_insight": "<industry-specific audience behaviour>"
  },

  "early_warnings": [
    { "signal": "<early warning sign>", "urgency": "high|medium|low", "action": "<what to do>" }
  ],

  "future_opportunities": [
    { "opportunity": "<emerging trend or platform feature>", "relevance": "<why relevant for this industry/goal>", "how_to_capture": "<specific steps>" }
  ]
}`;
};

// ════════════════════════════════════════════════════════════════
// GOALS-AWARE ANALYSIS — main entry point
// ════════════════════════════════════════════════════════════════
const analyzeForBrand = async ({ brandId, brand, metrics, crmData, periodLabel, prevMetrics, apiKey }) => {
  const prompt = await buildAnalysisPrompt({ brandId, brand, metrics, crmData, periodLabel, prevMetrics });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: MASTER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = data.content?.[0]?.text || '{}';

  try {
    return { ...JSON.parse(raw.replace(/```json|```/g, '').trim()), _meta: { tokens: data.usage } };
  } catch (err) {
    logger.error('[AI] Parse failed', { err: err.message });
    return { parse_error: true, raw_response: raw };
  }
};

// ════════════════════════════════════════════════════════════════
// CONTENT BRIEF GENERATOR — based on performance data + goals
// ════════════════════════════════════════════════════════════════
const generateContentBrief = async ({ brand, platform, goals, topContent, audienceData, apiKey }) => {
  const goalsContext = buildGoalContext(goals);
  const industryContext = buildIndustryContext(brand);

  const prompt = `${industryContext}
${goalsContext}

PLATFORM: ${platform}
TOP PERFORMING CONTENT (what has worked):
${JSON.stringify(topContent?.slice(0, 5), null, 2)}

${audienceData ? `AUDIENCE PROFILE:\n${JSON.stringify(audienceData, null, 2)}` : ''}

Generate a content brief for ${brand.name} on ${platform}.
Every content suggestion MUST serve one of the priority goals above.
Be specific — this is for a ${brand.industry} brand, not a generic company.

Return ONLY valid JSON:
{
  "brief_title": "<specific title>",
  "primary_goal_served": "<priority goal title>",
  "content_objective": "<what this specific piece should achieve>",
  "target_audience_segment": "<specific segment within their audience>",
  "hook_options": ["<hook 1>", "<hook 2>", "<hook 3>"],
  "content_angles": [
    { "angle": "<angle>", "why_it_works": "<industry-specific reason>", "goal_connection": "<which goal>" }
  ],
  "key_messages": ["<message 1>", "<message 2>"],
  "format_recommendation": { "type": "<format>", "duration_or_specs": "<specs>", "why": "<reason based on data>" },
  "cta": "<specific call to action that advances the goal>",
  "best_time_to_post": "<based on audience data>",
  "hashtag_strategy": { "primary": ["<tag>"], "secondary": ["<tag>"], "avoid": ["<tag>"] },
  "predicted_performance": { "reach_estimate": "<range>", "engagement_rate_estimate": "<range>", "goal_impact": "<expected contribution>" }
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
  });

  const data = await response.json();
  const raw = data.content?.[0]?.text || '{}';
  try { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  catch { return { parse_error: true, raw }; }
};

// ════════════════════════════════════════════════════════════════
// PREDICTIVE ANALYSIS — where are we headed?
// ════════════════════════════════════════════════════════════════
const generatePredictions = async ({ brand, historicalMetrics, goals, apiKey }) => {
  const goalsContext = buildGoalContext(goals);
  const industryContext = buildIndustryContext(brand);

  const prompt = `${industryContext}
${goalsContext}

HISTORICAL PERFORMANCE (last 6 months):
${JSON.stringify(historicalMetrics, null, 2)}

Based on the historical trajectory and the current goals, predict next month's performance.
Only predict for the platforms the brand is actively using: ${brand.active_platforms?.join(', ')}.
Consider goal trajectory — will they be achieved at current pace?

Return ONLY valid JSON:
{
  "predictions": {
    "<platform>": {
      "impressions": { "low": <number>, "mid": <number>, "high": <number>, "confidence": <0-1> },
      "engagement_rate": { "low": <number>, "mid": <number>, "high": <number>, "confidence": <0-1> },
      "leads": { "low": <number>, "mid": <number>, "high": <number>, "confidence": <0-1> }
    }
  },
  "goal_trajectories": [
    {
      "goal_title": "<string>",
      "priority_rank": <number>,
      "will_achieve_by_deadline": <boolean>,
      "predicted_achievement_pct": <number>,
      "days_ahead_or_behind": <number>,
      "trajectory": "accelerating|steady|slowing|stalling",
      "corrective_actions_if_behind": ["<action>"]
    }
  ],
  "key_prediction_drivers": ["<factor 1>", "<factor 2>"],
  "model_confidence": <0-1>,
  "risks_to_predictions": ["<risk 1>", "<risk 2>"]
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
  });

  const data = await response.json();
  const raw = data.content?.[0]?.text || '{}';
  try { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  catch { return { parse_error: true, raw }; }
};

// ════════════════════════════════════════════════════════════════
// CRISIS DETECTION — detect anomalies in real-time
// ════════════════════════════════════════════════════════════════
const detectCrisis = async ({ brand, currentMetrics, prevMetrics, alertRules, apiKey }) => {
  const triggers = [];

  // Rule-based detection
  for (const rule of alertRules) {
    const { trigger_type, condition_config } = rule;
    const cfg = typeof condition_config === 'string' ? JSON.parse(condition_config) : condition_config;

    if (trigger_type === 'metric_drop') {
      const cur = currentMetrics.reduce((s, m) => s + Number(m[cfg.metric] || 0), 0);
      const prev = prevMetrics.reduce((s, m) => s + Number(m[cfg.metric] || 0), 0);
      if (prev > 0) {
        const change = (cur - prev) / prev;
        if (cfg.direction === 'decrease' && change < cfg.threshold) {
          triggers.push({ rule, change, cur, prev, metric: cfg.metric });
        }
      }
    }

    if (trigger_type === 'engagement_crash') {
      const avgEr = currentMetrics.reduce((s, m) => s + Number(m.engagement_rate || 0), 0) / Math.max(1, currentMetrics.length);
      const prevAvgEr = prevMetrics.reduce((s, m) => s + Number(m.engagement_rate || 0), 0) / Math.max(1, prevMetrics.length);
      if (prevAvgEr > 0 && (avgEr - prevAvgEr) / prevAvgEr < (cfg.threshold || -0.25)) {
        triggers.push({ rule, change: (avgEr - prevAvgEr) / prevAvgEr, metric: 'engagement_rate' });
      }
    }

    if (trigger_type === 'follower_loss') {
      const netFollowers = currentMetrics.reduce((s, m) => s + Number(m.followers_gained || 0) - Number(m.followers_lost || 0), 0);
      if (netFollowers < (cfg.threshold || -500)) {
        triggers.push({ rule, value: netFollowers, metric: 'followers_net' });
      }
    }
  }

  if (triggers.length === 0) return [];

  // AI context for triggered alerts
  const alerts = [];
  for (const trigger of triggers) {
    const prompt = `Brand: ${brand.name} (${brand.industry})
Alert triggered: ${trigger.rule.trigger_type}
Metric: ${trigger.metric}
Change: ${(trigger.change * 100)?.toFixed(1)}%
Current value: ${trigger.cur || trigger.value}
Previous value: ${trigger.prev}

Provide context and recommended actions. Return JSON only:
{
  "title": "<alert title>",
  "context": "<what likely caused this — be specific to the industry>",
  "severity_assessment": "<why this matters for this brand>",
  "immediate_actions": ["<action 1>", "<action 2>", "<action 3>"],
  "monitoring_steps": ["<what to watch>"]
}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 600, messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await response.json();
      const raw = data.content?.[0]?.text || '{}';
      const aiData = JSON.parse(raw.replace(/```json|```/g, '').trim());

      alerts.push({
        ...aiData,
        severity: trigger.rule.severity,
        trigger_data: trigger,
        alert_rule_id: trigger.rule.id,
      });
    } catch {
      alerts.push({
        title: `Alert: ${trigger.rule.name}`,
        context: 'Automated alert triggered',
        immediate_actions: [],
        severity: trigger.rule.severity,
        alert_rule_id: trigger.rule.id,
        trigger_data: trigger,
      });
    }
  }

  return alerts;
};

module.exports = {
  analyzeForBrand,
  generateContentBrief,
  generatePredictions,
  detectCrisis,
  MASTER_SYSTEM_PROMPT,
};

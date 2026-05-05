const { PLATFORM_CONFIGS, GOAL_TYPES } = require('../config/platforms');
const logger = require('../utils/logger');

// ════════════════════════════════════════════════════════════════
// GOALS-AWARE ANALYST PROMPT — embedded in every analysis
// ════════════════════════════════════════════════════════════════
const buildGoalsAwarePrompt = (goals) => {
  if (!goals || goals.length === 0) return '';
  return `
ACTIVE BUSINESS GOALS (must guide ALL recommendations):
${goals.map(g => `
• [${(GOAL_TYPES[g.goal_type] || {}).label || g.goal_type}] "${g.title}"
  Target: ${g.target_value} ${g.unit} of ${g.primary_metric}
  Progress: ${g.progress_pct?.toFixed(1)}% (${g.status})
  Deadline: ${g.period_end}
  Platforms: ${JSON.stringify(g.target_platforms)}
`).join('')}

Every recommendation MUST directly address one of these goals.
Label each recommendation with which goal it serves.`;
};

// ════════════════════════════════════════════════════════════════
// PLATFORM-SPECIFIC ANALYSIS PROMPT
// ════════════════════════════════════════════════════════════════
const PLATFORM_ANALYST_PROMPT = `You are a Senior Digital Marketing Analyst specialising in African and Nigerian markets.

Analyse the provided platform metrics data and return ONLY valid JSON.

For each platform, you MUST:
1. Interpret the unique metrics specific to that platform (not just universal ones)
2. Explain WHY numbers moved the way they did
3. Tie every insight to business impact
4. Provide PLATFORM-SPECIFIC tactics (e.g. Reels strategy for Instagram, FYP optimisation for TikTok)
5. Show exactly how this platform contributes to the stated business goals

Nigerian market context:
- Mobile-first audience (87%+ on mobile)
- WhatsApp as primary communication
- Lagos drives ~44% of digital activity
- Naira pricing sensitivity
- MTN/Glo/Airtel data cost awareness
- Cultural moments: Detty December, ember months, Sallah

Return this EXACT JSON structure (no markdown):
{
  "platform_analyses": [
    {
      "platform": "string",
      "period": "string",
      "health_score": <0-100>,
      "performance_grade": "A+|A|B+|B|C+|C|D|F",
      "unique_metric_insights": [
        { "metric": "string", "value": "string", "interpretation": "string", "vs_benchmark": "above|at|below" }
      ],
      "content_intelligence": {
        "what_is_working": "string",
        "what_is_not": "string",
        "best_format": "string",
        "best_posting_time": "string",
        "audience_behaviour_insight": "string"
      },
      "goal_contribution": {
        "goal_title": "string",
        "contribution_pct": <number>,
        "on_track": <boolean>,
        "gap_to_close": "string"
      },
      "platform_specific_recommendations": [
        {
          "action": "string",
          "goal_served": "string",
          "expected_impact": "string",
          "effort": "low|medium|high",
          "timeline": "string",
          "nigerian_market_consideration": "string"
        }
      ],
      "next_30_days_playbook": ["Day 1-7: ...", "Day 8-14: ...", "Day 15-30: ..."]
    }
  ],
  "cross_platform_synthesis": {
    "strongest_platform_for_goals": "string",
    "underutilised_platform": "string",
    "budget_reallocation_suggestion": "string",
    "content_repurposing_opportunities": ["string"],
    "audience_overlap_insight": "string"
  },
  "scorecard": {
    "overall_grade": "A+|A|B+|B|C+|C|D|F",
    "roi_summary": "string",
    "cost_efficiency_insight": "string",
    "churn_signals": ["string"],
    "acquisition_cost_trend": "improving|stable|worsening"
  },
  "executive_brief": "3-4 sentence summary for board/CEO level — what happened, why it matters, what to do next",
  "risk_flags": [
    { "platform": "string", "risk": "string", "severity": "high|medium|low", "mitigation": "string" }
  ]
}`;

// ════════════════════════════════════════════════════════════════
// SCORECARD GENERATOR PROMPT
// ════════════════════════════════════════════════════════════════
const SCORECARD_PROMPT = `You are a CMO-level marketing analyst generating an executive performance scorecard.

Generate a comprehensive digital performance scorecard with:
1. ROI metrics and cost efficiency analysis
2. Lead attribution across channels
3. Cost savings vs previous period
4. Goal achievement status
5. Acquisition cost trends
6. Churn signals and retention metrics
7. Competitive position estimate
8. Platform performance grades (A-F)
9. 3 immediate board-level recommendations

Return ONLY valid JSON:
{
  "performance_grade": "A+|A|B+|B|C+|C|D|F",
  "executive_summary": "string (4-5 sentences for CEO/board level)",
  "roi_analysis": {
    "blended_roas": <number>,
    "roi_percentage": <number>,
    "cost_per_lead": <currency>,
    "cost_per_acquisition": <currency>,
    "cost_savings_vs_prev": <currency>,
    "most_efficient_channel": "string",
    "least_efficient_channel": "string",
    "interpretation": "string"
  },
  "lead_attribution": {
    "total_leads": <number>,
    "by_platform": { "<platform>": <number> },
    "top_attribution_source": "string",
    "lead_quality_assessment": "string",
    "recommended_attribution_shift": "string"
  },
  "goals_performance": [
    {
      "goal": "string",
      "status": "achieved|on_track|at_risk|missed",
      "progress_pct": <number>,
      "assessment": "string",
      "corrective_action": "string"
    }
  ],
  "acquisition_retention": {
    "new_customer_cost": <currency>,
    "cost_trend": "improving|stable|worsening",
    "churn_signals": ["string"],
    "retention_drivers": ["string"],
    "social_attribution_to_retention": "string"
  },
  "platform_report_cards": [
    { "platform": "string", "grade": "string", "one_line": "string" }
  ],
  "benchmarks": {
    "vs_industry": "above|at|below",
    "share_of_voice_estimate": "string",
    "competitive_gaps": ["string"]
  },
  "board_recommendations": [
    { "priority": 1, "action": "string", "investment": "string", "expected_return": "string" }
  ]
}`;

// ════════════════════════════════════════════════════════════════
// MAIN ANALYSIS FUNCTION
// ════════════════════════════════════════════════════════════════
const analyzeWithGoals = async ({ metrics, goals, crmMetrics, periodLabel, comparisonMetrics, apiKey }) => {
  const goalsContext = buildGoalsAwarePrompt(goals);

  const userPrompt = `REPORT PERIOD: ${periodLabel}

${goalsContext}

PLATFORM METRICS (current period):
${JSON.stringify(metrics, null, 2)}

${comparisonMetrics ? `PREVIOUS PERIOD METRICS:\n${JSON.stringify(comparisonMetrics, null, 2)}` : ''}

${crmMetrics ? `CRM/CUSTOMER DATA:\n${JSON.stringify(crmMetrics, null, 2)}` : ''}

Analyse all platforms. For each platform use the UNIQUE metrics specific to that platform.
Connect every insight back to the business goals above.
Return valid JSON only.`;

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
      system: PLATFORM_ANALYST_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = data.content?.[0]?.text || '{}';

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return {
      ...JSON.parse(cleaned),
      _meta: { tokens: data.usage, period: periodLabel },
      raw_response: raw,
    };
  } catch (err) {
    logger.error('[AI] Parse failed', { error: err.message });
    return { parse_error: true, raw_response: raw };
  }
};

// ════════════════════════════════════════════════════════════════
// SCORECARD GENERATOR
// ════════════════════════════════════════════════════════════════
const generateScorecard = async ({ metrics, goals, crmMetrics, prevMetrics, periodLabel, apiKey }) => {
  const goalsContext = buildGoalsAwarePrompt(goals);

  const prompt = `PERIOD: ${periodLabel}
${goalsContext}

ALL PLATFORM METRICS: ${JSON.stringify(metrics, null, 2)}
${prevMetrics ? `PREVIOUS PERIOD: ${JSON.stringify(prevMetrics, null, 2)}` : ''}
${crmMetrics ? `CRM DATA: ${JSON.stringify(crmMetrics, null, 2)}` : ''}

Generate the executive scorecard. Return valid JSON only.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: SCORECARD_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Scorecard AI error: ${response.status}`);
  const data = await response.json();
  const raw = data.content?.[0]?.text || '{}';

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { parse_error: true, raw };
  }
};

// ════════════════════════════════════════════════════════════════
// BENCHMARKING ANALYSIS
// ════════════════════════════════════════════════════════════════
const generateBenchmarkAnalysis = async ({ ourMetrics, competitorMetrics, industry, apiKey }) => {
  const prompt = `Compare these two brands in the ${industry} industry (Nigerian market context):

OUR METRICS: ${JSON.stringify(ourMetrics, null, 2)}
COMPETITOR: ${JSON.stringify(competitorMetrics, null, 2)}

Provide competitive benchmarking analysis. Return JSON only:
{
  "competitive_position": "leader|challenger|follower|niche",
  "share_of_voice_estimate": "string",
  "platform_comparison": [
    {
      "platform": "string",
      "our_strength": "string",
      "competitor_strength": "string",
      "gap": "string",
      "opportunity": "string"
    }
  ],
  "content_comparison": "string",
  "engagement_comparison": "string",
  "audience_overlap_estimate": "string",
  "our_advantages": ["string"],
  "their_advantages": ["string"],
  "strategic_recommendations": ["string"],
  "areas_to_defend": ["string"],
  "areas_to_attack": ["string"]
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Benchmark AI error: ${response.status}`);
  const data = await response.json();
  const raw = data.content?.[0]?.text || '{}';

  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return { parse_error: true, raw };
  }
};

module.exports = { analyzeWithGoals, generateScorecard, generateBenchmarkAnalysis, buildGoalsAwarePrompt };

// Uses native fetch (Node 18+) — no external dependency needed
const config = require('../config');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════
// ANALYST MODE SYSTEM PROMPT
// Embedded as per BUILDER MODE requirement
// ══════════════════════════════════════════════════════════════
const ANALYST_SYSTEM_PROMPT = `You are a Senior Digital Marketing Analyst for Cerebre Media Africa, specializing in African and Nigerian digital markets.

When analyzing marketing performance data, you MUST follow this EXACT output structure. Return ONLY valid JSON matching the schema below. Do not include markdown, code fences, or any text outside the JSON object.

ANALYSIS RULES:
- Do NOT summarize — interpret and explain WHY
- Always tie metrics to business impact
- Recommendations must be specific and actionable
- Context: Nigerian/African market nuances matter (network conditions, mobile-first audience, naira-denominated ROI)
- Flag any data quality issues

OUTPUT SCHEMA (return this exact structure):
{
  "executive_snapshot": {
    "key_wins": ["string x5"],
    "key_concerns": ["string x5"],
    "overall_direction": "growing|stable|declining",
    "direction_reasoning": "string",
    "cross_platform_insight": "string",
    "strategic_focus": "string — ONE primary recommendation"
  },
  "cross_platform_performance": {
    "strongest_platform": "string",
    "strongest_platform_reason": "string",
    "declining_platforms": ["string"],
    "funnel_mapping": {
      "awareness": ["platform names"],
      "engagement": ["platform names"],
      "conversion": ["platform names"]
    },
    "platform_synergies": "string"
  },
  "platform_breakdown": [
    {
      "platform": "string",
      "period": "string",
      "key_metrics": [{"name": "string", "current": "string", "previous": "string", "change_pct": "number"}],
      "insight": "string — explain WHY the numbers moved",
      "business_implication": "string",
      "recommendation": "string — specific action"
    }
  ],
  "content_analysis": {
    "best_performing": [{"type": "string", "description": "string", "metric": "string", "value": "string"}],
    "worst_performing": [{"type": "string", "description": "string", "metric": "string", "value": "string"}],
    "format_patterns": "string",
    "timing_patterns": "string",
    "hook_patterns": "string",
    "recommendation": "string"
  },
  "audience_insights": {
    "primary_location": "string",
    "location_breakdown": [{"location": "string", "percentage": "number"}],
    "device_split": {"mobile": "number", "desktop": "number", "other": "number"},
    "peak_engagement_times": ["string"],
    "audience_behavior_insight": "string",
    "nigeria_specific_insight": "string"
  },
  "funnel_analysis": {
    "traffic_volume": "string",
    "engagement_rate_overall": "string",
    "conversion_rate_overall": "string",
    "biggest_drop_off": "string",
    "drop_off_stage": "awareness|engagement|conversion",
    "drop_off_reason": "string",
    "funnel_health": "healthy|leaky|broken"
  },
  "what_worked_vs_failed": {
    "worked": [{"what": "string", "evidence": "string", "why_it_worked": "string"}],
    "failed": [{"what": "string", "evidence": "string", "why_it_failed": "string"}]
  },
  "strategic_recommendations": {
    "immediate_actions": [
      {"action": "string", "priority": "high|medium|low", "expected_impact": "string", "effort": "low|medium|high"}
    ],
    "growth_experiments": [
      {"experiment": "string", "hypothesis": "string", "kpi": "string", "timeline": "string"}
    ],
    "content_strategy_adjustments": ["string"],
    "platform_focus_strategy": "string",
    "conversion_optimization": ["string"]
  },
  "risk_opportunity": {
    "biggest_risk": "string",
    "risk_mitigation": "string",
    "biggest_opportunity": "string",
    "opportunity_how_to_capture": "string"
  },
  "data_quality_notes": ["string — flag any missing, suspicious, or incomplete data"]
}`;

// ══════════════════════════════════════════════════════════════
// BUILD USER PROMPT from normalized metrics
// ══════════════════════════════════════════════════════════════
const buildAnalysisPrompt = ({ metrics, periodLabel, comparisonMetrics, rawText }) => {
  const sections = [];

  sections.push(`REPORT PERIOD: ${periodLabel || 'Unknown period'}`);
  sections.push('');
  sections.push('NORMALIZED PLATFORM METRICS (current period):');
  sections.push(JSON.stringify(metrics, null, 2));

  if (comparisonMetrics && comparisonMetrics.length > 0) {
    sections.push('');
    sections.push('COMPARISON PERIOD METRICS (previous period):');
    sections.push(JSON.stringify(comparisonMetrics, null, 2));
  }

  if (rawText) {
    // Include first 3000 chars of raw text for additional context
    const contextText = rawText.slice(0, 3000);
    sections.push('');
    sections.push('ADDITIONAL CONTEXT FROM REPORT (raw excerpt):');
    sections.push(contextText);
    if (rawText.length > 3000) sections.push('[... truncated ...]');
  }

  sections.push('');
  sections.push('Analyze this data following your analysis framework. Return valid JSON only.');

  return sections.join('\n');
};

// ══════════════════════════════════════════════════════════════
// MAIN AI ANALYSIS FUNCTION
// ══════════════════════════════════════════════════════════════
const analyzeReport = async ({
  metrics,
  periodLabel,
  comparisonMetrics = null,
  rawText = '',
}) => {
  const userPrompt = buildAnalysisPrompt({ metrics, periodLabel, comparisonMetrics, rawText });

  logger.debug('[AI] Sending analysis request', {
    platforms: metrics.map((m) => m.platform),
    promptLen: userPrompt.length,
  });

  const requestBody = {
    model: config.anthropic.model,
    max_tokens: config.anthropic.maxTokens,
    system: ANALYST_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropic.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[AI] API error', { status: response.status, body: errorText });
    throw new Error(`Claude API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawResponse = data.content?.[0]?.text || '';

  logger.debug('[AI] Response received', {
    inputTokens: data.usage?.input_tokens,
    outputTokens: data.usage?.output_tokens,
    responseLen: rawResponse.length,
  });

  // ── Parse JSON response ─────────────────────────────────
  let parsed;
  try {
    // Strip any accidental markdown code fences
    const cleaned = rawResponse
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    logger.error('[AI] Failed to parse JSON response', { error: err.message, rawResponse });
    // Return a structured error with the raw response preserved
    parsed = {
      parse_error: true,
      raw_response: rawResponse,
      executive_snapshot: { key_wins: [], key_concerns: ['AI response could not be parsed'] },
    };
  }

  return {
    ...parsed,
    _meta: {
      model: config.anthropic.model,
      prompt_tokens: data.usage?.input_tokens,
      completion_tokens: data.usage?.output_tokens,
      period_label: periodLabel,
    },
    raw_ai_response: rawResponse,
  };
};

// ══════════════════════════════════════════════════════════════
// TIME COMPARISON ENGINE
// ══════════════════════════════════════════════════════════════

/**
 * Calculate % change between two metric sets.
 * Returns delta object with { field: { current, previous, change_pct } }
 */
const calculateDeltas = (currentMetrics, previousMetrics) => {
  if (!previousMetrics || previousMetrics.length === 0) return {};

  const deltas = {};
  const numericFields = [
    'impressions', 'reach', 'followers_total', 'followers_gained',
    'likes', 'comments', 'shares', 'clicks', 'engagement_rate',
    'website_visits', 'sessions', 'conversions', 'conversion_rate',
    'revenue', 'ad_spend', 'roas',
  ];

  // Aggregate by platform for comparison
  const sumByPlatform = (arr) => {
    return arr.reduce((acc, m) => {
      acc[m.platform] = acc[m.platform] || {};
      numericFields.forEach((f) => {
        acc[m.platform][f] = (acc[m.platform][f] || 0) + (Number(m[f]) || 0);
      });
      return acc;
    }, {});
  };

  const current = sumByPlatform(currentMetrics);
  const previous = sumByPlatform(previousMetrics);

  Object.keys(current).forEach((platform) => {
    deltas[platform] = {};
    numericFields.forEach((field) => {
      const c = current[platform][field] || 0;
      const p = previous[platform]?.[field] || 0;
      const change_pct = p === 0 ? (c > 0 ? 100 : 0) : parseFloat(((c - p) / p) * 100).toFixed(2);
      deltas[platform][field] = { current: c, previous: p, change_pct: Number(change_pct) };
    });
  });

  return deltas;
};

module.exports = { analyzeReport, calculateDeltas, buildAnalysisPrompt };

/**
 * Brand Health Engine
 * Calculates a composite 0-100 health score across 8 dimensions.
 * Runs weekly via background job.
 */

const { query } = require('../db/db');
const { loadPriorityGoals, buildGoalContext, buildIndustryContext } = require('./priority-goals.service');
const logger = require('../utils/logger');

// ── Scoring weights ───────────────────────────────────────────
const WEIGHTS = {
  visibility:   0.15,
  engagement:   0.20,
  sentiment:    0.20,
  content:      0.15,
  audience:     0.10,
  competitor:   0.05,
  conversion:   0.10,
  consistency:  0.05,
};

// ── Industry-specific benchmarks ─────────────────────────────
const getIndustryBenchmarks = (industry) => {
  const industryLower = (industry || '').toLowerCase();

  const benchmarks = {
    fmcg: { engagementRate: 0.031, followersGrowthPct: 0.04, contentFrequency: 20 },
    fintech: { engagementRate: 0.022, followersGrowthPct: 0.03, contentFrequency: 12 },
    ecommerce: { engagementRate: 0.028, followersGrowthPct: 0.05, contentFrequency: 25 },
    media: { engagementRate: 0.045, followersGrowthPct: 0.06, contentFrequency: 30 },
    'real estate': { engagementRate: 0.019, followersGrowthPct: 0.025, contentFrequency: 10 },
    healthcare: { engagementRate: 0.021, followersGrowthPct: 0.02, contentFrequency: 12 },
    hospitality: { engagementRate: 0.038, followersGrowthPct: 0.045, contentFrequency: 22 },
    technology: { engagementRate: 0.024, followersGrowthPct: 0.035, contentFrequency: 15 },
    education: { engagementRate: 0.029, followersGrowthPct: 0.03, contentFrequency: 16 },
    fashion: { engagementRate: 0.041, followersGrowthPct: 0.055, contentFrequency: 28 },
  };

  // Find closest match
  for (const [key, bench] of Object.entries(benchmarks)) {
    if (industryLower.includes(key)) return bench;
  }

  // Default benchmarks for unknown industries
  return { engagementRate: 0.027, followersGrowthPct: 0.035, contentFrequency: 18 };
};

// ── Calculate component scores ────────────────────────────────

const scoreVisibility = (metrics, prevMetrics) => {
  if (!metrics.length) return 50;
  const curImpressions = metrics.reduce((s, m) => s + Number(m.impressions || 0), 0);
  const prevImpressions = prevMetrics.reduce((s, m) => s + Number(m.impressions || 0), 0);
  if (!prevImpressions) return 50;
  const growth = (curImpressions - prevImpressions) / prevImpressions;
  return Math.min(100, Math.max(0, 50 + growth * 200));
};

const scoreEngagement = (metrics, industry) => {
  if (!metrics.length) return 50;
  const bench = getIndustryBenchmarks(industry);
  const avgEr = metrics.reduce((s, m) => s + Number(m.engagement_rate || 0), 0) / metrics.length;
  const ratio = avgEr / bench.engagementRate;
  return Math.min(100, Math.max(0, ratio * 60 + 20));
};

const scoreContent = (metrics) => {
  if (!metrics.length) return 50;
  const totalPosts = metrics.reduce((s, m) => s + Number(m.posts_published || 0), 0);
  const totalImpressions = metrics.reduce((s, m) => s + Number(m.impressions || 0), 0);
  if (!totalPosts) return 30;
  const efficiency = totalImpressions / totalPosts;
  return Math.min(100, Math.max(20, Math.log(efficiency / 1000) * 10 + 40));
};

const scoreAudience = (metrics, prevMetrics) => {
  if (!metrics.length) return 50;
  const gained = metrics.reduce((s, m) => s + Number(m.followers_gained || 0), 0);
  const lost = metrics.reduce((s, m) => s + Number(m.followers_lost || 0), 0);
  const net = gained - lost;
  const retentionRatio = gained > 0 ? (gained - lost) / gained : 0.5;
  return Math.min(100, Math.max(0, retentionRatio * 60 + (net > 0 ? 20 : 0) + 20));
};

const scoreConversion = (metrics) => {
  if (!metrics.length) return 50;
  const avgCR = metrics.reduce((s, m) => s + Number(m.conversion_rate || 0), 0) / metrics.length;
  const avgROAS = metrics.reduce((s, m) => s + Number(m.roas || 0), 0) / metrics.length;
  return Math.min(100, Math.max(0, avgCR * 5000 + avgROAS * 8));
};

// ── Platform-specific health scores ──────────────────────────
const scorePlatforms = (metrics, industry) => {
  const byPlatform = {};
  metrics.forEach(m => {
    if (!byPlatform[m.platform]) byPlatform[m.platform] = [];
    byPlatform[m.platform].push(m);
  });

  const scores = {};
  const bench = getIndustryBenchmarks(industry);

  Object.entries(byPlatform).forEach(([platform, pMetrics]) => {
    const avgEr = pMetrics.reduce((s, m) => s + Number(m.engagement_rate || 0), 0) / pMetrics.length;
    const followersGained = pMetrics.reduce((s, m) => s + Number(m.followers_gained || 0), 0);
    const erScore = Math.min(100, (avgEr / bench.engagementRate) * 60);
    const growthScore = followersGained > 0 ? Math.min(40, followersGained / 100) : 0;
    const platformScore = Math.round(erScore + growthScore);

    const issues = [];
    if (avgEr < bench.engagementRate * 0.5) issues.push('Very low engagement rate');
    if (followersGained <= 0) issues.push('No follower growth');

    scores[platform] = {
      score: Math.min(100, platformScore),
      trend: followersGained > 0 ? 'stable' : 'declining',
      issues,
    };
  });

  return scores;
};

// ── AI-powered health narrative ───────────────────────────────
const generateHealthNarrative = async (scores, metrics, goals, brand, apiKey) => {
  const goalsContext = buildGoalContext(goals);
  const brandContext = buildIndustryContext(brand);

  const prompt = `${brandContext}

${goalsContext}

BRAND HEALTH SCORES THIS PERIOD:
Overall: ${scores.overall}/100 (${scores.trend})
Visibility: ${scores.visibility}/100
Engagement: ${scores.engagement}/100
Content Quality: ${scores.content}/100
Audience Health: ${scores.audience}/100
Conversion: ${scores.conversion}/100
Platform scores: ${JSON.stringify(scores.platforms)}

METRICS SUMMARY:
Total impressions: ${metrics.totalImpressions?.toLocaleString()}
Avg engagement rate: ${(metrics.avgEngagementRate * 100)?.toFixed(2)}%
Net follower change: ${metrics.netFollowers?.toLocaleString()}
Total leads: ${metrics.totalLeads?.toLocaleString()}

Generate a brand health assessment. Return ONLY valid JSON:
{
  "health_summary": "3-4 sentence executive summary of brand health, specific to the industry and goals",
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "vulnerabilities": ["specific risk 1", "specific risk 2"],
  "immediate_actions": [
    {
      "action": "specific action",
      "priority_goal_served": "which goal this helps",
      "expected_health_impact": "how this improves health score",
      "timeline": "this week | this month"
    }
  ],
  "platform_notes": { "<platform>": "one-line insight specific to this brand" }
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (err) {
    logger.error('[BrandHealth] AI narrative failed', { error: err.message });
    return { health_summary: 'Unable to generate narrative', strengths: [], vulnerabilities: [], immediate_actions: [] };
  }
};

// ── Main: Calculate brand health score ───────────────────────
const calculateBrandHealth = async (brandId, periodDate, apiKey) => {
  const brand = (await query('SELECT b.*, o.currency FROM brands b JOIN organisations o ON o.id = b.organisation_id WHERE b.id = $1', [brandId])).rows[0];
  if (!brand) throw new Error('Brand not found');

  const periodStart = new Date(periodDate);
  periodStart.setDate(1);
  const startStr = periodStart.toISOString().slice(0, 10);

  const periodEnd = new Date(periodDate);
  periodEnd.setMonth(periodEnd.getMonth() + 1, 0);
  const endStr = periodEnd.toISOString().slice(0, 10);

  // Prev period
  const prevStart = new Date(periodStart);
  prevStart.setMonth(prevStart.getMonth() - 1);
  const prevEnd = new Date(prevStart);
  prevEnd.setMonth(prevEnd.getMonth() + 1, 0);

  const [curMetrics, prevMetrics, goals] = await Promise.all([
    query(
      `SELECT * FROM platform_metrics_v2 WHERE brand_id = $1 AND report_period_start >= $2 AND report_period_end <= $3`,
      [brandId, startStr, endStr]
    ),
    query(
      `SELECT * FROM platform_metrics_v2 WHERE brand_id = $1 AND report_period_start >= $2 AND report_period_end <= $3`,
      [brandId, prevStart.toISOString().slice(0, 10), prevEnd.toISOString().slice(0, 10)]
    ),
    loadPriorityGoals(brandId),
  ]);

  const cur = curMetrics.rows;
  const prev = prevMetrics.rows;

  const componentScores = {
    visibility:   Math.round(scoreVisibility(cur, prev)),
    engagement:   Math.round(scoreEngagement(cur, brand.industry)),
    content:      Math.round(scoreContent(cur)),
    audience:     Math.round(scoreAudience(cur, prev)),
    conversion:   Math.round(scoreConversion(cur)),
    sentiment:    50, // Would come from social listening data
    competitor:   50, // Would come from competitive intelligence
    consistency:  cur.length > 0 ? Math.min(100, cur.length * 20) : 20,
  };

  const overall = Math.round(
    Object.entries(WEIGHTS).reduce((sum, [key, weight]) => sum + (componentScores[key] || 50) * weight, 0)
  );

  const platforms = scorePlatforms(cur, brand.industry);

  const metrics = {
    totalImpressions: cur.reduce((s, m) => s + Number(m.impressions || 0), 0),
    avgEngagementRate: cur.length ? cur.reduce((s, m) => s + Number(m.engagement_rate || 0), 0) / cur.length : 0,
    netFollowers: cur.reduce((s, m) => s + Number(m.followers_gained || 0) - Number(m.followers_lost || 0), 0),
    totalLeads: cur.reduce((s, m) => s + Number(m.leads || 0), 0),
  };

  // Determine trend
  const prevOverall = prev.length ? Math.round(scoreEngagement(prev, brand.industry) * 0.2 + scoreVisibility(prev, cur) * 0.3 + 30) : overall;
  const trend = overall > prevOverall + 3 ? 'improving' : overall < prevOverall - 3 ? 'declining' : 'stable';
  const scoreTrend = overall < 40 ? 'at_risk' : trend;

  const narrative = apiKey ? await generateHealthNarrative(
    { ...componentScores, overall, trend: scoreTrend, platforms },
    metrics, goals, brand, apiKey
  ) : {};

  // Upsert health score
  await query(
    `INSERT INTO brand_health_scores
     (brand_id, period_date, overall_score, score_trend,
      visibility_score, engagement_score, sentiment_score, content_score,
      audience_score, competitor_score, conversion_score, consistency_score,
      platform_scores, health_summary, strengths, vulnerabilities, immediate_actions,
      data_completeness_pct)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     ON CONFLICT (brand_id, period_date)
     DO UPDATE SET
       overall_score = EXCLUDED.overall_score,
       score_trend = EXCLUDED.score_trend,
       visibility_score = EXCLUDED.visibility_score,
       engagement_score = EXCLUDED.engagement_score,
       content_score = EXCLUDED.content_score,
       audience_score = EXCLUDED.audience_score,
       conversion_score = EXCLUDED.conversion_score,
       consistency_score = EXCLUDED.consistency_score,
       platform_scores = EXCLUDED.platform_scores,
       health_summary = EXCLUDED.health_summary,
       strengths = EXCLUDED.strengths,
       vulnerabilities = EXCLUDED.vulnerabilities,
       immediate_actions = EXCLUDED.immediate_actions`,
    [
      brandId, periodDate, overall, scoreTrend,
      componentScores.visibility, componentScores.engagement, componentScores.sentiment,
      componentScores.content, componentScores.audience, componentScores.competitor,
      componentScores.conversion, componentScores.consistency,
      JSON.stringify(platforms),
      narrative.health_summary || '',
      JSON.stringify(narrative.strengths || []),
      JSON.stringify(narrative.vulnerabilities || []),
      JSON.stringify(narrative.immediate_actions || []),
      cur.length > 0 ? 85 : 20,
    ]
  );

  return {
    overall, trend: scoreTrend, components: componentScores, platforms,
    narrative, metrics,
  };
};

// ── Get brand health history ──────────────────────────────────
const getBrandHealthHistory = async (brandId, months = 6) => {
  const result = await query(
    `SELECT * FROM brand_health_scores
     WHERE brand_id = $1
     ORDER BY period_date DESC
     LIMIT $2`,
    [brandId, months]
  );
  return result.rows;
};

module.exports = { calculateBrandHealth, getBrandHealthHistory, getIndustryBenchmarks };
